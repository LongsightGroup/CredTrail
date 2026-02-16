import { describe, expect, it } from 'vitest';
import {
  createGradebookProvider,
  parseGradebookProviderConfig,
  parseGradebookProviderConfigJson,
} from './gradebook-provider';

describe('parseGradebookProviderConfig', () => {
  it('parses valid provider configuration objects', () => {
    const parsed = parseGradebookProviderConfig({
      kind: 'canvas',
      apiBaseUrl: 'https://canvas.example.edu',
      accessToken: 'secret-token',
    });

    expect(parsed.kind).toBe('canvas');
    expect(parsed.apiBaseUrl).toBe('https://canvas.example.edu');
    expect(parsed.accessToken).toBe('secret-token');
  });

  it('throws for unsupported provider kinds', () => {
    expect(() =>
      parseGradebookProviderConfig({
        kind: 'unsupported',
        apiBaseUrl: 'https://example.edu',
        accessToken: 'secret-token',
      }),
    ).toThrowError('Gradebook provider kind must be one of');
  });
});

describe('parseGradebookProviderConfigJson', () => {
  it('parses configuration from JSON strings', () => {
    const parsed = parseGradebookProviderConfigJson(
      JSON.stringify({
        kind: 'sakai',
        apiBaseUrl: 'https://sakai.example.edu',
        accessToken: 'secret-token',
      }),
    );

    expect(parsed.kind).toBe('sakai');
    expect(parsed.apiBaseUrl).toBe('https://sakai.example.edu');
    expect(parsed.accessToken).toBe('secret-token');
  });

  it('throws when JSON parsing fails', () => {
    expect(() => parseGradebookProviderConfigJson('{not json')).toThrowError(
      'Gradebook provider config JSON is invalid',
    );
  });
});

describe('createGradebookProvider', () => {
  it('creates a canvas provider', () => {
    const provider = createGradebookProvider({
      config: {
        kind: 'canvas',
        apiBaseUrl: 'https://canvas.example.edu',
        accessToken: 'secret-token',
      },
      fetchImpl: (): Promise<Response> => {
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          }),
        );
      },
    });

    expect(provider.kind).toBe('canvas');
  });

  it('throws for providers that are not implemented yet', () => {
    expect(() =>
      createGradebookProvider({
        config: {
          kind: 'moodle',
          apiBaseUrl: 'https://moodle.example.edu',
          accessToken: 'secret-token',
        },
      }),
    ).toThrowError('Gradebook provider "moodle" is not implemented yet');
  });
});
