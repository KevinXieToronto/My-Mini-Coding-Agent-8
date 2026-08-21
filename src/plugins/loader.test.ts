import { describe, expect, it } from "vitest"
import type { Plugin } from "../plugin-sdk.js"
import { loadPlugins } from "./loader.js"

const fakeChannel: Plugin = {
  id: "fake-channel",
  kind: "channel",
  register(api) {
    api.registerChannel({ id: "fake", create: () => ({}) as never })
  },
}

describe("loadPlugins", () => {
  it("collects registrations and rejects duplicates", () => {
    const result = loadPlugins([fakeChannel])
    expect(result.channels.has("fake")).toBe(true)
    expect(result.loaded).toEqual([{ id: "fake-channel", kind: "channel" }])

    expect(() => loadPlugins([fakeChannel, fakeChannel])).toThrow(
      /already registered/,
    )
  })
})
