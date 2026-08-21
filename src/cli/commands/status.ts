import type { Command } from "commander"
import type { CliCommand } from "../command.js"
import { configPath } from "../../config/paths.js"
import { ConfigError } from "../../config/errors.js"
import { loadConfig } from "../../config/store.js"

export const statusCommand: CliCommand = {
  name: "status",
  description: "Show whether MiniClaw is configured",
  register(program: Command): void {
    program
      .command("status")
      .description("Show whether MiniClaw is configured")
      .action(() => {
        let config
        try {
          config = loadConfig()
        } catch (err) {
          if (err instanceof ConfigError) {
            console.error(err.message)
            process.exitCode = 1
            return
          }
          throw err
        }

        if (!config) {
          console.log("MiniClaw is not configured yet. Run `miniclaw onboard`.")
          return
        }

        const channels = Object.entries(config.channels)
          .filter(([, c]) => c.enabled)
          .map(([id]) => id)
          .join(", ")
        console.log(`Configured  : ${configPath()}`)
        console.log(`Assistant   : ${config.agent.name}`)
        console.log(
          `Provider    : ${config.provider.id} (${config.provider.model})`,
        )
        console.log(`Channels    : ${channels || "(none enabled)"}`)
      })
  },
}
