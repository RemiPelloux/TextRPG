/** Derived statistics: base attributes + gear + sets + class + talents + paragon + buffs. */
import { type Content, type PowerId, STAT_KEYS, type StatKey } from "@textrpg/content";

import { PARAGON_STATS, type GameState, type Item, type ParagonStat, type StatBag, type Stats } from "./types";

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
    for (const affix of item.affixes) {
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

/** Powers granted by equipped legendaries and active set bonuses. */
export function activePowers(state: GameState, content: Content): PowerId[] {
  const powers = new Set<PowerId>();
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

/** One number to compare heroes and items: a rough "damage x survivability" score. */
export function powerScore(stats: Stats): number {
  const offense = (6 + stats.strength * 1.6) * (1 + stats.damagePct / 100) *
    (1 + (Math.min(60, critChanceOf(stats)) / 100) * (0.5 + stats.critDamage / 100));
  const defense = stats.maxHealth * (1 + stats.defense / 40) * (1 + Math.min(40, stats.dodge) / 100);
  return Math.round(Math.sqrt(offense * defense) * 10);
}

export function critChanceOf(stats: Stats): number {
  return Math.min(60, Math.max(0, stats.luck * 0.75 + stats.critChance));
}
