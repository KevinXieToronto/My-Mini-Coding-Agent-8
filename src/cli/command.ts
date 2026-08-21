import type { Command } from "commander"

/** A registrable CLI command. `register` attaches it to the root commander program. */
export interface CliCommand {
  name: string
  description: string
  register(program: Command): void
}
