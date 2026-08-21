/**
 * A Telegram channel plugin using Bot API long polling.
 *
 * Secret: the bot token comes from the env var named by config.channels.telegram.tokenEnv.
 */
import type {
  Channel,
  Config,
  InboundHandler,
  OutboundReply,
  Plugin,
  PluginApi,
} from "../../src/plugin-sdk.js"

interface TelegramUpdate {
  update_id: number
  message?: {
    chat: { id: number }
    from?: {
      username?: string
      id: number
    }
    text?: string
  }
}

class TelegramChannel implements Channel {
  readonly id = "telegram"
  private handler: InboundHandler | null = null
  private running = false
  private offset = 0
  private loopDone: Promise<void> | null = null
  private readonly base: string

  constructor(private readonly token: string) {
    this.base = `https://api.telegram.org/bot${token}`
  }

  onInbound(handler: InboundHandler): void {
    this.handler = handler
  }

  async start(): Promise<void> {
    this.running = true
    this.loopDone = this.pollLoop()
    console.log("Telegram channel: long-polling for updates.")
  }

  async stop(): Promise<void> {
    this.running = false
    await this.loopDone
  }

  async send(reply: OutboundReply): Promise<void> {
    // conversationId is the Telegram chat id (as a string).
    await fetch(`${this.base}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(reply.conversationId),
        text: reply.text,
      }),
    })
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        const url = `${this.base}/getUpdates?timeout=25&offset=${this.offset}`
        const res = await fetch(url)
        const body = (await res.json()) as {
          ok: boolean
          result: TelegramUpdate[]
        }
        if (!body.ok) {
          await this.sleep(1000)
          continue
        }
        for (const update of body.result) {
          this.offset = update.update_id + 1 // ack: never re-fetch this update
          const message = update.message
          if (!message?.text) continue
          this.handler?.({
            channelId: this.id,
            conversationId: String(message.chat.id),
            sender:
              message.from?.username ?? String(message.from?.id ?? "unknown"),
            text: message.text,
          })
        }
      } catch (err) {
        // Network hiccup: back off briefly and keep polling.
        console.error(`Telegram poll error: ${(err as Error).message}`)
        await this.sleep(1000)
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }
}

const plugin: Plugin = {
  id: "telegram-channel",
  kind: "channel",
  register(api: PluginApi): void {
    api.registerChannel({
      id: "telegram",
      create(config: Config): Channel {
        const envName =
          config.channels.telegram?.tokenEnv ?? "TELEGRAM_BOT_TOKEN"
        const token = process.env[envName]
        if (!token || token.trim() === "") {
          throw new Error(
            `Missing Telegram token. Set the ${envName} environment variable.`,
          )
        }
        return new TelegramChannel(token)
      },
    })
  },
}

export default plugin
