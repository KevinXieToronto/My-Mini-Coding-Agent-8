import { z } from "zod"

/** The LLM provider selection. `apiKeyEnv` names the env var holding the secret. */
export const ProviderConfigSchema = z.object({
  id: z.enum(["openai"]).default("openai"),
  model: z.string().min(1).default("gpt-4o"),
  apiKeyEnv: z.string().min(1).default("OPENAI_API_KEY"),
})

/** Per-channel config. The CLI channel needs no options; Telegram (T09) adds a token env. */
export const ChannelConfigSchema = z.object({
  enabled: z.boolean().default(true),
  tokenEnv: z.string().min(1).optional(),
})

export const ConfigSchema = z.object({
  agent: z.object({
    name: z.string().min(1).default("MiniClaw"),
    systemPrompt: z
      .string()
      .default("You are MiniClaw, a concise, helpful assistant."),
  }),
  provider: ProviderConfigSchema,
  channels: z
    .record(z.string(), ChannelConfigSchema)
    .default({ cli: { enabled: true } }),
})

export type Config = z.infer<typeof ConfigSchema>
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>
export type ChannelConfig = z.infer<typeof ChannelConfigSchema>

/** The config we write on `onboard` when the user accepts all defaults. */
export function defaultConfig(): Config {
  return ConfigSchema.parse({
    agent: {},
    provider: {},
    channels: { cli: { enabled: true } },
  })
}
