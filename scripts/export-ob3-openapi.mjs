import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

const document = ob3ServiceDescriptionDocument({
  requestUrl,
});

mkdirSync(dirname(outputPath), {
  recursive: true,
});

const json = `${JSON.stringify(document, null, 2)}\n`;
writeFileSync(outputPath, json, 'utf8');

process.stdout.write(`Wrote OB3 OpenAPI snapshot to ${outputPath}\n`);
