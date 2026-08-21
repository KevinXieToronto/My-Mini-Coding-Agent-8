/**
 * Shared state database: node:sqlite opened once, wrapped with Kysely.
 */
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { Kysely } from "kysely"
import { NodeSqliteDialect } from "./node-sqlite-dialect.js"
import { statePath } from "../config/paths.js"
import { runMigrations } from "./migrations.js"
import type { Database } from "./schema.generated.js"

export interface StateDb {
  kysely: Kysely<Database>
  raw: DatabaseSync
  close(): void
}

export function openStateDb(): StateDb {
  const path = statePath()
  mkdirSync(dirname(path), { recursive: true })

  const raw = new DatabaseSync(path)
  raw.exec("PRAGMA journal_mode = WAL")
  raw.exec("PRAGMA foreign_keys = ON")

  runMigrations(raw)

  const kysely = new Kysely<Database>({
    dialect: new NodeSqliteDialect(raw),
  })

  return {
    kysely,
    raw,
    close(): void {
      // Kysely.destroy() is async, so it cannot be awaited from a sync close().
      // Close the handle here so the file is released before close() returns
      // (Windows refuses to unlink an open SQLite file), then let Kysely tear
      // down its driver; its destroy() tolerates an already-closed handle.
      if (raw.isOpen) raw.close()
      void kysely.destroy()
    },
  }
}
