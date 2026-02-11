# Observability

This repository emits structured JSON logs and supports optional Sentry error capture.

## Structured Logging (Logpush-ready)

- API Worker and queue consumer emit JSON log lines with:
  - `timestamp`
  - `level`
  - `service`
  - `environment`
  - `message`
  - event-specific fields

These logs are suitable for Cloudflare Logpush export configuration in infrastructure.

## Sentry

Sentry capture is optional and controlled by environment variable.

- `SENTRY_DSN`: if unset, Sentry capture is disabled.

Enabled behavior:
- API Worker captures unhandled request errors.
- Queue consumer captures queue-processing failures.

## Services

- API Worker service name: `api-worker`
- Queue consumer service name: `queue-consumer`
