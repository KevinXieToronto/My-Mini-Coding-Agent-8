import type { Command } from "commander"
import type { CliCommand } from "../command.js"

export const statusCommand: CliCommand = {
  name: "status",
  description: "Show whether MiniClaw is configured and running",
  register(program: Command): void {
    program
      .command("status")
      .description("Show whether MiniClaw is configured and running")
      .action(() => {
        console.log("MiniClaw is not configured yet. Run `miniclaw onboard`.")
      })
  },
}
