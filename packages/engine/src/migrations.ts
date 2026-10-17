/**
 * Save format evolution. When GameState changes shape, bump SCHEMA_VERSION in newGame.ts and add a
 * step here that upgrades version N to N + 1, with a test loading an old save.
 */
import { SCHEMA_VERSION } from "./newGame";
import type { GameState } from "./types";

type Data = Record<string, unknown>;
type Migration = (state: Data) => Data;

function serialFor(uid: string): string {
  let hash = 0;
  for (const char of uid) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(36).toUpperCase().padStart(5, "0").slice(-5);
}

const MIGRATIONS: Record<number, Migration> = {
  /** v1 → v2: procedural items (quality, serial), the cube, torments and mercy. */
  1: (data) => {
    const state = data as unknown as GameState;
    const upgrade = (item: GameState["hero"]["bag"][number] | undefined) => {
      if (!item) return;
      item.quality ??= 60;
      item.seed ??= serialFor(item.uid);
      item.origin ??= { src: "start", day: state.time.day };
    };
    state.hero.bag.forEach(upgrade);
    Object.values(state.hero.equipment).forEach(upgrade);
    state.hero.torment ??= 0;
    state.cube ??= { powers: [], slots: [null, null, null], offer: null };
    state.mercy ??= 0;
    if (state.combat) {
      state.combat.procs ??= [];
      state.combat.procsUsed ??= [];
    }
    return data;
  },
};

export class SaveVersionError extends Error {}

export function migrate(state: GameState): GameState {
  let version = state.schemaVersion;
  if (typeof version !== "number") throw new SaveVersionError("missing schemaVersion");
  if (version > SCHEMA_VERSION) {
    throw new SaveVersionError(`save v${version} is newer than engine v${SCHEMA_VERSION}`);
  }
  let data = state as unknown as Data;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new SaveVersionError(`no migration from v${version}`);
    data = step(data);
    version += 1;
    data.schemaVersion = version;
  }
  return data as unknown as GameState;
}
