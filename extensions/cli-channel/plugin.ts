/**
 * The CLI channel, as a plugin.
 *
 * The whole conversation is a single stdin session, so conversationId is constant.
 */
import { createInterface, type Interface } from "node:readline"
import type {
  Channel,
  InboundHandler,
  OutboundReply,
  Plugin,
  PluginApi,
} from "../../src/plugin-sdk.js"

class CliChannel implements Channel {
  readonly id = "cli"
  private handler: InboundHandler | null = null
  private rl: Interface | null = null

  onInbound(handler: InboundHandler): void {
    this.handler = handler
  }

  async start(): Promise<void> {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "> ",
    })
    this.rl.prompt()
    this.rl.on("line", (line) => {
      const text = line.trim()
      if (text === "") {
        this.rl?.prompt()
        return
      }
      this.handler?.({
        channelId: this.id,
        conversationId: "stdin",
        sender: "local",
        text,
      })
    })
  }

  async stop(): Promise<void> {
    this.rl?.close()
    this.rl = null
  }

  async send(reply: OutboundReply): Promise<void> {
    // Print above the prompt, then re-show it.
    process.stdout.write(`\n${reply.text}\n`)
    this.rl?.prompt()
  }
}

const plugin: Plugin = {
  id: "cli-channel",
  kind: "channel",
  register(api: PluginApi): void {
    api.registerChannel({ id: "cli", create: () => new CliChannel() })
  },
}

export default plugin
