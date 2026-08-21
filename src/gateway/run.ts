/**
 * Runs the Gateway in the foreground until SIGINT/SIGTERM, then shuts down gracefully.
 */
import { Gateway } from "./gateway.js"

export async function runGateway(): Promise<void> {
  const gateway = new Gateway()
  await gateway.start()

  await new Promise<void>((resolve) => {
    let shuttingDown = false
    const onSignal = (signal: NodeJS.Signals): void => {
      if (shuttingDown) return
      shuttingDown = true
      console.log(`\nReceived ${signal}, shutting down...`)
      void gateway.stop().finally(resolve)
    }
    process.once("SIGINT", onSignal)
    process.once("SIGTERM", onSignal)
  })
}
