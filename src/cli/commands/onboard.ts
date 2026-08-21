import type { Command } from "commander"
import type { CliCommand } from "../command.js"

export const onboardCommand: CliCommand = {
  name: "onboard",
  description: "Create a MiniClaw config interactively",
  register(program: Command): void {
    program
      .command("onboard")
      .description("Create a MiniClaw config interactively")
      .action(() => {
        console.log("onboard: not implemented yet (Tutorial 03 wires this up).")
      })
  },
}
