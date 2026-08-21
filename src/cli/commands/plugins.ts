/**
 * `miniclaw plugins`: lists the plugins the loader resolves, without booting the gateway.
 */
import type { Command } from "commander"
import type { CliCommand } from "../command.js"
import { loadPlugins } from "../../plugins/loader.js"
import { bundledPlugins } from "../../plugins/bundled.js"

export const pluginsCommand: CliCommand = {
  name: "plugins",
  description: "List loaded plugins",
  register(program: Command): void {
    program
      .command("plugins")
      .description("List loaded plugins")
      .action(() => {
        const { loaded } = loadPlugins(bundledPlugins)
        for (const p of loaded) {
          console.log(`${p.kind.padEnd(10)} ${p.id}`)
        }
      })
  },
}
