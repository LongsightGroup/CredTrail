import { app } from './app';
import { queueProcessorRequestFromSchedule } from './queue/scheduled-trigger';
import {
  createNodeExecutionContext,
  createNodeRuntimeBindings,
  parsePositiveIntegerEnv,
} from './runtime/node-runtime';

const bindings = createNodeRuntimeBindings(process.env);
const executionContext = createNodeExecutionContext();
const intervalMs = parsePositiveIntegerEnv(process.env, 'JOB_POLL_INTERVAL_MS', 1000);

const sleep = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const processQueue = async (): Promise<void> => {
  const response = await app.fetch(
    queueProcessorRequestFromSchedule(bindings),
    bindings,
    executionContext,
  );
  const bodyText = await response.text();

  console.info(
    JSON.stringify({
      message: 'node_queue_worker_tick',
      platformDomain: bindings.PLATFORM_DOMAIN,
      status: response.status,
      body: bodyText,
    }),
  );

  if (!response.ok) {
    throw new Error(`Queue worker received HTTP ${String(response.status)}`);
  }
};

const startWorker = async (): Promise<void> => {
  console.info(
    JSON.stringify({
      message: 'node_queue_worker_started',
      platformDomain: bindings.PLATFORM_DOMAIN,
      intervalMs,
    }),
  );

  for (;;) {
    try {
      await processQueue();
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown queue worker error';
      console.error(
        JSON.stringify({
          message: 'node_queue_worker_error',
          detail,
        }),
      );
    }

    await sleep(intervalMs);
  }
};

startWorker().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : 'Unknown fatal queue worker error';
  console.error(
    JSON.stringify({
      message: 'node_queue_worker_fatal',
      detail,
    }),
  );
  process.exit(1);
});
