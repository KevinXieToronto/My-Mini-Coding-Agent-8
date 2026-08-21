#!/usr/bin/env node
// Thin launcher: import the built CLI and run it.
// Kept tiny and buildless so the executable entry point rarely changes.
import { runCli } from "./dist/src/cli/main.js"

runCli(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
