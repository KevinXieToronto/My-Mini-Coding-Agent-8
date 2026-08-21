import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openStateDb, type StateDb } from "../state/db.js"
import { resolveSession } from "../channels/sessions.js"
import { defaultConfig } from "../config/schema.js"
import type { Provider } from "../providers/contract.js"
import { AgentRunner } from "./runner.js"

const fakeProvider: Provider = {
  id: "fake",
  async *complete() {
    yield "hello "
    yield "world"
  },
}

let home: string
let db: StateDb

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "miniclaw-runner-"))
  process.env.MINICLAW_HOME = home
  db = openStateDb()
})

afterEach(() => {
  db.close()
  delete process.env.MINICLAW_HOME
  rmSync(home, { recursive: true, force: true })
})

describe("AgentRunner", () => {
  it("streams, returns the full text, and persists both turns", async () => {
    const session = await resolveSession(db.kysely, "cli", "c1")
    const runner = new AgentRunner(db.kysely, fakeProvider, defaultConfig())

    const chunks: string[] = []
    const reply = await runner.runTurn({
      sessionId: session.id,
      userText: "hi",
      onChunk: (c) => chunks.push(c),
    })

    expect(reply).toBe("hello world")
    expect(chunks).toEqual(["hello ", "world"])

    const rows = await db.kysely
      .selectFrom("messages")
      .select(["role", "content"])
      .where("sessionId", "=", session.id)
      .orderBy("createdAt", "asc")
      .execute()
    expect(rows).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello world" },
    ])
  })
})
