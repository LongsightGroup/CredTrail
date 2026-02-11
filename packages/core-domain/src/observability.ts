export type ObservabilityValue = string | number | boolean | null;

export type ObservabilityFields = Record<string, ObservabilityValue | undefined>;

export type ObservabilityLevel = 'info' | 'warn' | 'error';

export interface ObservabilityContext {
  service: string;
  environment: string;
}

export interface CaptureSentryExceptionInput {
  context: ObservabilityContext;
  dsn: string | undefined;
  error: unknown;
  message: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

interface ParsedSentryDsn {
  endpoint: string;
}

interface SerializedError {
  name: string;
  message: string;
  stack: string | null;
}

const createEventId = (): string => {
  return crypto.randomUUID().replace(/-/g, '');
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const toSerializedError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      stack: null,
    };
  }

  if (isRecord(error)) {
    const name =
      typeof error.name === 'string' && error.name.length > 0 ? error.name : 'UnknownError';
    const message =
      typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : 'Unknown error';
    const stack = typeof error.stack === 'string' ? error.stack : null;

    return {
      name,
      message,
      stack,
    };
  }

  return {
    name: 'UnknownError',
    message: 'Unknown error',
    stack: null,
  };
};

const parseSentryDsn = (dsn: string): ParsedSentryDsn => {
  const parsed = new URL(dsn);
  const publicKey = parsed.username;
  const projectId = parsed.pathname.replace(/^\/+/, '');

  if (publicKey.length === 0 || projectId.length === 0) {
    throw new Error('Invalid Sentry DSN');
  }

  const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`;

  return {
    endpoint,
  };
};

const logRecord = (
  level: ObservabilityLevel,
  context: ObservabilityContext,
  message: string,
  fields: ObservabilityFields = {},
): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: context.service,
    environment: context.environment,
    message,
    ...fields,
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  console.log(serialized);
};

export const logInfo = (
  context: ObservabilityContext,
  message: string,
  fields: ObservabilityFields = {},
): void => {
  logRecord('info', context, message, fields);
};

export const logWarn = (
  context: ObservabilityContext,
  message: string,
  fields: ObservabilityFields = {},
): void => {
  logRecord('warn', context, message, fields);
};

export const logError = (
  context: ObservabilityContext,
  message: string,
  fields: ObservabilityFields = {},
): void => {
  logRecord('error', context, message, fields);
};

export const captureSentryException = async (
  input: CaptureSentryExceptionInput,
): Promise<void> => {
  if (input.dsn === undefined || input.dsn.trim().length === 0) {
    return;
  }

  const normalizedError = toSerializedError(input.error);

  let endpoint: string;

  try {
    endpoint = parseSentryDsn(input.dsn).endpoint;
  } catch (error: unknown) {
    logWarn(input.context, 'sentry_dsn_invalid', {
      detail: toSerializedError(error).message,
    });
    return;
  }

  const event = {
    event_id: createEventId(),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    environment: input.context.environment,
    server_name: input.context.service,
    message: input.message,
    tags: input.tags ?? {},
    extra: input.extra ?? {},
    exception: {
      values: [
        {
          type: normalizedError.name,
          value: normalizedError.message,
          stacktrace:
            normalizedError.stack === null
              ? undefined
              : {
                  frames: [
                    {
                      function: 'error',
                      filename: input.context.service,
                      lineno: 0,
                      colno: 0,
                    },
                  ],
                },
        },
      ],
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      logWarn(input.context, 'sentry_capture_failed', {
        status: response.status,
      });
    }
  } catch (error: unknown) {
    logWarn(input.context, 'sentry_capture_error', {
      detail: toSerializedError(error).message,
    });
  }
};
