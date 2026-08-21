import type { Command } from "commander"
import type { CliCommand } from "../command.js"
import { ConfigError } from "../../config/errors.js"
import { runGateway } from "../../gateway/run.js"

export const gatewayCommand: CliCommand = {
  name: "gateway",
  description: "Start the MiniClaw gateway (long-lived daemon)",
  register(program: Command): void {
    program
      .command("gateway")
      .description("Start the MiniClaw gateway (long-lived daemon)")
      .action(async () => {
        try {
          await runGateway()
        } catch (err) {
          if (err instanceof ConfigError) {
            console.error(err.message)
            process.exitCode = 1
            return
          }
          throw err
        }
      })
  },
}
