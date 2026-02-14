import { describe, expect, it } from 'vitest';
import { parseCredlyExportFile } from './credly-export';

describe('parseCredlyExportFile', () => {
  it('parses Credly JSON exports with data arrays', () => {
    const result = parseCredlyExportFile({
      fileName: 'credly-issued-badges.json',
      mimeType: 'application/json',
      content: JSON.stringify({
        data: [
          {
            id: 'issued_badge_123',
            issued_to_first_name: 'Ada',
            issued_to_last_name: 'Lovelace',
            issued_to_email: 'ada@example.edu',
            issued_at: '2025-10-01T12:00:00Z',
            badge_template: {
              id: 'template_001',
              name: 'Foundations of AI',
              description: 'Awarded for completing foundations curriculum',
              image_url: 'https://images.credly.example/template_001.png',
              global_activity_url: 'https://issuer.example.edu/badges/foundations-ai',
            },
            issuer: {
              entities: [
                {
                  id: 'issuer_001',
                  name: 'Credly University',
                  url: 'https://issuer.example.edu',
                },
              ],
            },
          },
        ],
      }),
    });

    expect(result.format).toBe('json');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.candidate.ob2Assertion).toBeDefined();
    expect(result.rows[0]?.candidate.ob2BadgeClass).toBeDefined();

    const assertion = result.rows[0]?.candidate.ob2Assertion as Record<string, unknown>;
    const recipient = assertion.recipient as Record<string, unknown>;
    expect(recipient.identity).toBe('ada@example.edu');
  });

  it('parses Credly CSV exports using official template columns', () => {
    const csv = [
      'First Name,Last Name,Recipient Email,Badge Template ID,Issued At',
      'Ada,Lovelace,ada@example.edu,template_001,2025-10-01T12:00:00Z',
    ].join('\n');

    const result = parseCredlyExportFile({
      fileName: 'credly-export.csv',
      mimeType: 'text/csv',
      content: csv,
    });

    expect(result.format).toBe('csv');
    expect(result.rows).toHaveLength(1);

    const badgeClass = result.rows[0]?.candidate.ob2BadgeClass as Record<string, unknown>;
    expect(badgeClass.name).toBe('template_001');
  });

  it('rejects files without rows', () => {
    expect(() => {
      parseCredlyExportFile({
        fileName: 'empty.csv',
        mimeType: 'text/csv',
        content: 'First Name,Recipient Email',
      });
    }).toThrowError();
  });
});
