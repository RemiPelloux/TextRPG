/**
 * Save format evolution. When GameState changes shape, bump SCHEMA_VERSION in newGame.ts and add a
 * step here that upgrades version N to N + 1, with a test loading an old save.
 */
import { SCHEMA_VERSION } from "./newGame";
import type { GameState } from "./types";

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {};

export class SaveVersionError extends Error {}

export function migrate(state: GameState): GameState {
  let version = state.schemaVersion;
  if (typeof version !== "number") throw new SaveVersionError("missing schemaVersion");
  if (version > SCHEMA_VERSION) throw new SaveVersionError(`save v${version} is newer than engine v${SCHEMA_VERSION}`);
  let data = state as unknown as Record<string, unknown>;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new SaveVersionError(`no migration from v${version}`);
    data = step(data);
    version += 1;
    data.schemaVersion = version;
  }
  return data as unknown as GameState;
}
