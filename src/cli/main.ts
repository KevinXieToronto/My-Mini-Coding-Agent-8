/**
 * CLI composition root.
 *
 * Builds the commander program, registers every command from the catalog, and parses argv.
 */
import { Command } from "commander"
import { commandCatalog } from "./command-catalog.js"

export function buildProgram(): Command {
  const program = new Command()
  program
    .name("miniclaw")
    .description("A teaching-scale multi-channel AI gateway")
    .version("0.1.0")

  for (const command of commandCatalog) {
    command.register(program)
  }

  return program
}

export async function runCli(argv: string[]): Promise<void> {
  const program = buildProgram()
  // commander parses process-style argv (with node + script as argv[0..1]).
  await program.parseAsync(argv)
}
