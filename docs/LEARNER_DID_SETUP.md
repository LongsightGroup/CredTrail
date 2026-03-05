# Learner DID Setup

CredTrail learners can optionally configure a personal DID so newly issued badges use that DID as `credentialSubject.id`.

## Why configure a DID?

- Keep your personal email out of credential subject IDs
- Receive badges directly to a wallet-controlled identifier
- Use different identifiers for different contexts while preserving cryptographic verification

## Supported DID methods

CredTrail currently supports these learner DID methods:

- `did:key` (self-managed keys, simple local setup)
- `did:web` (domain-hosted DID documents)
- `did:ion` (decentralized ION method)

## Configure your DID

1. Sign in and open your learner dashboard for the tenant.
2. In **Profile settings**, enter your DID in **Learner DID**.
3. Select **Save DID**.
4. Confirm the dashboard notice that DID settings were updated.

## Clear your DID

- In **Profile settings**, select **Clear DID**.
- New issuances will fall back to the default learner subject identifier.

## What changes in issued credentials?

When a learner DID is configured, new credentials are issued with:

- `credentialSubject.id = <your DID>`

If no DID is configured, CredTrail uses the platform learner subject identifier instead.

Verification behavior is unchanged for verifiers: DID-based and non-DID credentials remain verifiable.
