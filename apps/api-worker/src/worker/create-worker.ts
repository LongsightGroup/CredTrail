import { captureSentryException, logError, logInfo, type ObservabilityContext } from '@credtrail/core-domain';
import type { Hono } from 'hono';
import type { AppBindings, AppEnv } from '../app';
import { createR2ImmutableCredentialStore } from '../storage/r2-immutable-credential-store';

export interface WorkerRuntimeBindings extends Omit<AppBindings, 'BADGE_OBJECTS'> {
  BADGE_OBJECTS: R2Bucket;
}

interface CreateApiWorkerInput {
  app: Hono<AppEnv>;
  queueProcessorRequestFromSchedule: (env: AppBindings) => Request;
  observabilityContext: (bindings: AppBindings) => ObservabilityContext;
}

export const createApiWorker = (input: CreateApiWorkerInput): ExportedHandler<WorkerRuntimeBindings> => {
  const { app, queueProcessorRequestFromSchedule, observabilityContext } = input;
  const appBindingsFromRuntime = (env: WorkerRuntimeBindings): AppBindings => {
    return {
      ...env,
      BADGE_OBJECTS: createR2ImmutableCredentialStore(env.BADGE_OBJECTS),
    };
  };

  return {
    fetch(request, env, executionCtx): Promise<Response> {
      const appBindings = appBindingsFromRuntime(env);
      return Promise.resolve(app.fetch(request, appBindings, executionCtx));
    },
    async scheduled(event, env, executionCtx): Promise<void> {
      const appBindings = appBindingsFromRuntime(env);
      const request = queueProcessorRequestFromSchedule(appBindings);
      const response = await app.fetch(request, appBindings, executionCtx);
      const responseBody = await response.text();

      if (!response.ok) {
        await captureSentryException({
          context: observabilityContext(appBindings),
          dsn: appBindings.SENTRY_DSN,
          error: new Error('Scheduled queue processing failed'),
          message: 'Scheduled queue processing failed',
          extra: {
            cron: event.cron,
            status: response.status,
            responseBody,
          },
        });

        logError(observabilityContext(appBindings), 'scheduled_queue_processing_failed', {
          cron: event.cron,
          status: response.status,
          responseBody,
        });
        return;
      }

      logInfo(observabilityContext(appBindings), 'scheduled_queue_processing_succeeded', {
        cron: event.cron,
        status: response.status,
        responseBody,
      });
    },
  };
};
