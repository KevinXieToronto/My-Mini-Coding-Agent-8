/**
 * The channel contract: a transport that produces inbound events and delivers replies.
 *
 * Channels are transport-only. They know nothing about the queue, sessions, or the agent.
 */

/** A message arriving from a channel, before it enters the queue. */
export interface InboundMessage {
  channelId: string
  /** Stable id for the conversation within the channel (a DM, a room, a stdin session). */
  conversationId: string
  /** Who sent it (a username, phone, or "local" for the CLI). */
  sender: string
  text: string
}

/** A reply to deliver back out a channel. */
export interface OutboundReply {
  conversationId: string
  text: string
}

export type InboundHandler = (msg: InboundMessage) => void

export interface Channel {
  readonlyid: string
  /** Register the handler the transport calls for each inbound message. */
  onInbound(handler: InboundHandler): void
  /** Begin receiving (open sockets, start readers, etc.). */
  start(): Promise<void>
  /** Stop receiving and release resources. */
  stop(): Promise<void>
  /** Deliver a reply to a conversation on this channel. */
  send(reply: OutboundReply): Promise<void>
}
