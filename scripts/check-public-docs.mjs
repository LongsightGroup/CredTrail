import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PUBLIC_DOCS = ['README.md', 'docs/OBSERVABILITY.md'];

const DENYLIST = [
  { label: 'SAML detail', pattern: /\bSAML\b/i },
  { label: 'Enterprise detail', pattern: /\benterprise\b/i },
  { label: 'Commercial pricing detail', pattern: /\bpricing\b/i },
  { label: 'Upsell language', pattern: /\bupsell\b/i },
  { label: 'Buyer/ICP language', pattern: /\bICP\b|\bbuyer\b|\bchampion\b/i },
  { label: 'Contract/SLA language', pattern: /\bcontract\b|\bSLA\b/i },
  { label: 'Sales language', pattern: /\bsales\b|\brevenue\b/i },
];

const findLine = (content, index) => {
  let line = 1;

  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') {
      line += 1;
    }
  }

  return line;
};

const violations = [];

for (const relativePath of PUBLIC_DOCS) {
  const absolutePath = resolve(relativePath);
  const content = readFileSync(absolutePath, 'utf8');

  for (const entry of DENYLIST) {
    const regex = new RegExp(entry.pattern.source, entry.pattern.flags);
    const match = regex.exec(content);

    if (match === null || match.index === undefined) {
      continue;
    }

    violations.push({
      file: relativePath,
      line: findLine(content, match.index),
      label: entry.label,
      snippet: match[0],
    });
  }
}

if (violations.length > 0) {
  console.error('Public docs policy violations found:');

  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${String(violation.line)} | ${violation.label} | matched "${violation.snippet}"`,
    );
  }

  process.exit(1);
}

console.log('Public docs policy check passed.');
