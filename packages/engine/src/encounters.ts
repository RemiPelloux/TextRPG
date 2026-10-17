/** Starting fights (hunts, weekly boss) and resolving their outcome: rewards, loot, quests, death. */
import type { DifficultyId } from "@textrpg/content";

import { autoFight, type CombatMove, type CombatOutcome, combatMove, startCombat } from "./combat";
import type { Ctx } from "./ctx";
import { spawnBoss, spawnEnemy } from "./enemies";
import { grantExp } from "./leveling";
import { rollLoot } from "./loot";
import { onKill } from "./quests";
import { computeStats } from "./stats";
import { isBloodMoon, weekIndex } from "./time";
import type { Combat } from "./types";

export const WEEKLY_BOSS = "blood_moon_wyrm";
export const WEEKLY_ENERGY = 5;

export function assertIdle(ctx: Ctx): void {
  if (ctx.state.combat) ctx.fail("inCombat");
  if (ctx.state.dungeon) ctx.fail("inDungeon");
  if (ctx.state.fishing) ctx.fail("fishing");
}

export function spendEnergy(ctx: Ctx, amount: number): void {
  if (ctx.hero.energy < amount) ctx.fail("notEnoughEnergy", { needed: amount });
  ctx.hero.energy -= amount;
  ctx.emit({ type: "energySpent", amount });
}

export function startHunt(ctx: Ctx, difficultyId: DifficultyId): void {
  assertIdle(ctx);
  const difficulty = ctx.content.difficulties.get(difficultyId);
  if (!difficulty) ctx.fail("unknownDifficulty");
  spendEnergy(ctx, difficulty.energy);
  const level = Math.max(1, ctx.hero.level + difficulty.levelOffset);
  const bloodMoon = isBloodMoon(ctx.state.time.day);
  const enemy = spawnEnemy(ctx, level, difficulty, { elite: ctx.rng.chance(difficulty.eliteChance), bloodMoon });
  startCombat(ctx, enemy, { type: "hunt", difficulty: difficultyId, bloodMoon });
}

export function weeklyAvailable(ctx: { state: Ctx["state"] }): boolean {
  return ctx.state.time.weeklyBossWeek !== weekIndex(ctx.state.time.day);
}

export function startWeekly(ctx: Ctx): void {
  assertIdle(ctx);
  if (!weeklyAvailable(ctx)) ctx.fail("weeklyDone");
  if (ctx.hero.level < 5) ctx.fail("levelTooLow", { level: 5 });
  spendEnergy(ctx, WEEKLY_ENERGY);
  ctx.state.time.weeklyBossWeek = weekIndex(ctx.state.time.day);
  const boss = ctx.content.bosses.get(WEEKLY_BOSS)!;
  startCombat(ctx, spawnBoss(ctx, boss, ctx.hero.level + 1, ctx.content.difficulties.get("normal")!), { type: "weekly" });
}

/** Experience and gold for a kill, before bonuses. */
export function killRewards(level: number, expMult: number, goldMult: number, tier: "normal" | "elite" | "boss") {
  const tierExp = tier === "boss" ? 6 : tier === "elite" ? 2.5 : 1;
  const tierGold = tier === "boss" ? 5 : tier === "elite" ? 2 : 1;
  return {
    exp: Math.round((12 + 7 * level) * expMult * tierExp),
    gold: (3 + 2 * level) * goldMult * tierGold,
  };
}

function decrementBuffs(ctx: Ctx): void {
  for (const buff of ctx.hero.buffs) buff.fights -= 1;
  ctx.hero.buffs = ctx.hero.buffs.filter((b) => b.fights > 0);
}

