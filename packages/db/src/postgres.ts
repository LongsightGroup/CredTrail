import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

import type {
  SqlDatabase,
  SqlPreparedStatement,
  SqlQueryResult,
  SqlRunResult,
} from './index';

const INSERT_OR_IGNORE_PATTERN = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i;
const UNQUOTED_ALIAS_PATTERN = /\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const collectAliasMap = (sql: string): Map<string, string> => {
  const aliasMap = new Map<string, string>();
  UNQUOTED_ALIAS_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = UNQUOTED_ALIAS_PATTERN.exec(sql);

  while (match !== null) {
    const alias = match[1];

    if (alias !== undefined) {
      const foldedAlias = alias.toLowerCase();

      if (foldedAlias !== alias) {
        aliasMap.set(foldedAlias, alias);
      }
    }

    match = UNQUOTED_ALIAS_PATTERN.exec(sql);
  }

  return aliasMap;
};

const remapRowAliases = (
  row: Record<string, unknown>,
  aliasMap: ReadonlyMap<string, string>,
): Record<string, unknown> => {
  const remappedRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = aliasMap.get(key) ?? key;
    remappedRow[normalizedKey] = value;
  }

  return remappedRow;
};

const normalizeSqlForPostgres = (sql: string): string => {
  let normalizedSql = sql.trim();

  if (INSERT_OR_IGNORE_PATTERN.test(normalizedSql)) {
    normalizedSql = normalizedSql.replace(INSERT_OR_IGNORE_PATTERN, 'INSERT INTO ');
    normalizedSql = normalizedSql.replace(/;\s*$/, '');
    normalizedSql = `${normalizedSql} ON CONFLICT DO NOTHING`;
  }

  let placeholderIndex = 0;
  normalizedSql = normalizedSql.replace(/\?/g, () => {
    placeholderIndex += 1;
    return `$${String(placeholderIndex)}`;
  });

  return normalizedSql;
};

class PostgresPreparedStatement implements SqlPreparedStatement {
  private readonly queryFn: NeonQueryFunction<false, false>;
  private readonly sql: string;
  private readonly aliasMap: Map<string, string>;
  private params: readonly unknown[] = [];

  constructor(queryFn: NeonQueryFunction<false, false>, sql: string) {
    this.queryFn = queryFn;
    this.sql = sql;
    this.aliasMap = collectAliasMap(sql);
  }

  bind(...params: unknown[]): SqlPreparedStatement {
    this.params = params;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const rows = await this.executeQuery<T>();
    return rows[0] ?? null;
  }

  async all<T>(): Promise<SqlQueryResult<T>> {
    const startedAt = Date.now();
    const rows = await this.executeQuery<T>();

    return {
      success: true,
      meta: {
        rowsRead: rows.length,
        durationMs: Date.now() - startedAt,
      },
      results: rows,
    };
  }

  async run(): Promise<SqlRunResult> {
    const startedAt = Date.now();
    const rows = await this.executeQuery<Record<string, unknown>>();

    return {
      success: true,
      meta: {
        rowsWritten: rows.length,
        durationMs: Date.now() - startedAt,
      },
    };
  }

  private async executeQuery<T>(): Promise<T[]> {
    const sql = normalizeSqlForPostgres(this.sql);
    const rows = await this.queryFn.query(sql, [...this.params]);

    if (this.aliasMap.size === 0) {
      return rows as T[];
    }

    return rows.map((row) => {
      if (!isRecord(row)) {
        return row;
      }

      return remapRowAliases(row, this.aliasMap);
    }) as T[];
  }
}

class PostgresDatabase implements SqlDatabase {
  private readonly queryFn: NeonQueryFunction<false, false>;

  constructor(queryFn: NeonQueryFunction<false, false>) {
    this.queryFn = queryFn;
  }

  prepare(sql: string): SqlPreparedStatement {
    return new PostgresPreparedStatement(this.queryFn, sql);
  }
}

export interface CreatePostgresDatabaseOptions {
  databaseUrl: string;
}

export const createPostgresDatabase = (options: CreatePostgresDatabaseOptions): SqlDatabase => {
  const trimmedUrl = options.databaseUrl.trim();

  if (trimmedUrl.length === 0) {
    throw new Error('databaseUrl is required');
  }

  const queryFn = neon(trimmedUrl);
  return new PostgresDatabase(queryFn);
};

export const splitSqlStatements = (sql: string): string[] => {
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/g)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  return statements;
};

export const executePostgresSql = async (
  queryFn: NeonQueryFunction<false, false>,
  sql: string,
): Promise<void> => {
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    const normalizedStatement = normalizeSqlForPostgres(statement);
    await queryFn.query(normalizedStatement);
  }
};
