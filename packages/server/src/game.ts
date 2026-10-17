/**
 * The authoritative game service: load the hero, run the engine with the server clock, save with
 * an optimistic lock, return the client view and the events to animate.
 */
import { randomBytes } from "node:crypto";

import { getContent } from "@textrpg/content";
import {
  countHeroes,
  type Db,
  getHero,
  type HeroColumns,
  insertHero,
  recordDailyRun,
  saveHero,
} from "@textrpg/db";
import {
  apply,
  type ClientView,
  computeStats,
  createGame,
  GameError,
  type GameEvent,
  type GameState,
  migrate,
  powerScore,
  redactEvents,
  sanitizeName,
  toClientView,
} from "@textrpg/engine";

import { parseAction } from "./actions";
import { RateLimiter } from "./rateLimit";

export const MAX_HEROES = 3;
const content = getContent();
const limiter = new RateLimiter({ capacity: 30, refillPerSecond: 6 });

export type ActResult =
  | { ok: true; view: ClientView; events: GameEvent[] }
  | { ok: false; error: string; params?: Record<string, string | number>; view?: ClientView };

export class ServiceError extends Error {
  constructor(readonly code: "notFound" | "tooManyHeroes" | "invalidName" | "conflict") {
    super(code);
  }
}

export function columnsOf(state: GameState): HeroColumns {
  return {
    name: state.hero.name,
    level: state.hero.level,
    paragon: state.hero.paragon,
    power: powerScore(computeStats(state, content)),
    deepestFloor: state.counters.deepestFloor,
    classId: state.hero.classId,
    schemaVersion: state.schemaVersion,
  };
}

export async function createHero(
  db: Db,
  userId: string,
  input: { name: string; tzOffset: number },
  now = Date.now(),
): Promise<string> {
  const name = sanitizeName(String(input.name ?? ""));
  if (name.length < 2) throw new ServiceError("invalidName");
  if ((await countHeroes(db, userId)) >= MAX_HEROES) throw new ServiceError("tooManyHeroes");
  const tzOffset = Number.isFinite(input.tzOffset) ? input.tzOffset : 0;
  const state = createGame({ name, seed: randomBytes(16).toString("hex"), now, tzOffset, content });
  return insertHero(db, userId, columnsOf(state), state);
}

async function load(db: Db, userId: string, heroId: string) {
  const row = await getHero(db, userId, heroId);
  if (!row) throw new ServiceError("notFound");
  return { row, state: migrate(row.state as GameState) };
}

/** The hero as of now (energy regenerated, new day applied), without writing anything. */
export async function getView(db: Db, userId: string, heroId: string, now = Date.now()): Promise<ClientView> {
  const { state } = await load(db, userId, heroId);
  const synced = apply(state, { type: "sync" }, { now, content }).state;
  return toClientView(synced, content, now);
}

export async function act(db: Db, userId: string, heroId: string, input: unknown, now = Date.now()): Promise<ActResult> {
  const action = parseAction(input);
  if (!action) return { ok: false, error: "invalidAction" };
  if (!limiter.take(userId)) return { ok: false, error: "tooFast" };

  for (let attempt = 0; attempt < 2; attempt++) {
    const { row, state } = await load(db, userId, heroId);
    let result;
    try {
      result = apply(state, action, { now, content });
    } catch (error) {
      if (error instanceof GameError) {
        return { ok: false, error: error.code, params: error.params, view: toClientView(state, content, now) };
      }
      throw error;
    }
    const saved = await saveHero(db, heroId, row.version, columnsOf(result.state), result.state, action);
    if (!saved) continue; // Someone else wrote first (another tab): reload and replay once.

    const finished = result.events.find((e) => e.type === "challengeScore" && e.finished);
    if (finished?.type === "challengeScore" && result.state.challenge) {
      await recordDailyRun(db, result.state.challenge.day, heroId, result.state.hero.name, finished.score);
    }
    return { ok: true, view: toClientView(result.state, content, now), events: redactEvents(result.events) };
  }
  return { ok: false, error: "conflict" };
}
