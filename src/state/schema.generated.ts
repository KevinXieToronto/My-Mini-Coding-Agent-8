/**
 * Generated database schema description (kept in sync with migrations.ts).
 *
 * In a larger project this file would be produced by a codegen step from the live schema.
 * Here we author it to match our migrations exactly.
 */
import type { Generated } from "kysely"

/** A conversation session: one per (channel, conversation) pair. */
export interface SessionsTable {
  id: string // uuid
  channelId: string
  conversationId: string
  createdAt: number // epoch ms
  updatedAt: number // epoch ms
}

/** A durable inbound event awaiting processing. */
export interface IngressEventsTable {
  id: string // uuid
  channelId: string
  conversationId: string
  sender: string
  text: string
  receivedAt: number // epoch ms
  status: "pending" | "claimed" | "done"
  claimToken: string | null
  attempts: Generated<number> // defaults to 0
}

/** A single turn in a session's transcript (Tutorial 07 fills these in). */
export interface MessagesTable {
  id: string // uuid
  sessionId: string
  role: "user" | "assistant"
  content: string
  createdAt: number // epoch ms
}

/** Bookkeeping for the migration runner. */
export interface SchemaMigrationsTable {
  version: number
  appliedAt: number
}

/** The full database, as Kysely expects it. */
export interface Database {
  sessions: SessionsTable
  ingress_events: IngressEventsTable
  messages: MessagesTable
  schema_migrations: SchemaMigrationsTable
}
