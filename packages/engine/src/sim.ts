/** Balancing helpers: build a typical hero at any level and measure fights against it. */
import { type ClassId, type Content, type DifficultyId, SLOTS } from "@textrpg/content";

import { Ctx } from "./ctx";
import { expToNext, grantExp, talentPoints } from "./leveling";
import { generateEquipment } from "./loot";
import { createGame } from "./newGame";
import { apply } from "./reducer";
import { Rng } from "./rng";
import { computeStats } from "./stats";
import type { GameState } from "./types";

export interface HeroSpec {
  level: number;
  classId?: ClassId;
  rarity?: "common" | "magic" | "rare";
  seed: string;
  content: Content;
  now: number;
}

/** A hero of `level` wearing magic gear of their level in every slot, talents spent. */
export function typicalHero(spec: HeroSpec): GameState {
  const state = createGame({
    name: "Sim",
    seed: spec.seed,
    now: spec.now,
    tzOffset: 0,
    content: spec.content,
  });
  const ctx = new Ctx(state, spec.content, new Rng(state.rng), spec.now);
  while (state.hero.level < spec.level) grantExp(ctx, expToNext(state.hero.level) - state.hero.exp);
  state.hero.exp = 0;
  if (spec.level >= 5) {
    state.hero.classId = spec.classId ?? "warrior";
    const talents = spec.content.classes.get(state.hero.classId)!.talents;
    for (let i = 0; talentPoints(state.hero) > 0 && i < 100; i++) {
      const talent = talents[i % talents.length]!;
      if ((state.hero.talents[talent.id] ?? 0) < talent.maxRank) {
        state.hero.talents[talent.id] = (state.hero.talents[talent.id] ?? 0) + 1;
      }
    }
  }
  for (const slot of SLOTS) {
    if (slot === "tool") continue;
    const item = generateEquipment(ctx, {
      ilvl: spec.level,
      rarity: spec.rarity ?? "magic",
      slot,
      classId: state.hero.classId,
    });
    item.identified = true;
    state.hero.equipment[slot] = item;
  }
  state.hero.health = computeStats(state, spec.content).maxHealth;
  state.rng = ctx.rng.state();
  return state;
}

export interface FightReport {
  winRate: number;
  avgTurns: number;
  avgHealthLeft: number;
}

/** Fight `count` hunts at full health, auto-combat then plain attacks, no potions. */
export function measureHunts(
  hero: GameState,
  difficulty: DifficultyId,
  count: number,
  content: Content,
  now: number,
): FightReport {
  let wins = 0;
  let turns = 0;
  let healthLeft = 0;
  let state = hero;
  for (let i = 0; i < count; i++) {
    const max = computeStats(hero, content).maxHealth;
    // Same hero every fight (no level-ups in between), but the dice keep rolling.
    state = {
      ...hero,
      rng: state.rng,
      nextUid: state.nextUid,
      hero: { ...hero.hero, health: max, energy: 99 },
      quests: [],
    };
    state = apply(state, { type: "hunt.start", difficulty }, { now, content }).state;
    let fightTurns = 0;
    for (let round = 0; round < 200 && state.combat; round++) {
      const action =
        state.combat.hero.hp < state.combat.hero.maxHp * 0.3 ? "combat.attack" : "combat.auto";
      const result = apply(state, { type: action }, { now, content });
      // Hero attack attempts = landed hits + enemy dodges.
      fightTurns += result.events.filter(
        (e) =>
          (e.type === "hit" && e.by === "hero" && !e.extra) ||
          (e.type === "dodge" && e.by === "enemy"),
      ).length;
      if (!result.state.combat) {
        if (result.events.some((e) => e.type === "victory")) {
          wins += 1;
          healthLeft += result.state.hero.health / max;
        }
      }
      state = result.state;
    }
    turns += fightTurns;
  }
  return {
    winRate: wins / count,
    avgTurns: turns / count,
    avgHealthLeft: wins ? healthLeft / wins : 0,
  };
}
