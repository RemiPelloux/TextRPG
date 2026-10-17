/** Apply pending SQL migrations from ./drizzle. Usage: DATABASE_URL=... pnpm db:migrate */
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDb } from "./client";

export async function runMigrations(url?: string): Promise<void> {
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  } finally {
    await close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMigrations();
  console.log("migrations applied");
}
