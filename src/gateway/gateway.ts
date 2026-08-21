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
import { type ClaimedEvent, IngressQueue } from "../channels/ingress-queue.js"
import { IngressWorker } from "./worker.js"
import { AgentRunner } from "../agent/runner.js"
import { loadPlugins } from "../plugins/loader.js"
import { bundledPlugins } from "../plugins/bundled.js"

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

    // Load plugins -> registrations.
    const { channels: channelRegs, providers: providerRegs } =
      loadPlugins(bundledPlugins)

    const queue = new IngressQueue(db.kysely)
    const channelsById = new Map<string, Channel>()

    // Build every enabled channel that a plugin registered.
    for (const [id, cfg] of Object.entries(config.channels)) {
      if (!cfg.enabled) continue
      const reg = channelRegs.get(id)
      if (!reg) {
        console.warn(`No plugin provides channel "${id}"; skipping.`)
        continue
      }
      const channel = reg.create(config)
      this.activeChannels.push(channel)
      channelsById.set(channel.id, channel)
      // Persist every inbound message into the durable queue.
      channel.onInbound((msg) => {
        void queue.enqueue(msg)
      })
      channels.register({
        id: channel.id,
        start: () => channel.start(),
        stop: () => channel.stop(),
      })
    }

    // Build the configured provider.
    const providerReg = providerRegs.get(config.provider.id)
    if (!providerReg) {
      throw new ConfigError(
        `No plugin provides provider "${config.provider.id}".`,
      )
    }
    const provider = providerReg.create(config)
    providers.register({ id: provider.id })

    const runner = new AgentRunner(db.kysely, provider, config)

    // The reply is now a real, streamed model completion.
    const replyFor = async (
      event: ClaimedEvent,
      sessionId: string,
    ): Promise<string> => {
      return runner.runTurn({ sessionId, userText: event.text })
    }

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
