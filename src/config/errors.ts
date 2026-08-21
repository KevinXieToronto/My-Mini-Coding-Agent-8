import type { ZodError } from "zod"

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

export function formatZodError(err: ZodError): string {
  const lines = err.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)"
    return `  - ${path}: ${issue.message}`
  })
  return `Config is invalid:\n${lines.join("\n")}`
}
