import { describe, expect, it } from "vitest"
import { buildProgram } from "./main.js"

describe("buildProgram", () => {
  it("registers the three top-level commands", () => {
    const program = buildProgram()
    const names = program.commands.map((c) => c.name())
    expect(names).toEqual(
      expect.arrayContaining(["onboard", "gateway", "status"]),
    )
  })
})
