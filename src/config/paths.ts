/**
 * Canonical filesystem locations for MiniClaw.
 *
 * Everything MiniClaw owns lives under one home directory:
 *   ~/.miniclaw/                 (or $MINICLAW_HOME)
 *     config.json                the single canonical config file
 *     state/miniclaw.sqlite      the shared state DB (Tutorial 04)
 */
import { homedir } from "node:os"
import { join } from "node:path"

export function miniclawHome(): string {
  const override = process.env.MINICLAW_HOME
  if (override && override.trim() !== "") {
    return override
  }
  return join(homedir(), ".miniclaw")
}

export function configPath(): string {
  return join(miniclawHome(), "config.json")
}

export function statePath(): string {
  return join(miniclawHome(), "state", "miniclaw.sqlite")
}
