# ADR-0003: Self-Host Runtime Profile Without Cloudflare Dependencies

- Status: Accepted
- Date: 2026-02-16
- Decision owner: Platform runtime
- Supersedes: none

## Context

Institutional deployments require a Docker-first runtime profile that can run on AWS or other
cloud providers without Cloudflare-specific infrastructure primitives.

Current production (SaaS) deployment uses Cloudflare Workers + R2. Self-hosted institutions need:

- containerized API runtime,
- Postgres as the system database,
- S3-compatible object storage,
- database-backed queue processing.

## Decision

Support two explicit runtime profiles:

1. SaaS profile: Cloudflare Worker runtime with `BADGE_OBJECTS` backed by R2.
2. Self-host profile: Node runtime (`@hono/node-server`) in Docker with `BADGE_OBJECTS`
   backed by S3-compatible object storage.

Both profiles use Postgres for relational data and queue state.

## Compatibility Notes

- HTTP contracts and route behavior stay runtime-agnostic.
- Queue transport remains `job_queue_messages` in Postgres across profiles.
- Immutable credential object key format is unchanged:
  `tenants/{tenantId}/assertions/{assertionId}.jsonld`.
- Self-host profile does not require Cloudflare bindings.

## Non-Goals

- Supporting non-Postgres relational databases in v1.
- Reintroducing Cloudflare Queue as required infrastructure.
- Requiring Cloudflare Worker runtime for institutional self-host installs.

## Rollback Plan

If Node self-host runtime introduces unacceptable operational risk:

1. Keep issuing from SaaS Cloudflare profile while pausing self-host rollouts.
2. Continue using Postgres + S3 storage contracts to preserve data portability.
3. Ship a patch image reverting to the prior known-good runtime wiring.
4. Document migration/rollback steps in the self-host runbook before resuming rollout.
