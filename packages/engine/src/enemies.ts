/** Enemy generation, scaled by level, difficulty, enemy kind, elite modifiers and bosses. */
import type { Boss, Difficulty, EnemyKind } from "@textrpg/content";

import type { Ctx } from "./ctx";
import { emptyStats } from "./stats";
import type { EnemyInfo, Stats } from "./types";

const SYLLABLES = {
  onset: ["gr", "kr", "th", "v", "z", "m", "dr", "sk", "b", "g", "r", "n", "ul", "or", "h"],
  vowel: ["a", "o", "u", "i", "e", "ae", "au", "ia", "or", "ul"],
  coda: ["k", "th", "g", "r", "x", "z", "n", "sh", "", ""],
};

export function generateName(ctx: Ctx, syllables: [number, number] = [2, 3]): string {
  const parts: string[] = [];
  const count = ctx.rng.int(...syllables);
  for (let i = 0; i < count; i++) {
    parts.push(
      ctx.rng.pick(SYLLABLES.onset) + ctx.rng.pick(SYLLABLES.vowel) + ctx.rng.pick(SYLLABLES.coda),
    );
  }
  const name = parts.join("");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export type Mods = { hp: number; atk: number; def: number; spd: number };

/** Base enemy curve. Tuned with tools/simulate against an average-geared hero of the same level. */
export function enemyStats(level: number, ...mods: Mods[]): Stats {
  const m = mods.reduce(
    (acc, mod) => ({
      hp: acc.hp * mod.hp,
      atk: acc.atk * mod.atk,
      def: acc.def * mod.def,
      spd: acc.spd * mod.spd,
    }),
    { hp: 1, atk: 1, def: 1, spd: 1 },
  );
  // Heroes grow faster than linearly (gear tiers, talents): so do enemies.
  const growth = 1 + 0.035 * level;
  // Below level 5 the hero has almost no gear yet: enemies go easier on newcomers.
  const novice = { hp: Math.min(1, 0.7 + 0.06 * level), atk: Math.min(1, 0.55 + 0.09 * level) };
  const stats = emptyStats();
  stats.maxHealth = Math.round((45 + 22 * level) * growth * novice.hp * m.hp);
  stats.strength = Math.round((2.5 + 2 * level) * growth * novice.atk * m.atk * 10) / 10;
  stats.defense = Math.round((1 + 1.3 * level) * (1 + 0.03 * level) * m.def * 10) / 10;
  stats.speed = Math.round((3 + 0.9 * level * (1 + 0.02 * level)) * m.spd * 10) / 10;
  stats.luck = Math.round(1 + level * 0.6);
  return stats;
}

const ELITE_EFFECTS: Record<string, (s: Stats) => void> = {
  swift: (s) => (s.speed *= 1.6),
  vampiric: (s) => (s.lifeSteal += 30),
  enraged: (s) => (s.damagePct += 35),
  armored: (s) => (s.defense *= 1.7),
  venomous: () => {},
  burning: () => {},
};

export interface SpawnedEnemy {
  info: EnemyInfo;
  stats: Stats;
}

export function pickKind(ctx: Ctx, level: number): EnemyKind {
  const kinds = ctx.content.enemyKinds.filter((k) => k.minLevel <= level);
  return ctx.rng.weighted(kinds, (k) => k.weight);
}

export function spawnEnemy(
  ctx: Ctx,
  level: number,
  difficulty: Difficulty,
  opts: { elite?: boolean; kind?: EnemyKind; bloodMoon?: boolean; extra?: Mods[] } = {},
): SpawnedEnemy {
  const kind = opts.kind ?? pickKind(ctx, level);
  const mods: Mods[] = [kind.mods, difficulty.mods];
  if (opts.bloodMoon) mods.push({ hp: 1.25, atk: 1.2, def: 1, spd: 1 });
  if (opts.extra) mods.push(...opts.extra);
  if (opts.elite) mods.push({ hp: 1.6, atk: 1.15, def: 1.1, spd: 1 });
  const stats = enemyStats(level, ...mods);
  const info: EnemyInfo = { proper: generateName(ctx), kindId: kind.id, level, icon: kind.icon };
  if (kind.onHit) info.onHit = kind.onHit;
  if (opts.elite) {
    const elite = ctx.rng.pick(ctx.content.elites);
    info.elite = elite.id;
    ELITE_EFFECTS[elite.id]?.(stats);
    if (elite.id === "venomous") info.onHit = { status: "poison", chance: 0.4, turns: 3 };
    if (elite.id === "burning") info.onHit = { status: "burn", chance: 0.35, turns: 2 };
  }
  return { info, stats };
}

export function spawnBoss(
  ctx: Ctx,
  boss: Boss,
  level: number,
  difficulty: Difficulty,
  extra: Mods[] = [],
): SpawnedEnemy {
  const stats = enemyStats(level, boss.mods, difficulty.mods, ...extra);
  stats.luck += 5;
  const info: EnemyInfo = {
    proper: "",
    kindId: boss.kind,
    bossId: boss.id,
    level,
    icon: boss.icon,
    telegraphEvery: boss.telegraphEvery,
  };
  if (boss.onHit) info.onHit = boss.onHit;
  return { info, stats };
}
