import { getContent } from "@textrpg/content";
import { expect } from "vitest";

import { apply, createGame, type Action, type GameEvent, type GameState } from "../src";
import { Ctx } from "../src/ctx";
import { Rng } from "../src/rng";

export const content = getContent();
/** 2026-10-16 12:00 UTC, a Friday. */
export const NOON = Date.UTC(2026, 9, 16, 12, 0, 0);

export function newGame(seed = "test-seed", now = NOON): GameState {
  return createGame({ name: "Aria", seed, now, tzOffset: 0, content });
}

export function act(
  state: GameState,
  action: Action,
  now = NOON,
): { state: GameState; events: GameEvent[] } {
  return apply(state, action, { now, content });
}

/** Run a list of actions, threading the state. */
export function play(state: GameState, actions: Action[], now = NOON) {
  let current = state;
  const events: GameEvent[] = [];
  for (const action of actions) {
    const result = act(current, action, now);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

export function ctxFor(state: GameState, seed = "ctx", now = NOON): Ctx {
  return new Ctx(state, content, new Rng(Rng.fromSeed(seed).state()), now);
}

/** Make the hero absurdly strong, for tests that need a guaranteed win. */
export function godMode(state: GameState): GameState {
  Object.assign(state.hero.base, {
    maxHealth: 5000,
    strength: 400,
    defense: 300,
    speed: 200,
    luck: 0,
  });
  state.hero.health = 5000;
  return state;
}

export function weakling(state: GameState): GameState {
  Object.assign(state.hero.base, { maxHealth: 10, strength: 0, defense: 0, speed: 0, luck: 0 });
  state.hero.health = 10;
  state.hero.equipment = {};
  return state;
}

/** Fight the current combat to its end with plain attacks. */
export function fightOut(state: GameState, now = NOON) {
  let current = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < 200 && current.combat; i++) {
    const result = act(current, { type: "combat.attack" }, now);
    current = result.state;
    events.push(...result.events);
  }
  expect(current.combat).toBeNull();
  return { state: current, events };
}

export function ofType<T extends GameEvent["type"]>(events: GameEvent[], type: T) {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}
