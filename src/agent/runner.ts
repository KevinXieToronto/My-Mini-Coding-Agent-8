/**
 * The agent runner.
 *
 * For a session and a new user message: load prior turns, call the provider, stream the reply,
 * and persist both turns to the transcript.
 */
import { randomUUID } from "node:crypto"
import type { Kysely } from "kysely"
import type { Database } from "../state/schema.generated.js"
import type { Config } from "../config/schema.js"
import type { Provider, ProviderMessage } from "../providers/contract.js"

export interface RunTurnInput {
  sessionId: string
  userText: string
  /** Called with each streamed text chunk (for progressive UIs). */
  onChunk?: (chunk: string) => void
}

export class AgentRunner {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly provider: Provider,
    private readonly config: Config,
  ) {}

  async runTurn(input: RunTurnInput): Promise<string> {
    const history = await this.loadHistory(input.sessionId)

    // Persist the user turn first, so it survives a crash mid-completion.
    await this.appendMessage(input.sessionId, "user", input.userText)

    const messages: ProviderMessage[] = [
      ...history,
      { role: "user", content: input.userText },
    ]

    let full = ""
    for await (const chunk of this.provider.complete({
      system: this.config.agent.systemPrompt,
      messages,
      model: this.config.provider.model,
    })) {
      full += chunk
      input.onChunk?.(chunk)
    }

    await this.appendMessage(input.sessionId, "assistant", full)
    return full
  }

  private async loadHistory(sessionId: string): Promise<ProviderMessage[]> {
    const rows = await this.db
      .selectFrom("messages")
      .select(["role", "content"])
      .where("sessionId", "=", sessionId)
      .orderBy("createdAt", "asc")
      .execute()
    return rows.map((r) => ({ role: r.role, content: r.content }))
  }

  private async appendMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<void> {
    await this.db
      .insertInto("messages")
      .values({
        id: randomUUID(),
        sessionId,
        role,
        content,
        createdAt: Date.now(),
      })
      .execute()
  }
}
