import { describe, expect, it } from 'vitest';

import { createPostgresDatabase } from './postgres';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl === undefined ? describe.skip : describe;
const getTestDatabaseUrl = (): string => {
  if (testDatabaseUrl === undefined) {
    throw new Error('TEST_DATABASE_URL is required');
  }

  return testDatabaseUrl;
};

describeWithDatabase('postgres adapter integration', () => {
  it('supports question-mark placeholders and INSERT OR IGNORE semantics', async () => {
    const db = createPostgresDatabase({
      databaseUrl: getTestDatabaseUrl(),
    });

    await db
      .prepare(
        `
          CREATE TEMP TABLE test_adapter_users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE
          )
        `,
      )
      .run();

    await db
      .prepare(
        `
          INSERT OR IGNORE INTO test_adapter_users (id, email)
          VALUES (?, ?)
        `,
      )
      .bind('usr_first', 'student@example.edu')
      .run();

    await db
      .prepare(
        `
          INSERT OR IGNORE INTO test_adapter_users (id, email)
          VALUES (?, ?)
        `,
      )
      .bind('usr_duplicate', 'student@example.edu')
      .run();

    const rows = await db
      .prepare(
        `
          SELECT id, email
          FROM test_adapter_users
          WHERE email = ?
          ORDER BY id ASC
        `,
      )
      .bind('student@example.edu')
      .all<{ id: string; email: string }>();

    expect(rows.results).toHaveLength(1);
    expect(rows.results[0]?.id).toBe('usr_first');

    const singleRow = await db
      .prepare(
        `
          SELECT id, email
          FROM test_adapter_users
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind('usr_first')
      .first<{ id: string; email: string }>();

    expect(singleRow).not.toBeNull();
    expect(singleRow?.email).toBe('student@example.edu');

    const aliasedRow = await db
      .prepare(
        `
          SELECT email AS recipientEmail
          FROM test_adapter_users
          WHERE id = ?
          LIMIT 1
        `,
      )
      .bind('usr_first')
      .first<{ recipientEmail: string }>();

    expect(aliasedRow).not.toBeNull();
    expect(aliasedRow?.recipientEmail).toBe('student@example.edu');
  });
});
