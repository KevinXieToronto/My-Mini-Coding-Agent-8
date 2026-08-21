/**
 * End-to-end test of the message spine: queue → worker → runner → channel.
 *
 * Uses a real SQLite db in a temp home, a fake echo provider, and a capturing channel,
 * so the whole path is exercised without touching the network.
 */
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { openStateDb, type StateDb } from "../state/db.js"
import { IngressQueue } from "../channels/ingress-queue.js"
import { IngressWorker } from "./worker.js"
import { AgentRunner } from "../agent/runner.js"
import { resolveSession } from "../channels/sessions.js"
import { defaultConfig } from "../config/schema.js"
import type { Channel, OutboundReply } from "../channels/contract.js"
import type { Provider } from "../providers/contract.js"

const echoProvider: Provider = {
  id: "echo",
  async *complete(req) {
    yield `echo: ${req.messages.at(-1)?.content ?? ""}`
  },
}

class CapturingChannel implements Channel {
  readonly id = "cli"
  readonly sent: OutboundReply[] = []
  onInbound(): void {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async send(reply: OutboundReply): Promise<void> {
    this.sent.push(reply)
  }
}

let home: string
let db: StateDb

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "miniclaw-e2e-"))
  process.env.MINICLAW_HOME = home
  db = openStateDb()
})
afterEach(() => {
  db.close()
  delete process.env.MINICLAW_HOME
  rmSync(home, { recursive: true, force: true })
})

describe("end-to-end message spine", () => {
  it("enqueue → worker → runner → channel.send", async () => {
    const queue = new IngressQueue(db.kysely)
    const channel = new CapturingChannel()
    const runner = new AgentRunner(db.kysely, echoProvider, defaultConfig())

    const worker = new IngressWorker({
      db: db.kysely,
      queue,
      channelsById: new Map([[channel.id, channel]]),
      replyFor: (event, sessionId) =>
        runner.runTurn({ sessionId, userText: event.text }),
      idleMs: 5,
    })
    worker.start()

    await queue.enqueue({
      channelId: "cli",
      conversationId: "c1",
      sender: "s",
      text: "hi",
    })

    // Wait for the worker to process (poll the captured output).
    await vi.waitFor(() => expect(channel.sent).toHaveLength(1), {
      timeout: 1000,
    })
    await worker.stop()

    expect(channel.sent[0]?.text).toBe("echo: hi")
    const session = await resolveSession(db.kysely, "cli", "c1")
    const rows = await db.kysely
      .selectFrom("messages")
      .selectAll()
      .where("sessionId", "=", session.id)
      .execute()
    expect(rows).toHaveLength(2) // user + assistant
  })
})
