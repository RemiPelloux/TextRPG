import { COUNTERS, type Content } from "@textrpg/content";

import { Ctx } from "./ctx";
import { refreshMarket } from "./economy";
import { addToBag, simpleItem } from "./items";
import { generateEquipment } from "./loot";
import { ensureStory, firstStoryQuest, refreshBoard, refreshDaily } from "./quests";
import { Rng } from "./rng";
import { dayIndex } from "./time";
import type { GameState } from "./types";

export const SCHEMA_VERSION = 1;
export const MAX_NAME_LENGTH = 20;

export interface NewGameOptions {
  name: string;
  seed: string;
  now: number;
  /** `new Date().getTimezoneOffset()` on the player's device. */
  tzOffset: number;
  content: Content;
}

export function sanitizeName(name: string): string {
  return name
    .replace(/[^\p{L}\p{N} '-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function createGame(opts: NewGameOptions): GameState {
  const rng = Rng.fromSeed(opts.seed);
  const tzOffset = Math.max(-14 * 60, Math.min(14 * 60, Math.round(opts.tzOffset)));
  const day = dayIndex(opts.now, tzOffset);
  // Random starting attributes, as in the original game.
  const base = {
    maxHealth: 100,
    maxEnergy: 20,
    strength: rng.int(1, 3) + 1,
    defense: rng.int(1, 3),
    speed: rng.int(1, 3) + 2,
    luck: rng.int(-1, 3),
  };
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    rng: rng.state(),
    nextUid: 1,
    hero: {
      name: sanitizeName(opts.name) || "Nameless",
      level: 1,
      exp: 0,
      paragon: 0,
      classId: null,
      talents: {},
      paragonPoints: {},
      base,
      health: base.maxHealth,
      energy: base.maxEnergy,
      gold: 10,
      shards: 0,
      bag: [],
      equipment: {},
      buffs: [],
      buildings: { forge: 0, satchel: 0, market: 0, alchemist: 0 },
    },
    combat: null,
    dungeon: null,
    fishing: null,
    challenge: null,
    quests: [],
    board: { day, offers: [] },
    daily: { day },
    story: { nextId: firstStoryQuest(opts.content.quests.values()), chapter: 0 },
    market: { day, offers: [] },
    counters: Object.fromEntries(COUNTERS.map((c) => [c, 0])) as GameState["counters"],
    codex: { kills: {}, legendaries: [], setPieces: [], fish: [] },
    achievements: [],
    pity: 0,
    time: {
      tzOffset,
      day,
      tickAt: opts.now,
      lastRestDay: null,
      orcsToday: 0,
      weeklyBossWeek: null,
      dungeonCheckpoint: 1,
    },
  };
  state.counters.level = 1;

  const ctx = new Ctx(state, opts.content, rng, opts.now);
  // The sword of the original game, plus a little help.
  state.hero.equipment.weapon = generateEquipment(ctx, {
    ilvl: 1,
    rarity: "common",
    slot: "weapon",
  });
  state.hero.equipment.weapon.baseId = "sword";
  state.hero.equipment.weapon.implicit = { strength: 3 };
  addToBag(ctx, simpleItem(ctx, "potion", 3));
  addToBag(ctx, simpleItem(ctx, "identify_scroll", 1));
  refreshMarket(ctx);
  refreshBoard(ctx);
  refreshDaily(ctx);
  ensureStory(ctx);
  state.rng = rng.state();
  return state;
}
