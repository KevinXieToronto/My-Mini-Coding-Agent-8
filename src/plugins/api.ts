/**
 * Builds the PluginApi injected into each plugin, collecting registrations as they arrive.
 */
import type {
  BeforeReplyHook,
  ChannelRegistration,
  HookRegistration,
  PluginApi,
  ProviderRegistration,
} from "../plugin-sdk.js"

export interface LoadedRegistrations {
  channels: Map<string, ChannelRegistration>
  providers: Map<string, ProviderRegistration>
  /** Hooks run in plugin-load order, each fed the previous one's output. */
  beforeReply: BeforeReplyHook[]
}

export function createRegistrations(): LoadedRegistrations {
  return { channels: new Map(), providers: new Map(), beforeReply: [] }
}

export function buildApi(
  into: LoadedRegistrations,
  pluginId: string,
): PluginApi {
  return {
    registerChannel(reg: ChannelRegistration): void {
      if (into.channels.has(reg.id)) {
        throw new Error(
          `Channel "${reg.id}" already registered (plugin ${pluginId}).`,
        )
      }
      into.channels.set(reg.id, reg)
    },
    registerProvider(reg: ProviderRegistration): void {
      if (into.providers.has(reg.id)) {
        throw new Error(
          `Provider "${reg.id}" already registered (plugin ${pluginId}).`,
        )
      }
      into.providers.set(reg.id, reg)
    },
    registerHook(reg: HookRegistration): void {
      if (reg.event === "beforeReply") into.beforeReply.push(reg.handler)
    },
  }
}
