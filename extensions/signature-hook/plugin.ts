/**
 * A beforeReply hook plugin: appends a signature to every reply.
 *
 * Registers neither a channel nor a provider — it exists to prove the hook seam works
 * end to end.
 */
import type { Plugin, PluginApi } from "../../src/plugin-sdk.js"

const plugin: Plugin = {
  id: "signature-hook",
  kind: "hook",
  register(api: PluginApi): void {
    api.registerHook({
      event: "beforeReply",
      handler: (ctx) => `${ctx.replyText}\n— sent by MiniClaw`,
    })
  },
}

export default plugin
