/**
 * The MiniClaw Gateway: the long-lived control plane.
 *
 * Boots once (config + DB + channels + ingress worker), stays up, and tears down in
 * reverse on stop().
 */
import type { Config } from "../config/schema.js"
import { loadConfig } from "../config/store.js"
import { ConfigError } from "../config/errors.js"
import { openStateDb, type StateDb } from "../state/db.js"
import {
  type ChannelRuntime,
  type ProviderRuntime,
  Registry,
} from "./registry.js"
import type { Channel } from "../channels/contract.js"
import { CliChannel } from "../channels/cli-channel.js"
import { type ClaimedEvent, IngressQueue } from "../channels/ingress-queue.js"
import { IngressWorker } from "./worker.js"

export interface GatewayContext {
  config: Config
  db: StateDb
  channels: Registry<ChannelRuntime>
  providers: Registry<ProviderRuntime>
}

export class Gateway {
  private context: GatewayContext | null = null
  private stopping = false
  private worker: IngressWorker | null = null
  private activeChannels: Channel[] = []

  /** Boots the gateway. Throws if config is missing or invalid. */
  async start(): Promise<GatewayContext> {
    const config = loadConfig()
    if (!config) {
      throw new ConfigError(
        "MiniClaw is not configured. Run `miniclaw onboard` first.",
      )
    }

    const db = openStateDb()
    const channels = new Registry<ChannelRuntime>()
    const providers = new Registry<ProviderRuntime>()
    this.context = { config, db, channels, providers }

    const queue = new IngressQueue(db.kysely)
    const channelsById = new Map<string, Channel>()

    // Build the enabled channels. For now only the CLI channel exists.
    if (config.channels.cli?.enabled) {
      const cli = new CliChannel()
      this.activeChannels.push(cli)
      channelsById.set(cli.id, cli)
      channels.register(cli)
      // Persist every inbound message into the durable queue.
      cli.onInbound((msg) => {
        void queue.enqueue(msg)
      })
    }

    // The echo reply. Tutorial 07 replaces this with the agent runner.
    const replyFor = async (event: ClaimedEvent): Promise<string> =>
      `you said: ${event.text}`

    this.worker = new IngressWorker({
      db: db.kysely,
      queue,
      channelsById,
      replyFor,
    })

    for (const channel of this.activeChannels) {
      await channel.start()
    }
    this.worker.start()

    console.log(
      `Gateway up. Assistant: ${config.agent.name}. Channels: ${this.activeChannels.length}.`,
    )
    return this.context
  }

  /**
   * Gracefully stops the gateway: stop channels (no new inbound), drain the worker,
   * then close the DB. Idempotent.
   */
  async stop(): Promise<void> {
    if (!this.context || this.stopping) return
    this.stopping = true

    for (const channel of [...this.activeChannels].reverse()) {
      try {
        await channel.stop()
      } catch (err) {
        console.error(
          `Error stopping channel ${channel.id}: ${(err as Error).message}`,
        )
      }
    }
    await this.worker?.stop()

    this.context.db.close()
    this.context = null
    this.activeChannels = []
    this.worker = null
    this.stopping = false
    console.log("Gateway stopped.")
  }
}
