# Learner Wallet Import and Sharing

CredTrail public badge pages now expose wallet-friendly import options for already issued Open Badges 3.0 credentials.

## Import Options

From a public badge page (`/badges/:badgeIdentifier`), learners can:

- Scan an **OpenID4VCI credential-offer QR code**
- Open a wallet app through an **`openid-credential-offer://` deep link**
- Open the raw **OpenID4VCI offer JSON** endpoint
- Download the credential as **`.jsonld`** for manual wallet import

## Endpoints

- Public badge page: `/badges/:badgeIdentifier`
- OpenID4VCI offer endpoint: `/credentials/v1/offers/:badgeIdentifier`
- Credential JSON-LD: `/credentials/v1/:credentialId/jsonld`
- Credential attachment download (`.jsonld` filename): `/credentials/v1/:credentialId/download`

The offer endpoint includes:

- `credential_issuer`
- `credential_configuration_ids`
- `grants` (`pre-authorized_code`)
- `credentials` metadata (`ldp_vc`, `OpenBadgeCredential`)
- `x_credtrail` URLs for direct JSON-LD/download/verification/public badge access

## Sharing with Verifiable Presentations

After import, learners can share credentials from their wallet directly to verifiers. CredTrail also exposes VP APIs:

- `POST /v1/presentations/create`
- `POST /v1/presentations/verify`

See `docs/VERIFIABLE_PRESENTATIONS.md` for request/response details.

## Wallet Validation Checklist

Use this checklist for manual interoperability validation with major wallets:

1. Open badge page and scan wallet QR code.
2. Confirm wallet receives `credential_offer_uri` and resolves the offer endpoint.
3. Confirm wallet can import using `.jsonld` fallback if offer flow is not fully supported.
4. Confirm imported credential can be shared as a VP.
5. Confirm verifier receives VP and verification passes.

Target wallets for manual validation:

- Learning Wallet
- Velocity Network-compatible wallet
