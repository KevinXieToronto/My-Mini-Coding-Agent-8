import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { openStateDb, type StateDb } from "../state/db.js"
import { IngressQueue } from "../channels/ingress-queue.js"
import { resolveSession } from "../channels/sessions.js"
import { IngressWorker } from "./worker.js"
import type {
  Channel,
  InboundHandler,
  OutboundReply,
} from "../channels/contract.js"

/** A channel that records what it was asked to send. */
class FakeChannel implements Channel {
  readonly id = "fake"
  readonly sent: OutboundReply[] = []
  onInbound(_handler: InboundHandler): void {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async send(reply: OutboundReply): Promise<void> {
    this.sent.push(reply)
  }
}

let home: string
let db: StateDb

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "miniclaw-worker-"))
  process.env.MINICLAW_HOME = home
  db = openStateDb()
})

afterEach(() => {
  db.close()
  delete process.env.MINICLAW_HOME
  rmSync(home, { recursive: true, force: true })
})

describe("IngressQueue", () => {
  it("claims in arrival order and only once", async () => {
    const queue = new IngressQueue(db.kysely)
    const base = { channelId: "fake", conversationId: "c1", sender: "local" }
    await queue.enqueue({ ...base, text: "first" })
    await queue.enqueue({ ...base, text: "second" })

    const a = await queue.claim()
    expect(a?.text).toBe("first")
    const b = await queue.claim()
    expect(b?.text).toBe("second")
    expect(await queue.claim()).toBeNull()

    await queue.complete(a!.id, a!.claimToken)
    // A stale token cannot complete someone else's event.
    await queue.complete(b!.id, "wrong-token")
    await queue.release(b!.id, b!.claimToken)
    const again = await queue.claim()
    expect(again?.text).toBe("second")
    expect(again?.id).toBe(b!.id)
  })
})

describe("resolveSession", () => {
  it("creates once and reuses the same row", async () => {
    const first = await resolveSession(db.kysely, "fake", "c1")
    const second = await resolveSession(db.kysely, "fake", "c1")
    const other = await resolveSession(db.kysely, "fake", "c2")
    expect(second.id).toBe(first.id)
    expect(other.id).not.toBe(first.id)
  })
})

describe("IngressWorker", () => {
  it("drains the queue and sends a reply per event", async () => {
    const queue = new IngressQueue(db.kysely)
    const channel = new FakeChannel()
    const worker = new IngressWorker({
      db: db.kysely,
      queue,
      channelsById: new Map([[channel.id, channel]]),
      replyFor: async (event, sessionId) => `${sessionId}:${event.text}`,
      idleMs: 1,
    })

    await queue.enqueue({
      channelId: "fake",
      conversationId: "c1",
      sender: "local",
      text: "hello",
    })

    worker.start()
    await vi.waitUntil(() => channel.sent.length === 1, { timeout: 2000 })
    await worker.stop()

    const session = await resolveSession(db.kysely, "fake", "c1")
    expect(channel.sent[0]).toEqual({
      conversationId: "c1",
      text: `${session.id}:hello`,
    })
    const rows = await db.kysely
      .selectFrom("ingress_events")
      .select(["status"])
      .execute()
    expect(rows.map((r) => r.status)).toEqual(["done"])
  })
})
