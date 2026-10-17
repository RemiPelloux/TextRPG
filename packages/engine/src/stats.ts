/** Derived statistics: base attributes + gear + sets + class + talents + paragon + buffs. */
import { type Content, type PowerId, STAT_KEYS, type StatKey } from "@textrpg/content";

import {
  PARAGON_STATS,
  type GameState,
  type Item,
  type ParagonStat,
  type Proc,
  type StatBag,
  type Stats,
} from "./types";

export const PARAGON_PER_POINT: Record<ParagonStat, number> = {
  maxHealth: 6,
  damagePct: 1,
  critChance: 0.5,
  defense: 1,
  magicFind: 2,
  goldFind: 3,
};

/** Upgrades add 10% per level to every stat of the item. */
export const UPGRADE_BONUS = 0.1;

export function emptyStats(): Stats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Stats;
}

function add(target: StatBag | Stats, bag: StatBag, factor = 1): void {
  for (const [key, value] of Object.entries(bag) as [StatKey, number][]) {
    target[key] = (target[key] ?? 0) + value * factor;
  }
}

const affixStatCache = new WeakMap<Content, Map<string, StatKey>>();
function affixStats(content: Content): Map<string, StatKey> {
  let map = affixStatCache.get(content);
  if (!map) {
    map = new Map(content.affixes.map((a) => [a.id, a.stat]));
    affixStatCache.set(content, map);
  }
  return map;
}

/** All stats an item grants. Unidentified items only grant their implicit stats. */
export function itemStats(item: Item, content: Content): StatBag {
  const total: StatBag = {};
  add(total, item.implicit);
  if (item.identified) {
    add(total, item.fixed);
    const stats = affixStats(content);
    for (const affix of [...item.affixes, ...(item.enchant?.affix ? [item.enchant.affix] : [])]) {
      const stat = stats.get(affix.id);
      if (stat) total[stat] = (total[stat] ?? 0) + affix.value;
    }
  }
  const factor = 1 + UPGRADE_BONUS * item.upgrade;
  for (const key of Object.keys(total) as StatKey[]) {
    total[key] = Math.round(total[key]! * factor * 10) / 10;
  }
  return total;
}

