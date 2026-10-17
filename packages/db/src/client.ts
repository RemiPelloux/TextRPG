import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export const DEFAULT_DATABASE_URL = "postgres://textrpg:textrpg@localhost:5432/textrpg";

export function createDb(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL): { db: Db; close: () => Promise<void> } {
  // `prepare: false` keeps us compatible with transaction poolers (Neon, Supabase, PgBouncer).
  const client = postgres(url, { max: Number(process.env.DATABASE_POOL_SIZE ?? 5), prepare: false });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

const globalForDb = globalThis as unknown as { textrpgDb?: Db };

/** Process-wide connection (survives Next.js hot reloads in development). */
export function getDb(): Db {
  globalForDb.textrpgDb ??= createDb().db;
  return globalForDb.textrpgDb;
}
