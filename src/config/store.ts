/**
 * Canonical config load/save.
 *
 * Reads exactly one shape (ConfigSchema). No compat readers, no alias fallbacks.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { ZodError } from "zod"
import { configPath } from "./paths.js"
import { ConfigError, formatZodError } from "./errors.js"
import { type Config, ConfigSchema } from "./schema.js"

/** Returns the validated config, or null if no config file exists yet. */
export function loadConfig(): Config | null {
  let raw: string
  try {
    raw = readFileSync(configPath(), "utf8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null
    throw new ConfigError(
      `Cannot read config at ${configPath()}: ${(err as Error).message}`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ConfigError(`Config at ${configPath()} is not valid JSON.`)
  }

  try {
    return ConfigSchema.parse(parsed)
  } catch (err) {
    if (err instanceof ZodError) throw new ConfigError(formatZodError(err))
    throw err
  }
}

/** Validates and writes config atomically. */
export function saveConfig(config: Config): void {
  // Re-validate on the way out so we never persist a bad shape.
  const validated = ConfigSchema.parse(config)
  const target = configPath()
  mkdirSync(dirname(target), { recursive: true })
  const tmp = `${target}.tmp`
  writeFileSync(tmp, `${JSON.stringify(validated, null, 2)}\n`, "utf8")
  renameSync(tmp, target)
}
