/**
 * Routing/session resolution.
 *
 * Maps a (channelId, conversationId) pair to a durable session row, creating it on first sight.
 */
import { randomUUID } from "node:crypto"
import type { Kysely } from "kysely"
import type { Database } from "../state/schema.generated.js"

export interface Session {
  id: string
  channelId: string
  conversationId: string
}

export async function resolveSession(
  db: Kysely<Database>,
  channelId: string,
  conversationId: string,
): Promise<Session> {
  const existing = await db
    .selectFrom("sessions")
    .selectAll()
    .where("channelId", "=", channelId)
    .where("conversationId", "=", conversationId)
    .executeTakeFirst()

  if (existing) {
    await db
      .updateTable("sessions")
      .set({ updatedAt: Date.now() })
      .where("id", "=", existing.id)
      .execute()
    return { id: existing.id, channelId, conversationId }
  }

  const id = randomUUID()
  const now = Date.now()
  await db
    .insertInto("sessions")
    .values({ id, channelId, conversationId, createdAt: now, updatedAt: now })
    .execute()
  return { id, channelId, conversationId }
}
