import type { Command } from "commander"
import type { CliCommand } from "../command.js"
import { configPath } from "../../config/paths.js"
import { loadConfig, saveConfig } from "../../config/store.js"
import { defaultConfig } from "../../config/schema.js"

interface OnboardOptions {
  name?: string
  model?: string
  force?: boolean
}

export const onboardCommand: CliCommand = {
  name: "onboard",
  description: "Create a MiniClaw config",
  register(program: Command): void {
    program
      .command("onboard")
      .description("Create a MiniClaw config")
      .option("--name <name>", "assistant name")
      .option("--model <model>", "provider model")
      .option("--force", "overwrite an existing config")
      .action((opts: OnboardOptions) => {
        if (loadConfig() && !opts.force) {
          console.log(
            `Config already exists at ${configPath()}. Use --force to overwrite.`,
          )
          return
        }
        const config = defaultConfig()
        if (opts.name) config.agent.name = opts.name
        if (opts.model) config.provider.model = opts.model
        saveConfig(config)
        console.log(`Wrote config to ${configPath()}.`)
        console.log(
          `Assistant: ${config.agent.name}  |  Model: ${config.provider.model}`,
        )
      })
  },
}
