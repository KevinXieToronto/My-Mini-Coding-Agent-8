import type { CliCommand } from "./command.js"
import { gatewayCommand } from "./commands/gateway.js"
import { onboardCommand } from "./commands/onboard.js"
import { statusCommand } from "./commands/status.js"

export const commandCatalog: readonly CliCommand[] = [
  onboardCommand,
  gatewayCommand,
  statusCommand,
]
