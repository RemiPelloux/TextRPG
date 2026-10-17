/**
 * Experience, level-ups (1 → 20) and Paragon levels beyond.
 * Gains per level come from the original game: fixed health/energy, random attributes, and a
 * luck roll that adds a bonus to every attribute.
 */
import type { Ctx } from "./ctx";
import { computeStats } from "./stats";
import type { Hero } from "./types";

export const MAX_LEVEL = 20;
export const CLASS_LEVEL = 5;
export const PARAGON_EXP = 7000;

/** The first levels come fast: the class (level 5) should unlock on the first day. */
const FIRST_STEPS = [60, 130, 230, 360];

export function expToNext(level: number): number {
  if (level >= MAX_LEVEL) return PARAGON_EXP;
  return FIRST_STEPS[level - 1] ?? Math.round(100 * Math.pow(level, 1.5));
}

export function talentPoints(hero: Hero): number {
  const earned = Math.max(0, hero.level - (CLASS_LEVEL - 1));
  const spent = Object.values(hero.talents).reduce((a, b) => a + b, 0);
  return earned - spent;
}

export function paragonPoints(hero: Hero): number {
  const spent = Object.values(hero.paragonPoints).reduce((a, b) => a + (b ?? 0), 0);
  return hero.paragon - spent;
}

function levelUp(ctx: Ctx): void {
  const hero = ctx.hero;
  const rng = ctx.rng;
  const gains = {
    maxHealth: 10,
    maxEnergy: 1,
    strength: rng.int(1, 3),
    defense: rng.int(1, 3),
    speed: rng.int(1, 2),
    luck: rng.int(-1, 4),
  };
  // Luck is a percentage chance of a bonus on every attribute.
  if (rng.int(1, 100) <= hero.base.luck) {
    const bonus = rng.int(1, 2);
    gains.strength += bonus;
    gains.defense += bonus;
    gains.speed += bonus;
    gains.luck += bonus;
  }
  for (const [key, value] of Object.entries(gains) as [keyof Hero["base"], number][]) {
    hero.base[key] += value;
  }
  hero.level += 1;
  // A level-up is a celebration: full health and energy.
  const stats = computeStats(ctx.state, ctx.content);
  hero.health = stats.maxHealth;
  hero.energy = Math.max(hero.energy, stats.maxEnergy);
  ctx.state.counters.level = hero.level;
  ctx.emit({ type: "levelUp", level: hero.level, gains });
  if (hero.level === CLASS_LEVEL && !hero.classId) ctx.emit({ type: "classUnlocked" });
}

/** Grant experience (expBonus applied here) and resolve every level or paragon gained. */
export function grantExp(ctx: Ctx, amount: number): number {
  const hero = ctx.hero;
  const bonus = computeStats(ctx.state, ctx.content).expBonus;
  const total = Math.round(amount * (1 + bonus / 100));
  hero.exp += total;
  while (hero.exp >= expToNext(hero.level)) {
    hero.exp -= expToNext(hero.level);
    if (hero.level < MAX_LEVEL) {
      levelUp(ctx);
    } else {
      hero.paragon += 1;
      ctx.state.counters.paragon = hero.paragon;
      ctx.emit({ type: "paragonUp", paragon: hero.paragon });
    }
  }
  return total;
}
