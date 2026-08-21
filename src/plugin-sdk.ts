/**
 * The MiniClaw plugin SDK.
 *
 * The single public surface a plugin may import. Core internals stay off-limits to plugins;
 * plugins meet core here and through their manifest.
 */
export type {
  Channel,
  InboundMessage,
  InboundHandler,
  OutboundReply,
} from "./channels/contract.js"
export type {
  Provider,
  ProviderMessage,
  CompletionRequest,
} from "./providers/contract.js"
export type { Config } from "./config/schema.js"

import type { Config } from "./config/schema.js"
import type { Channel } from "./channels/contract.js"
import type { Provider } from "./providers/contract.js"

/** A channel a plugin registers. `create` builds the transport instance at boot. */
export interface ChannelRegistration {
  id: string
  create(config: Config): Channel
}

/** A provider a plugin registers. `create` builds the provider (reading secrets) at boot. */
export interface ProviderRegistration {
  id: string
  create(config: Config): Provider
}

/** Context passed to a beforeReply hook. */
export interface BeforeReplyContext {
  sessionId: string
  channelId: string
  conversationId: string
  userText: string
  replyText: string
}

/** A beforeReply hook returns the (possibly transformed) reply text. */
export type BeforeReplyHook = (
  ctx: BeforeReplyContext,
) => string | Promise<string>

/** A hook a plugin registers. One event today; the union is the extension point. */
export interface HookRegistration {
  event: "beforeReply"
  handler: BeforeReplyHook
}

/** The API injected into every plugin's register(). It is the plugin's only capability. */
export interface PluginApi {
  registerChannel(reg: ChannelRegistration): void
  registerProvider(reg: ProviderRegistration): void
  registerHook(reg: HookRegistration): void
}

export type PluginKind = "channel" | "provider" | "hook"

/** A plugin manifest. */
export interface Plugin {
  id: string
  kind: PluginKind
  register(api: PluginApi): void
}
