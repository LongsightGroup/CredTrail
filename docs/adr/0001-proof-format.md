# ADR-0001: Proof Format for Open Badges 3.0 Credentials

- Status: Accepted
- Date: 2026-02-10
- Decision owner: Foundation (Days 1-15)
- Related issue: `credtrail-vxf`
- Supersedes: none

## Context

The v1 platform issues Open Badges 3.0 credentials as Verifiable Credentials and must pick a single proof format.

Constraints from product and architecture:

- Open Badges 3.0 only for v1.
- `did:web` issuer identity with per-tenant Ed25519 keys.
- Server-rendered product with Cloudflare Workers, D1, R2, and Queues.
- Single-path implementation policy for v1 (no parallel implementations for the same capability).
- PRD requirement to decide between `Ed25519Signature2020` and JWT-VC before foundation completion.

Options considered:

1. JSON-LD VC with `Ed25519Signature2020` (Data Integrity proof in embedded `proof` object).
2. JWT-VC (`vc+ld+jwt`) using JWS envelope.

## Decision

For v1, we will issue and verify JSON-LD Verifiable Credentials using `Ed25519Signature2020`.

We will not implement JWT-VC issuance in v1.

## Rationale

- Matches the current PRD credential model and `.jsonld` distribution path directly.
- Keeps one standards path for signing, storage, and verification in foundation.
- Avoids dual-format verification complexity in public verifier and revocation flows.
- Fits the current `did:web` + Ed25519 direction without adding parallel token handling.
- Minimizes implementation risk for the first release while keeping a future extension path.

## Cost

- Short-term implementation cost: low to medium.
- Additional cost for v1 from this decision: none beyond planned signing and verification work.
- Avoided cost: no JWT-specific issuance, parsing, and verifier support in v1.

## Complexity

- Net complexity is lower than supporting both formats.
- Canonicalization and linked-data signing complexity remains, but it is confined to one path and one test surface.
- Operational complexity is reduced because all issued credentials share one representation and proof model.

## Migration Impact

- No immediate migration needed for v1, since this is a pre-launch decision.
- If JWT-VC is added later, existing credentials remain valid and unchanged in R2 as immutable records.
- Any future multi-format support must be additive and include verifier compatibility tests for legacy `Ed25519Signature2020` credentials.

## Rollback Plan

If `Ed25519Signature2020` proves non-viable during implementation:

1. Open a new ADR proposing JWT-VC as the replacement or additional format.
2. Keep existing issued credentials verifiable (no rewrite of stored credentials).
3. Add dual verification support first, then optionally add new-format issuance.
4. Gate format selection by tenant or issuance date only after compatibility tests pass.
5. Announce the transition and freeze new issuance format changes until verification stability is confirmed.

## Consequences

- `credtrail-wm4` and downstream signing work should target `Ed25519Signature2020` only.
- Verification APIs and R2 storage should assume embedded linked-data proof objects in v1.
- No JWT-VC acceptance criteria should be added to v1 scope unless a follow-up ADR is accepted.
