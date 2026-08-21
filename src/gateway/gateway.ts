/**
 * The MiniClaw Gateway: the long-lived control plane.
 *
 * Boots once (config + DB + registries), stays up, and tears down in reverse on stop().
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

export interface GatewayContext {
  config: Config
  db: StateDb
  channels: Registry<ChannelRuntime>
  providers: Registry<ProviderRuntime>
}

export class Gateway {
  private context: GatewayContext | null = null
  private stopping = false

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

    // Tutorial 06 registers channels here; Tutorial 07 registers providers.
    // Then we start every registered channel:
    for (const channel of channels.all()) {
      await channel.start()
    }

    console.log(
      `Gateway up. Assistant: ${config.agent.name}. Channels: ${channels.all().length}.`,
    )
    return this.context
  }

  /** Gracefully stops the gateway: stop channels, then close the DB. Idempotent. */
  async stop(): Promise<void> {
    if (!this.context || this.stopping) return
    this.stopping = true

    // Stop channels in reverse registration order.
    const channels = [...this.context.channels.all()].reverse()
    for (const channel of channels) {
      try {
        await channel.stop()
      } catch (err) {
        console.error(
          `Error stopping channel ${channel.id}: ${(err as Error).message}`,
        )
      }
    }

    this.context.db.close()
    this.context = null
    console.log("Gateway stopped.")
  }
}