function rewardKill(ctx: Ctx, combat: Combat): void {
  const { info } = combat.enemy;
  const counters = ctx.state.counters;
  const tier = info.bossId ? "boss" : info.elite ? "elite" : "normal";
  const context = combat.context;
  const stats = computeStats(ctx.state, ctx.content);

  let expMult = 1;
  let goldMult = 1;
  let table = ctx.content.difficulties.get("normal")!;
  if (context.type === "hunt") table = ctx.content.difficulties.get(context.difficulty)!;
  if (context.type === "dungeon" || context.type === "weekly") table = ctx.content.difficulties.get("hard")!;
  expMult = table.expMult;
  goldMult = table.goldMult;
  const bloodMoon = context.type === "hunt" && context.bloodMoon;
  if (bloodMoon) goldMult *= 2;

  const base = killRewards(info.level, expMult, goldMult, tier);
  const gold = Math.round(base.gold * ctx.rng.float(0.8, 1.2) * (1 + stats.goldFind / 100));
  const shards = tier === "boss" ? (context.type === "weekly" ? 25 : 10) : tier === "elite" ? 2 : 0;

  counters.kills += 1;
  if (tier === "elite") counters.elitesKilled += 1;
  if (tier === "boss") counters.bossesKilled += 1;
  if (context.type === "hunt" && context.difficulty === "hell") counters.hellWins += 1;
  if (combat.hero.hp <= combat.hero.maxHp * 0.05) counters.closeCalls += 1;
  ctx.state.codex.kills[info.kindId] = (ctx.state.codex.kills[info.kindId] ?? 0) + 1;
  if (info.kindId === "orc") ctx.state.time.orcsToday += 1;

  if (context.type === "dungeon" && ctx.state.dungeon) {
    ctx.state.dungeon.stashGold += gold;
    ctx.state.dungeon.stashShards += shards;
  } else {
    ctx.hero.gold += gold;
    ctx.hero.shards += shards;
    counters.goldEarned += gold;
  }
  if (combat.hero.powers.includes("soul_harvest")) {
    const healed = Math.min(combat.hero.maxHp - combat.hero.hp, Math.round(combat.hero.maxHp * 0.15));
    if (healed > 0) {
      combat.hero.hp += healed;
      ctx.emit({ type: "heal", target: "hero", amount: healed, source: "soulHarvest" });
    }
  }
  ctx.hero.health = combat.hero.hp;
  const exp = grantExp(ctx, base.exp);
  ctx.emit({ type: "victory", exp, gold, shards });

  onKill(ctx, info.kindId, {
    ...(info.bossId ? { bossId: info.bossId } : {}),
    ...(context.type === "hunt" ? { hunt: context.difficulty } : {}),
  });

  rollLoot(ctx, {
    ilvl: info.level,
    table: { ...table.rarity, dropChance: table.dropChance },
    kindId: info.kindId,
    elite: tier === "elite",
    boss: tier === "boss",
    bloodMoon,
    into: context.type === "dungeon" ? "stash" : "bag",
    ...(context.type === "dungeon" ? { dungeonFloor: context.floor } : {}),
    ...(context.type === "weekly" ? { guaranteedRarity: ctx.rng.chance(0.5) ? "legendary" : "rare" } : {}),
  });
}

export type CombatHooks = {
  onDungeonVictory: (ctx: Ctx, combat: Combat) => void;
  onDungeonDefeat: (ctx: Ctx) => void;
  onChallengeEnd: (ctx: Ctx, combat: Combat, outcome: CombatOutcome) => void;
};

/** Apply the consequences of a finished fight. */
export function resolveCombat(ctx: Ctx, outcome: CombatOutcome, hooks: CombatHooks): void {
  const combat = ctx.state.combat;
  if (!combat || outcome === "ongoing") return;
  ctx.state.combat = null;

  if (combat.context.type === "challenge") {
    hooks.onChallengeEnd(ctx, combat, outcome);
    return;
  }
  decrementBuffs(ctx);
  if (outcome === "victory") {
    rewardKill(ctx, combat);
    if (combat.context.type === "dungeon") hooks.onDungeonVictory(ctx, combat);
    return;
  }
  if (outcome === "fled") {
    ctx.hero.health = combat.hero.hp;
    return;
  }
  // Defeat: back to camp, bruised and a little poorer. Never permanent death.
  const goldLost = Math.floor(ctx.hero.gold * 0.1);
  ctx.hero.gold -= goldLost;
  ctx.hero.health = Math.max(1, Math.round(combat.hero.maxHp * 0.1));
  const inDungeon = combat.context.type === "dungeon";
  ctx.emit({ type: "defeat", goldLost, stashLost: inDungeon });
  if (inDungeon) hooks.onDungeonDefeat(ctx);
}

export function playCombat(ctx: Ctx, move: CombatMove | "auto", hooks: CombatHooks): void {
  const outcome = move === "auto" ? autoFight(ctx) : combatMove(ctx, move);
  resolveCombat(ctx, outcome, hooks);
}
