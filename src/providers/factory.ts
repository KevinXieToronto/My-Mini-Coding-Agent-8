/**
 * Builds the configured provider, resolving its secret from the environment.
 */
import type { Config } from "../config/schema.js"
import type { Provider } from "./contract.js"
import { OpenAiProvider } from "./openai.js"

export function createProvider(config: Config): Provider {
  const { id, apiKeyEnv } = config.provider
  const apiKey = process.env[apiKeyEnv]
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      `Missing API key. Set the ${apiKeyEnv} environment variable (provider "${id}").`,
    )
  }

  switch (id) {
    case "openai":
      return new OpenAiProvider({ apiKey })
    default:
      // Exhaustiveness: config's zod enum only allows "openai" today.
      throw new Error(`Unknown provider id: ${id as string}`)
  }
}
