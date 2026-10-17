import { runMigrations } from "@textrpg/db/migrate";

export default async function globalSetup() {
  await runMigrations(
    process.env.E2E_DATABASE_URL ?? "postgres://textrpg:textrpg@localhost:5432/textrpg_test",
  );
}
