/**
 * OpenAI provider: streams completions via the `openai` SDK.
 */
import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { CompletionRequest, Provider } from "./contract.js"

export interface OpenAiProviderOptions {
  apiKey: string
}

export class OpenAiProvider implements Provider {
  readonly id = "openai"
  private readonly client: OpenAI

  constructor(opts: OpenAiProviderOptions) {
    this.client = new OpenAI({ apiKey: opts.apiKey })
  }

  async *complete(req: CompletionRequest): AsyncIterable<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: req.system },
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const stream = await this.client.chat.completions.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 1024,
      stream: true,
      messages,
    })

    // Each streamed chunk carries an incremental text delta on choices[0].delta.content.
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }
}
