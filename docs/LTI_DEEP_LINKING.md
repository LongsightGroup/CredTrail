# LTI Deep Linking (Instructor Placement)

CredTrail supports `LtiDeepLinkingRequest` launches so instructors can place a specific badge template into an LMS placement.

## Flow

1. LMS launches the tool with `message_type=LtiDeepLinkingRequest`.
2. Launch must include `https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings` with:
   - `deep_link_return_url`
   - optional `accept_types` (must include `ltiResourceLink` when present)
   - optional `data`
3. CredTrail validates launch state and issuer mapping.
4. Instructor sees a template picker page populated from active tenant badge templates.
5. Selecting a template submits `JWT` back to LMS `deep_link_return_url`.

## Current Response Shape

Each placement action posts a Deep Linking Response JWT containing:

- `https://purl.imsglobal.org/spec/lti/claim/message_type = LtiDeepLinkingResponse`
- `https://purl.imsglobal.org/spec/lti/claim/deployment_id`
- `https://purl.imsglobal.org/spec/lti-dl/claim/content_items` with one `ltiResourceLink`
- optional `https://purl.imsglobal.org/spec/lti-dl/claim/data` echo

Content item launch URL includes `badgeTemplateId=<template-id>` on the tool target link URI.

## Security Note

Deep-link response JWTs are currently generated with `alg=none` for test-mode interoperability while launch verification is also in unsigned test mode (`allowUnsignedIdToken=true`).

For production LMS rollout, configure signed LTI launch + deep-link response verification and disable unsigned mode.
