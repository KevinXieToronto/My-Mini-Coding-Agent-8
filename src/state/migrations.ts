import type { DatabaseSync } from "node:sqlite"

interface Migration {
  version: number
  up: string[] // statements run in order
}

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE sessions (
         id TEXT PRIMARY KEY,
         channelId TEXT NOT NULL,
         conversationId TEXT NOT NULL,
         createdAt INTEGER NOT NULL,
         updatedAt INTEGER NOT NULL,
         UNIQUE (channelId, conversationId)
       )`,
      `CREATE TABLE ingress_events (
         id TEXT PRIMARY KEY,
         channelId TEXT NOT NULL,
         conversationId TEXT NOT NULL,
         sender TEXT NOT NULL,
         text TEXT NOT NULL,
         receivedAt INTEGER NOT NULL,
         status TEXT NOT NULL DEFAULT 'pending',
         claimToken TEXT,
         attempts INTEGER NOT NULL DEFAULT 0
       )`,
      `CREATE INDEX idx_ingress_pending ON ingress_events (status, receivedAt)`,
      `CREATE TABLE messages (
         id TEXT PRIMARY KEY,
         sessionId TEXT NOT NULL,
         role TEXT NOT NULL,
         content TEXT NOT NULL,
         createdAt INTEGER NOT NULL
       )`,
      `CREATE INDEX idx_messages_session ON messages (sessionId, createdAt)`,
    ],
  },
]

/** Applies any migrations newer than the recorded version. Idempotent. */
export function runMigrations(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
             version INTEGER PRIMARY KEY,
             appliedAt INTEGER NOT NULL
           )`)

  const row = db
    .prepare("SELECT MAX(version) AS v FROM schema_migrations")
    .get() as {
    v: number | null
  }
  const current = row.v ?? 0

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue
    // node:sqlite has no multi-statement transaction helper; use explicit BEGIN/COMMIT.
    db.exec("BEGIN")
    try {
      for (const stmt of migration.up) db.exec(stmt)
      db.prepare(
        "INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)",
      ).run(migration.version, Date.now())
      db.exec("COMMIT")
    } catch (err) {
      db.exec("ROLLBACK")
      throw err
    }
  }
}
