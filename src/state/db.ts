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
      // Destroying Kysely closes the underlying DatabaseSync via the dialect.
      void kysely.destroy()
    },
  }
}
