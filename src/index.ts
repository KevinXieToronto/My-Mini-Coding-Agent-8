/**
 * MiniClaw entry point.
 *
 * For now this just prints a banner so we can prove the build/run pipeline works.
 * Tutorial 02 turns this into a real CLI; Tutorial 05 turns it into a gateway daemon.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

function readVersion(): string {
  const pkgUrl = new URL("../package.json", import.meta.url)
  const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), "utf8")) as {
    version: string
  }
  return pkg.version
}

export function banner(): string {
  return `MiniClaw v${readVersion()}`
}

// Only run when invoked directly (not when imported by a test).
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("index.js")
) {
  console.log(banner())
}
