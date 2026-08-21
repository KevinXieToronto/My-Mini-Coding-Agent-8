import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { openStateDb } from "./db.js"

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "miniclaw-test-"))
  process.env.MINICLAW_HOME = home
})

afterEach(() => {
  delete process.env.MINICLAW_HOME
  rmSync(home, { recursive: true, force: true })
})

describe("openStateDb", () => {
  it("creates tables and round-trips a session", async () => {
    const db = openStateDb()
    try {
      await db.kysely
        .insertInto("sessions")
        .values({
          id: "s1",
          channelId: "cli",
          conversationId: "c1",
          createdAt: 1,
          updatedAt: 1,
        })
        .execute()

      const row = await db.kysely
        .selectFrom("sessions")
        .selectAll()
        .where("id", "=", "s1")
        .executeTakeFirstOrThrow()

      expect(row.channelId).toBe("cli")
    } finally {
      db.close()
    }
  })
})
