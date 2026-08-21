/**
 * A minimal Kysely dialect backed by Node's built-in synchronous node:sqlite.
 *
 * Kysely's driver API is async; node:sqlite is sync. We bridge by resolving immediately.
 */
import type { DatabaseSync, SQLInputValue, StatementSync } from "node:sqlite"
import {
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryCompiler,
  type QueryResult,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseIntrospector,
  CompiledQuery,
} from "kysely"

class NodeSqliteConnection implements DatabaseConnection {
  constructor(private readonly db: DatabaseSync) {}

  async executeQuery<R,>(compiled: CompiledQuery): Promise<QueryResult<R>> {
    const stmt: StatementSync = this.db.prepare(compiled.sql)
    const params = compiled.parameters as SQLInputValue[]
    // SELECT-style statements return rows; others return change metadata.
    if (/^\s*(select|pragma|with)/i.test(compiled.sql)) {
      const rows = stmt.all(...params) as R[]
      return { rows }
    }
    const info = stmt.run(...params)
    return {
      rows: [],
      numAffectedRows: BigInt(info.changes),
      insertId: BigInt(info.lastInsertRowid),
    }
  }

  // MiniClaw does not use Kysely streaming.
  streamQuery<R,>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("streaming is not supported by NodeSqliteDialect")
  }
}

class NodeSqliteDriver implements Driver {
  constructor(private readonly db: DatabaseSync) {}
  async init(): Promise<void> {}
  async acquireConnection(): Promise<DatabaseConnection> {
    return new NodeSqliteConnection(this.db)
  }
  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("BEGIN"))
  }
  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("COMMIT"))
  }
  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("ROLLBACK"))
  }
  async releaseConnection(): Promise<void> {}
  async destroy(): Promise<void> {
    this.db.close()
  }
}

export class NodeSqliteDialect implements Dialect {
  constructor(private readonly db: DatabaseSync) {}
  createDriver(): Driver {
    return new NodeSqliteDriver(this.db)
  }
  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler()
  }
  createAdapter() {
    return new SqliteAdapter()
  }
  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new SqliteIntrospector(db)
  }
}
