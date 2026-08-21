import type { Command } from "commander"
import type { CliCommand } from "../command.js"

export const gatewayCommand: CliCommand = {
  name: "gateway",
  description: "Start the MiniClaw gateway (long-lived daemon)",
  register(program: Command): void {
    program
      .command("gateway")
      .description("Start the MiniClaw gateway (long-lived daemon)")
      .action(() => {
        console.log(
          "gateway: not implemented yet (Tutorial 05 boots the daemon).",
        )
      })
  },
}
