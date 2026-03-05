import { describe, expect, it } from 'vitest';
import { parseParchmentExportFile } from './parchment-export';

describe('parseParchmentExportFile', () => {
  it('parses Parchment bulk-award style CSV columns', () => {
    const csv = [
      'identifier,badge class id,first name,last name,issue date,narrative,evidence url,evidence narrative',
      'ada@example.edu,badge_class_001,Ada,Lovelace,2025-10-01T12:00:00Z,Completed final capstone,https://evidence.example.edu/ada-capstone,Capstone artifact',
    ].join('\n');

    const result = parseParchmentExportFile({
      fileName: 'parchment-bulk-awards.csv',
      mimeType: 'text/csv',
      content: csv,
    });

    expect(result.format).toBe('csv');
    expect(result.rows).toHaveLength(1);

    const assertion = result.rows[0]?.candidate.ob2Assertion as Record<string, unknown>;
    const recipient = assertion.recipient as Record<string, unknown>;
    const evidence = assertion.evidence as Record<string, unknown>[];

    expect(recipient.identity).toBe('ada@example.edu');
    expect(assertion.narrative).toBe('Completed final capstone');
    expect(evidence[0]?.id).toBe('https://evidence.example.edu/ada-capstone');
    expect(evidence[0]?.narrative).toBe('Capstone artifact');
  });

  it('parses assertion JSON arrays with badgeclass and issuer objects', () => {
    const result = parseParchmentExportFile({
      fileName: 'parchment-assertions.json',
      mimeType: 'application/json',
      content: JSON.stringify({
        result: [
          {
            id: 'assertion_123',
            recipient: {
              type: 'email',
              identity: 'ada@example.edu',
              name: 'Ada Lovelace',
            },
            issuedOn: '2025-10-01T12:00:00Z',
            narrative: 'Excellent portfolio submission',
            evidence: [
              {
                id: 'https://evidence.example.edu/portfolio',
                narrative: 'Portfolio artifact',
              },
            ],
            badgeclass: {
              id: 'badge_class_001',
              name: 'AI Foundations',
              description: 'Awarded for completing AI foundations.',
              criteria: {
                id: 'https://issuer.example.edu/badges/ai-foundations/criteria',
              },
              image: {
                id: 'https://issuer.example.edu/badges/ai-foundations/image.png',
              },
              issuer: {
                id: 'issuer_001',
                name: 'Example University',
                url: 'https://issuer.example.edu',
              },
            },
          },
        ],
      }),
    });

    expect(result.format).toBe('json');
    expect(result.rows).toHaveLength(1);

    const firstRow = result.rows[0];

    if (firstRow === undefined) {
      throw new Error('Expected first parsed row');
    }

    const candidate = firstRow.candidate;
    expect(candidate.ob2Assertion).toBeDefined();
    expect(candidate.ob2BadgeClass).toBeDefined();
    expect(candidate.ob2Issuer).toBeDefined();

    const badgeClass = candidate.ob2BadgeClass as Record<string, unknown>;
    expect(badgeClass.id).toBe('badge_class_001');
    expect(badgeClass.name).toBe('AI Foundations');
  });

  it('parses nested badge_classes assertion exports', () => {
    const result = parseParchmentExportFile({
      fileName: 'parchment-issuer-export.json',
      mimeType: 'application/json',
      content: JSON.stringify({
        issuer: {
          id: 'issuer_001',
          name: 'Example University',
          url: 'https://issuer.example.edu',
        },
        badge_classes: [
          {
            id: 'badge_class_001',
            name: 'AI Foundations',
            assertions: [
              {
                id: 'assertion_123',
                recipient: {
                  type: 'email',
                  identity: 'ada@example.edu',
                },
                issued_on: '2025-10-01T12:00:00Z',
              },
            ],
          },
        ],
      }),
    });

    expect(result.rows).toHaveLength(1);
    const assertion = result.rows[0]?.candidate.ob2Assertion as Record<string, unknown>;
    const badgeClass = result.rows[0]?.candidate.ob2BadgeClass as Record<string, unknown>;
    expect(assertion.id).toBe('assertion_123');
    expect(badgeClass.id).toBe('badge_class_001');
  });

  it('rejects exports without rows', () => {
    expect(() => {
      parseParchmentExportFile({
        fileName: 'empty.csv',
        mimeType: 'text/csv',
        content: 'identifier,badge class id',
      });
    }).toThrowError();
  });
});
