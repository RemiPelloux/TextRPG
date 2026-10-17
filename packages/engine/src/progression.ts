/** Rest, classes, talents, Paragon points and achievements. */
import type { ClassId } from "@textrpg/content";

import type { Ctx } from "./ctx";
import { assertIdle } from "./encounters";
import { addToBag } from "./items";
import { CLASS_LEVEL, paragonPoints, talentPoints } from "./leveling";
import { generateEquipment } from "./loot";
import { computeStats } from "./stats";
import { PARAGON_STATS, type ParagonStat } from "./types";

export function canRest(state: Ctx["state"]): boolean {
  return state.time.lastRestDay !== state.time.day;
}

/** Once a day at the campfire: full health and energy. Consecutive days feed the flame. */
export function rest(ctx: Ctx): void {
  assertIdle(ctx);
  if (!canRest(ctx.state)) ctx.fail("alreadyRested");
  const today = ctx.state.time.day;
  const streak = ctx.state.time.lastRestDay === today - 1 ? ctx.state.counters.restStreak + 1 : 1;
  ctx.state.time.lastRestDay = today;
  ctx.state.counters.restStreak = streak;
  const stats = computeStats(ctx.state, ctx.content);
  ctx.hero.health = stats.maxHealth;
  ctx.hero.energy = Math.max(ctx.hero.energy, stats.maxEnergy);
  const shards = Math.min(streak, 7);
  ctx.hero.shards += shards;
  ctx.emit({ type: "rested", streak });
  ctx.emit({ type: "shardsGained", amount: shards, source: "rest" });
}

export function chooseClass(ctx: Ctx, classId: ClassId): void {
  if (ctx.hero.level < CLASS_LEVEL) ctx.fail("levelTooLow", { level: CLASS_LEVEL });
  if (ctx.hero.classId) ctx.fail("classChosen");
  if (!ctx.content.classes.has(classId)) ctx.fail("unknownClass");
  ctx.hero.classId = classId;
  // A gift to start the new path: a magic weapon of the class.
  const weapon = generateEquipment(ctx, {
    ilvl: ctx.hero.level,
    rarity: "magic",
    slot: "weapon",
    classId,
  });
  ctx.emit(
    addToBag(ctx, weapon)
      ? { type: "loot", item: weapon }
      : { type: "loot", item: weapon, lost: true },
  );
}

export function learnTalent(ctx: Ctx, talentId: string): void {
  const heroClass = ctx.hero.classId ? ctx.content.classes.get(ctx.hero.classId) : undefined;
  const talent = heroClass?.talents.find((t) => t.id === talentId);
  if (!talent) ctx.fail("unknownTalent");
  if (talentPoints(ctx.hero) <= 0) ctx.fail("noTalentPoints");
  const rank = ctx.hero.talents[talentId] ?? 0;
  if (rank >= talent.maxRank) ctx.fail("talentMaxed");
  ctx.hero.talents[talentId] = rank + 1;
}

export function talentResetCost(level: number): number {
  return 50 * level;
}

export function resetTalents(ctx: Ctx): void {
  const cost = talentResetCost(ctx.hero.level);
  if (ctx.hero.gold < cost) ctx.fail("notEnoughGold", { cost });
  ctx.hero.gold -= cost;
  ctx.hero.talents = {};
  const stats = computeStats(ctx.state, ctx.content);
  ctx.hero.health = Math.min(ctx.hero.health, stats.maxHealth);
}

export function spendParagon(ctx: Ctx, stat: ParagonStat): void {
  if (!PARAGON_STATS.includes(stat)) ctx.fail("unknownStat");
  if (paragonPoints(ctx.hero) <= 0) ctx.fail("noParagonPoints");
  ctx.hero.paragonPoints[stat] = (ctx.hero.paragonPoints[stat] ?? 0) + 1;
}

export function checkAchievements(ctx: Ctx): void {
  for (const achievement of ctx.content.achievements) {
    if (ctx.state.achievements.includes(achievement.id)) continue;
    if (ctx.state.counters[achievement.counter] < achievement.gte) continue;
    ctx.state.achievements.push(achievement.id);
    ctx.hero.gold += achievement.reward.gold;
    ctx.hero.shards += achievement.reward.shards;
    ctx.emit({ type: "achievement", id: achievement.id });
  }
}
