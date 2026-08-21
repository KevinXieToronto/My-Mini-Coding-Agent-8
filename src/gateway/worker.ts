/**
 * The ingress worker: drains the queue, resolves the session, replies, completes.
 *
 * The reply is an echo for now; Tutorial 07 swaps in the LLM agent runner.
 */
import type { Kysely } from "kysely"
import type { Database } from "../state/schema.generated.js"
import type { Channel } from "../channels/contract.js"
import type { ClaimedEvent, IngressQueue } from "../channels/ingress-queue.js"
import { resolveSession } from "../channels/sessions.js"

export type ReplyFn = (
  event: ClaimedEvent,
  sessionId: string,
) => Promise<string>

export interface WorkerDeps {
  db: Kysely<Database>
  queue: IngressQueue
  channelsById: Map<string, Channel>
  replyFor: ReplyFn
  /** Poll interval when the queue is empty (ms). */
  idleMs?: number
}

export class IngressWorker {
  private running = false
  private loopDone: Promise<void> | null = null

  constructor(private readonly deps: WorkerDeps) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.loopDone = this.loop()
  }

  async stop(): Promise<void> {
    this.running = false
    await this.loopDone
    this.loopDone = null
  }

  private async loop(): Promise<void> {
    const idleMs = this.deps.idleMs ?? 50
    while (this.running) {
      const event = await this.deps.queue.claim()
      if (!event) {
        await new Promise((r) => setTimeout(r, idleMs))
        continue
      }
      await this.handle(event)
    }
  }

  private async handle(event: ClaimedEvent): Promise<void> {
    try {
      const session = await resolveSession(
        this.deps.db,
        event.channelId,
        event.conversationId,
      )
      const text = await this.deps.replyFor(event, session.id)

      const channel = this.deps.channelsById.get(event.channelId)
      if (channel) {
        await channel.send({ conversationId: event.conversationId, text })
      }
      await this.deps.queue.complete(event.id, event.claimToken)
    } catch (err) {
      console.error(
        `Failed to process event ${event.id}: ${(err as Error).message}`,
      )
      await this.deps.queue.release(event.id, event.claimToken)
    }
  }
}
