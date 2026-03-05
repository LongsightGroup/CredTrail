import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ob3ServiceDescriptionDocument } from '../apps/api-worker/src/ob3/service-description.ts';

const DEFAULT_OUTPUT_PATH = 'docs/openapi/ims-ob-v3p0.openapi.json';
const DEFAULT_BASE_URL = 'https://credtrail.org';

const outputArg = process.argv[2];
const baseUrlArg = process.argv[3];

const outputPath = resolve(process.cwd(), outputArg ?? DEFAULT_OUTPUT_PATH);
const requestUrl = (baseUrlArg ?? process.env.OB3_OPENAPI_BASE_URL ?? DEFAULT_BASE_URL).trim();

if (requestUrl.length === 0) {
  throw new Error('Expected non-empty OB3 base URL');
}

const expectedDocument = ob3ServiceDescriptionDocument({
  requestUrl,
});
const expectedJson = `${JSON.stringify(expectedDocument, null, 2)}\n`;

let currentJson;

try {
  currentJson = readFileSync(outputPath, 'utf8');
} catch {
  process.stderr.write(`Missing OpenAPI snapshot: ${outputPath}\n`);
  process.stderr.write('Run: pnpm export:ob3-openapi\n');
  process.exit(1);
}

if (currentJson !== expectedJson) {
  process.stderr.write(`OpenAPI snapshot out of date: ${outputPath}\n`);
  process.stderr.write('Run: pnpm export:ob3-openapi\n');
  process.exit(1);
}

process.stdout.write(`OB3 OpenAPI snapshot is in sync: ${outputPath}\n`);
