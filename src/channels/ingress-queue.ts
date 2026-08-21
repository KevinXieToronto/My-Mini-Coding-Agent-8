/**
 * Durable channel ingress queue backed by SQLite.
 *
 * Stores, claims, and completes inbound channel events. Persist-before-process gives us
 * durability, back-pressure, and retry.
 */
import { randomUUID } from "node:crypto"
import type { Kysely } from "kysely"
import type { Database } from "../state/schema.generated.js"
import type { InboundMessage } from "./contract.js"

export interface ClaimedEvent {
  id: string
  channelId: string
  conversationId: string
  sender: string
  text: string
  claimToken: string
}

export class IngressQueue {
  constructor(private readonly db: Kysely<Database>) {}

  /** Persist an inbound message as a pending event. */
  async enqueue(msg: InboundMessage): Promise<string> {
    const id = randomUUID()
    await this.db
      .insertInto("ingress_events")
      .values({
        id,
        channelId: msg.channelId,
        conversationId: msg.conversationId,
        sender: msg.sender,
        text: msg.text,
        receivedAt: Date.now(),
        status: "pending",
        claimToken: null,
      })
      .execute()
    return id
  }

  /** Atomically claim the oldest pending event, or return null if none. */
  async claim(): Promise<ClaimedEvent | null> {
    const token = randomUUID()
    // Two steps in one transaction: find oldest pending, then mark it claimed by us.
    return this.db.transaction().execute(async (tx) => {
      const row = await tx
        .selectFrom("ingress_events")
        .selectAll()
        .where("status", "=", "pending")
        .orderBy("receivedAt", "asc")
        .limit(1)
        .executeTakeFirst()
      if (!row) return null

      await tx
        .updateTable("ingress_events")
        .set({
          status: "claimed",
          claimToken: token,
          attempts: row.attempts + 1,
        })
        .where("id", "=", row.id)
        .where("status", "=", "pending") // guard against a racing claimer
        .execute()

      return {
        id: row.id,
        channelId: row.channelId,
        conversationId: row.conversationId,
        sender: row.sender,
        text: row.text,
        claimToken: token,
      }
    })
  }

  /** Mark a claimed event done (tombstone). Only succeeds if the token matches. */
  async complete(id: string, token: string): Promise<void> {
    await this.db
      .updateTable("ingress_events")
      .set({ status: "done" })
      .where("id", "=", id)
      .where("claimToken", "=", token)
      .execute()
  }

  /** Return a claimed event to pending (e.g. after a processing failure). */
  async release(id: string, token: string): Promise<void> {
    await this.db
      .updateTable("ingress_events")
      .set({ status: "pending", claimToken: null })
      .where("id", "=", id)
      .where("claimToken", "=", token)
      .execute()
  }
}
