/**
 * The OpenAI provider, as a plugin.
 */
import OpenAI from "openai"
import type {
  CompletionRequest,
  Config,
  Plugin,
  PluginApi,
  Provider,
} from "../../src/plugin-sdk.js"

class OpenAiProvider implements Provider {
  readonly id = "openai"
  private readonly client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async *complete(req: CompletionRequest): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 1024,
      stream: true,
      messages: [
        { role: "system", content: req.system },
        ...req.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }
}

function createFromConfig(config: Config): Provider {
  const apiKey = process.env[config.provider.apiKeyEnv]
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      `Missing API key. Set the ${config.provider.apiKeyEnv} environment variable.`,
    )
  }
  return new OpenAiProvider(apiKey)
}

const plugin: Plugin = {
  id: "openai-provider",
  kind: "provider",
  register(api: PluginApi): void {
    api.registerProvider({ id: "openai", create: createFromConfig })
  },
}

export default plugin
