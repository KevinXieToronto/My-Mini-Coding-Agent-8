import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openStateDb, type StateDb } from "../state/db.js"
import { IngressQueue } from "./ingress-queue.js"

let home: string
let db: StateDb

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "miniclaw-q-"))
  process.env.MINICLAW_HOME = home
  db = openStateDb()
})

afterEach(() => {
  db.close()
  delete process.env.MINICLAW_HOME
  rmSync(home, { recursive: true, force: true })
})

describe("IngressQueue", () => {
  it("enqueues, claims once, and completes", async () => {
    const q = new IngressQueue(db.kysely)
    await q.enqueue({ channelId: "cli", conversationId: "c", sender: "s", text: "hi" })

    const first = await q.claim()
    expect(first?.text).toBe("hi")

    // A second claim finds nothing (the only event is now claimed).
    const second = await q.claim()
    expect(second).toBeNull()

    await q.complete(first!.id, first!.claimToken)
    const afterComplete = await q.claim()
    expect(afterComplete).toBeNull()
  })
})
