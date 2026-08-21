import type { Command } from "commander"
import type { CliCommand } from "../command.js"
import { openStateDb } from "../../state/db.js"

export const dbInfoCommand: CliCommand = {
  name: "db:info",
  description: "Show state database tables and row counts",
  register(program: Command): void {
    program
      .command("db:info")
      .description("Show state database tables and row counts")
      .action(async () => {
        const db = openStateDb()
        try {
          const tables = ["sessions", "ingress_events", "messages"] as const
          for (const table of tables) {
            const { count } = await db.kysely
              .selectFrom(table)
              .select((eb) => eb.fn.countAll<number>().as("count"))
              .executeTakeFirstOrThrow()
            console.log(`${table.padEnd(16)} ${count}`)
          }
        } finally {
          db.close()
        }
      })
  },
}