export function equippedSetCounts(state: GameState, content: Content): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of Object.values(state.hero.equipment)) {
    if (!item?.setPieceId || !item.identified) continue;
    const entry = content.setPieces.get(item.setPieceId);
    if (entry) counts.set(entry.set.id, (counts.get(entry.set.id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Sigils worn: how many pieces of each, and the "set level" (lowest item level among them),
 * which scales the bonuses. Unidentified items don't count.
 */
export function sigilCounts(state: GameState): Map<string, { count: number; level: number }> {
  const counts = new Map<string, { count: number; level: number }>();
  for (const item of Object.values(state.hero.equipment)) {
    if (!item?.sigil || !item.identified) continue;
    const entry = counts.get(item.sigil) ?? { count: 0, level: Infinity };
    entry.count += 1;
    entry.level = Math.min(entry.level, item.ilvl);
    counts.set(item.sigil, entry);
  }
  return counts;
}

function scaled([base, perLevel]: [number, number], level: number): number {
  return Math.round((base + perLevel * level) * 10) / 10;
}

/** Stats granted by active sigil bonuses. */
export function sigilStats(state: GameState, content: Content): StatBag {
  const out: StatBag = {};
  for (const [id, { count, level }] of sigilCounts(state)) {
    const sigil = content.sigils.get(id);
    for (const bonus of sigil?.bonuses ?? []) {
      if (count < bonus.pieces || !bonus.stats) continue;
      for (const [stat, value] of Object.entries(bonus.stats) as [StatKey, [number, number]][]) {
        out[stat] = (out[stat] ?? 0) + scaled(value, level);
      }
    }
  }
  return out;
}

/** Every generated power active right now: items, enchantments, sigil bonuses, cube slots. */
export function activeProcs(state: GameState, content: Content): Proc[] {
  const procs: Proc[] = [];
  for (const item of Object.values(state.hero.equipment)) {
    if (!item?.identified) continue;
    procs.push(...(item.procs ?? []));
    if (item.enchant?.proc) procs.push(item.enchant.proc);
  }
  for (const [id, { count, level }] of sigilCounts(state)) {
    for (const bonus of content.sigils.get(id)?.bonuses ?? []) {
      if (count < bonus.pieces || !bonus.proc) continue;
      const { template, chance, value, turns, every } = bonus.proc;
      procs.push({
        t: template,
        chance,
        value: scaled(value, level),
        ...(turns ? { turns } : {}),
        ...(every ? { every } : {}),
      });
    }
  }
  for (const power of cubeSlotted(state)) procs.push(...(power.procs ?? []));
  return procs;
}

/** Cube powers currently placed in an unlocked slot. */
export function cubeSlotted(state: GameState) {
  const unlocked = CUBE_SLOT_LEVELS.filter((level) => state.hero.level >= level).length;
  return state.cube.slots
    .slice(0, unlocked)
    .map((key) => state.cube.powers.find((p) => p.key === key))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

/** Hero level needed to open each cube slot. */
export const CUBE_SLOT_LEVELS = [1, 10, 20];

/** Powers granted by equipped legendaries, active set bonuses and the cube. */
export function activePowers(state: GameState, content: Content): PowerId[] {
  const powers = new Set<PowerId>();
  for (const power of cubeSlotted(state)) {
    const legendary = power.legendaryId ? content.legendaries.get(power.legendaryId) : undefined;
    if (legendary) powers.add(legendary.power);
  }
  for (const item of Object.values(state.hero.equipment)) {
    if (item?.legendaryId && item.identified) {
      const legendary = content.legendaries.get(item.legendaryId);
      if (legendary) powers.add(legendary.power);
    }
  }
  for (const [setId, count] of equippedSetCounts(state, content)) {
    for (const bonus of content.sets.get(setId)!.bonuses) {
      if (count >= bonus.pieces && bonus.power) powers.add(bonus.power);
    }
  }
  return [...powers];
}

export function computeStats(state: GameState, content: Content): Stats {
  const hero = state.hero;
  const stats = emptyStats();
  add(stats, hero.base);

  for (const item of Object.values(hero.equipment)) {
    if (item) add(stats, itemStats(item, content));
  }
  for (const [setId, count] of equippedSetCounts(state, content)) {
    for (const bonus of content.sets.get(setId)!.bonuses) {
      if (count >= bonus.pieces && bonus.stats) add(stats, bonus.stats);
    }
  }
  add(stats, sigilStats(state, content));
  if (hero.classId) {
    const heroClass = content.classes.get(hero.classId)!;
    add(stats, heroClass.passive);
    for (const talent of heroClass.talents) {
      const rank = hero.talents[talent.id] ?? 0;
      if (rank) stats[talent.stat] += talent.perRank * rank;
    }
  }
  for (const stat of PARAGON_STATS) {
    stats[stat] += (hero.paragonPoints[stat] ?? 0) * PARAGON_PER_POINT[stat];
  }
  for (const buff of hero.buffs) stats[buff.stat] += buff.value;

  const powers = activePowers(state, content);
  if (powers.includes("gambler")) stats.goldFind += 100;
  if (powers.includes("vampire_fang")) stats.lifeSteal += 20;
  if (powers.includes("iron_reflect")) stats.thorns += 25;

  for (const key of STAT_KEYS) stats[key] = Math.round(stats[key] * 10) / 10;
  stats.maxHealth = Math.max(1, Math.round(stats.maxHealth));
  stats.maxEnergy = Math.max(1, Math.round(stats.maxEnergy));
  return stats;
}

/** Each generated power or legendary power is worth about this share of total power. */
export const POWER_WEIGHT = 0.04;

/**
 * One number to compare heroes and items: a rough "damage x survivability" score.
 * `powers` counts generated powers (procs) and legendary/set powers: without them, legendaries
 * looked like downgrades next to a well-rolled rare.
 */
export function powerScore(stats: Stats, powers = 0): number {
  const offense =
    (6 + stats.strength * 1.6) *
    (1 + stats.damagePct / 100) *
    (1 + (Math.min(60, critChanceOf(stats)) / 100) * (0.5 + stats.critDamage / 100)) *
    (1 + stats.thorns / 400);
  const defense =
    stats.maxHealth *
    (1 + stats.defense / 40) *
    (1 + Math.min(40, stats.dodge) / 100) *
    (1 + Math.min(30, stats.lifeSteal) / 100);
  return Math.round(Math.sqrt(offense * defense) * 10 * (1 + POWER_WEIGHT * powers));
}

/** Power of the hero as equipped right now, powers included. */
export function heroPower(state: GameState, content: Content): number {
  const powers = activeProcs(state, content).length + activePowers(state, content).length;
  return powerScore(computeStats(state, content), powers);
}

export function critChanceOf(stats: Stats): number {
  return Math.min(60, Math.max(0, stats.luck * 0.75 + stats.critChance));
}
