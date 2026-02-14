# OB2 Import Conversion

`badging-b21` adds a foundational OB2-to-OB3 import converter.

## Endpoint

`POST /v1/tenants/:tenantId/migrations/ob2/convert`

Auth: tenant session with issuer role (`owner`, `admin`, or `issuer`).

## Request

Provide at least one source:

- `ob2Assertion` JSON
- `bakedBadgeImage` (base64 PNG or `data:image/png;base64,...`)

Optional companion objects for URL-referenced OB2 data:

- `ob2BadgeClass`
- `ob2Issuer`

## Response

The endpoint returns:

- `extractedFromBakedBadge` when `bakedBadgeImage` is supplied
- `conversion` with normalized import candidates:
- `createBadgeTemplateRequest`
- `manualIssueRequest`
- `issueOptions`
- `sourceMetadata`
- `warnings`

If the baked PNG only contains an assertion URL, extraction succeeds and `conversion` is `null` until full assertion JSON is provided.

## Baked PNG Support

The converter extracts Open Badges payloads from PNG text chunks:

- `tEXt`
- `iTXt`
- `zTXt`

Accepted keywords: `openbadges`, `openbadge`.
