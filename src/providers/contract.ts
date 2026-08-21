/**
 * The LLM provider contract. Core depends on this, never on a specific SDK.
 */

/** One message in the conversation sent to the model. */
export interface ProviderMessage {
  role: "user" | "assistant"
  content: string
}

export interface CompletionRequest {
  system: string
  messages: ProviderMessage[]
  model: string
  maxTokens?: number
}

export interface Provider {
  readonly id: string
  /** Stream a completion as text chunks. */
  complete(req: CompletionRequest): AsyncIterable<string>
}
