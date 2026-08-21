import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Gateway } from "./gateway.js"
import { saveConfig } from "../config/store.js"
import { defaultConfig } from "../config/schema.js"

let home: string

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "miniclaw-gw-"))
  process.env.MINICLAW_HOME = home
  saveConfig(defaultConfig())
})

afterEach(() => {
  delete process.env.MINICLAW_HOME
  rmSync(home, { recursive: true, force: true })
})

describe("Gateway lifecycle", () => {
  it("starts and stops cleanly", async () => {
    const gateway = new Gateway()
    const ctx = await gateway.start()
    expect(ctx.config.agent.name).toBe("MiniClaw")
    await gateway.stop()
    // stop() is idempotent.
    await gateway.stop()
  })

  it("throws when not configured", async () => {
    process.env.MINICLAW_HOME = join(home, "does-not-exist")
    const gateway = new Gateway()
    await expect(gateway.start()).rejects.toThrow(/not configured/)
  })
})
