const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    return undefined;
  }

  return value;
};

const parsePositiveIntegerEnv = (name: string, fallback: number): number => {
  const rawValue = optionalEnv(name);

  if (rawValue === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer (received "${rawValue}")`);
  }

  return parsed;
};

const appPort = parsePositiveIntegerEnv('APP_PORT', 8787);
const intervalMs = parsePositiveIntegerEnv('JOB_POLL_INTERVAL_MS', 1000);
const queueProcessorUrl =
  optionalEnv('QUEUE_PROCESSOR_URL') ?? `http://127.0.0.1:${String(appPort)}/v1/jobs/process`;
const jobProcessorToken = optionalEnv('JOB_PROCESSOR_TOKEN');

const sleep = (durationMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const processQueue = async (): Promise<void> => {
  const response = await fetch(queueProcessorUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(jobProcessorToken === undefined
        ? {}
        : {
            authorization: `Bearer ${jobProcessorToken}`,
          }),
    },
    body: '{}',
  });
  const bodyText = await response.text();

  console.info(
    JSON.stringify({
      message: 'node_queue_worker_tick',
      queueProcessorUrl,
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
      queueProcessorUrl,
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
