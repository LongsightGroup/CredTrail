# Docs Content Policy

This repository contains implementation-focused technical documentation.

## Included Content

- Architecture and code-level decisions.
- API behavior and data model details needed for contributors.
- Development, testing, and contribution instructions.
- ADRs for technical implementation choices.

## Excluded Content

- Non-release planning notes.
- Commercial packaging or contract language.
- Buyer, sales, or account-planning language.
- Environment-specific operations material.

## Enforcement

- `pnpm check:public-docs` runs in CI.
- The check scans selected docs for disallowed terms.
- If a disallowed term is found, CI fails with file and line output.

## Planning Location

Planning artifacts are maintained outside this repository.
