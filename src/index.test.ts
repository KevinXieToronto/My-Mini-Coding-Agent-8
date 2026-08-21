import { describe, expect, it } from "vitest"
import { banner } from "./index.js"

describe("banner", () => {
  it("includes the product name and a version", () => {
    const out = banner()
    expect(out).toMatch(/^MiniClaw v\d+\.\d+\.\d+/)
  })
})
