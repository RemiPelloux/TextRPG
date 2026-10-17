/**
 * What the client may see. Secrets stay on the server: the RNG state (it would predict every
 * roll), the properties of unidentified items, and the right answer while fishing.
 */
import type { Content, PowerId } from "@textrpg/content";

import { challengeAvailable } from "./challenge";
import { availableSkills } from "./combat";
import { buildingValue, RECIPES } from "./economy";
import { weeklyAvailable } from "./encounters";
import { canFish } from "./fishing";
import { bagCapacity } from "./items";
import { expToNext, paragonPoints, talentPoints } from "./leveling";
import { canRest } from "./progression";
import { activePowers, computeStats, equippedSetCounts, powerScore } from "./stats";
import { isBloodMoon, isNight, nextTickIn } from "./time";
import type { Fishing, GameEvent, GameState, Hero, Item, Stats } from "./types";

export type ClientItem = Item & { hiddenAffixes?: number };

export interface ClientView {
  hero: Omit<Hero, "bag" | "equipment"> & {
    bag: ClientItem[];
    equipment: Partial<Record<keyof Hero["equipment"], ClientItem>>;
  };
  stats: Stats;
  powers: PowerId[];
  setCounts: Record<string, number>;
  power: number;
  combat: GameState["combat"];
  dungeon: (Omit<NonNullable<GameState["dungeon"]>, "stash"> & { stash: ClientItem[] }) | null;
  fishing: Omit<Fishing, "answer"> | null;
  challenge: GameState["challenge"];
  quests: GameState["quests"];
  board: GameState["board"];
  market: GameState["market"];
  story: GameState["story"];
  counters: GameState["counters"];
  codex: GameState["codex"];
  achievements: string[];
  pity: number;
  time: Pick<GameState["time"], "day" | "tzOffset" | "lastRestDay" | "dungeonCheckpoint" | "orcsToday">;
  derived: {
    expToNext: number;
    talentPoints: number;
    paragonPoints: number;
    bagCapacity: number;
    forgeMax: number;
    alchemistLevel: number;
    recipes: typeof RECIPES;
    canRest: boolean;
    nextTickIn: number;
    bloodMoon: boolean;
    night: boolean;
    weeklyAvailable: boolean;
    challengeAvailable: boolean;
    canFish: boolean;
    skills: string[];
  };
}

export function redactItem(item: Item): ClientItem {
  if (item.identified) return item;
  const { legendaryId: _l, setPieceId: _s, rareName: _r, ...rest } = item;
  return { ...rest, affixes: [], fixed: {}, hiddenAffixes: item.affixes.length };
}

/** Events carry items too (loot): hide what is not identified yet. */
export function redactEvents(events: GameEvent[]): GameEvent[] {
  return events.map((event) => (event.type === "loot" ? { ...event, item: redactItem(event.item) } : event));
}

export function toClientView(state: GameState, content: Content, now: number): ClientView {
  const stats = computeStats(state, content);
  const equipment: ClientView["hero"]["equipment"] = {};
  for (const [slot, item] of Object.entries(state.hero.equipment)) {
    if (item) equipment[slot as keyof Hero["equipment"]] = redactItem(item);
  }
  let fishing: ClientView["fishing"] = null;
  if (state.fishing) {
    const { answer: _answer, ...visible } = state.fishing;
    fishing = visible;
  }
  const ctxLike = { state, content };
  return {
    hero: { ...state.hero, bag: state.hero.bag.map(redactItem), equipment },
    stats,
    powers: activePowers(state, content),
    setCounts: Object.fromEntries(equippedSetCounts(state, content)),
    power: powerScore(stats),
    combat: state.combat,
    dungeon: state.dungeon ? { ...state.dungeon, stash: state.dungeon.stash.map(redactItem) } : null,
    fishing,
    challenge: state.challenge,
    quests: state.quests,
    board: state.board,
    market: state.market,
    story: state.story,
    counters: state.counters,
    codex: state.codex,
    achievements: state.achievements,
    pity: state.pity,
    time: {
      day: state.time.day,
      tzOffset: state.time.tzOffset,
      lastRestDay: state.time.lastRestDay,
      dungeonCheckpoint: state.time.dungeonCheckpoint,
      orcsToday: state.time.orcsToday,
    },
    derived: {
      expToNext: expToNext(state.hero.level),
      talentPoints: talentPoints(state.hero),
      paragonPoints: paragonPoints(state.hero),
      bagCapacity: bagCapacity(state, content),
      forgeMax: buildingValue(ctxLike, "forge"),
      alchemistLevel: buildingValue(ctxLike, "alchemist"),
      recipes: RECIPES,
      canRest: canRest(state),
      nextTickIn: nextTickIn(state, now, stats.maxEnergy),
      bloodMoon: isBloodMoon(state.time.day),
      night: isNight(now, state.time.tzOffset),
      weeklyAvailable: weeklyAvailable(ctxLike),
      challengeAvailable: challengeAvailable(ctxLike),
      canFish: canFish(ctxLike),
      skills: availableSkills({ content, hero: state.hero } as never, state.hero.level).map((s) => s.id),
    },
  };
}
