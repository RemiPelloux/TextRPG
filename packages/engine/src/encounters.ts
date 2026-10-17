/** Starting fights (hunts, weekly boss) and resolving their outcome: rewards, loot, quests, death. */
import type { DifficultyId } from "@textrpg/content";

import { autoFight, type CombatMove, type CombatOutcome, combatMove, startCombat } from "./combat";
import type { Ctx } from "./ctx";
import { type Mods, spawnBoss, spawnEnemy } from "./enemies";
import { grantExp, MAX_LEVEL } from "./leveling";
import { rollLoot } from "./loot";
import { onKill } from "./quests";
import { computeStats } from "./stats";
import { isBloodMoon, weekIndex } from "./time";
import type { Combat, GameState, Origin } from "./types";

export const WEEKLY_BOSS = "blood_moon_wyrm";
export const WEEKLY_ENERGY = 5;

export function assertIdle(ctx: Ctx): void {
  if (ctx.state.combat) ctx.fail("inCombat");
  if (ctx.state.dungeon) ctx.fail("inDungeon");
  if (ctx.state.fishing) ctx.fail("fishing");
}

/** Torments: endgame difficulty levels unlocked at level 20, one more every 3 Paragon levels. */
export const TORMENT_MAX = 10;

export function maxTorment(state: GameState): number {
  if (state.hero.level < MAX_LEVEL) return 0;
  return Math.min(TORMENT_MAX, 1 + Math.floor(state.hero.paragon / 3));
}

export function tormentMods(torment: number): Mods {
  return {
    hp: 1 + 0.4 * torment,
    atk: 1 + 0.25 * torment,
    def: 1 + 0.15 * torment,
    spd: 1 + 0.03 * torment,
  };
}

/** Rewards multiplier (experience, gold) and loot bonuses of a torment level. */
export function tormentRewards(torment: number) {
  return { mult: 1 + 0.35 * torment, magicFind: 30 * torment, legendary: 1 + 0.3 * torment };
}

/**
 * Mercy: after consecutive defeats, enemies ease off a little until the next win
 * (−8% health and damage per defeat, at most 3). Never during the daily challenge.
 */
export const MAX_MERCY = 3;
export function mercyMods(mercy: number): Mods {
  const f = 1 - 0.08 * Math.min(MAX_MERCY, mercy);
  return { hp: f, atk: f, def: 1, spd: 1 };
}

/** Modifiers applied to every regular fight: torment and mercy. */
export function fightMods(ctx: Ctx): Mods[] {
  const mods: Mods[] = [];
  if (ctx.hero.torment > 0) mods.push(tormentMods(ctx.hero.torment));
  if (ctx.state.mercy > 0) mods.push(mercyMods(ctx.state.mercy));
  return mods;
}

export function setTorment(ctx: Ctx, level: number): void {
  if (!Number.isInteger(level) || level < 0 || level > maxTorment(ctx.state))
    ctx.fail("tormentLocked");
  ctx.hero.torment = level;
  ctx.emit({ type: "tormentSet", level });
}

export function announceMercy(ctx: Ctx): void {
  if (ctx.state.mercy > 0) ctx.emit({ type: "mercy", level: ctx.state.mercy });
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
  const level = Math.max(1, ctx.hero.level + difficulty.levelOffset + ctx.hero.torment);
  const bloodMoon = isBloodMoon(ctx.state.time.day);
  const enemy = spawnEnemy(ctx, level, difficulty, {
    elite: ctx.rng.chance(difficulty.eliteChance),
    bloodMoon,
    extra: fightMods(ctx),
  });
  startCombat(ctx, enemy, { type: "hunt", difficulty: difficultyId, bloodMoon });
  announceMercy(ctx);
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
  startCombat(
    ctx,
    spawnBoss(
      ctx,
      boss,
      ctx.hero.level + 1 + ctx.hero.torment,
      ctx.content.difficulties.get("normal")!,
      fightMods(ctx),
    ),
    { type: "weekly" },
  );
  announceMercy(ctx);
}

/** Experience and gold for a kill, before bonuses. */
export function killRewards(
  level: number,
  expMult: number,
  goldMult: number,
  tier: "normal" | "elite" | "boss",
) {
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

  let table = ctx.content.difficulties.get("normal")!;
  if (context.type === "hunt") table = ctx.content.difficulties.get(context.difficulty)!;
  if (context.type === "dungeon" || context.type === "weekly")
    table = ctx.content.difficulties.get("hard")!;
  const expMult = table.expMult;
  let goldMult = table.goldMult;
  const bloodMoon = context.type === "hunt" && context.bloodMoon;
  if (bloodMoon) goldMult *= 2;

  const torment = tormentRewards(ctx.hero.torment);
  const base = killRewards(info.level, expMult * torment.mult, goldMult * torment.mult, tier);
  const gold = Math.round(base.gold * ctx.rng.float(0.8, 1.2) * (1 + stats.goldFind / 100));
  ctx.state.mercy = 0;
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
    const healed = Math.min(
      combat.hero.maxHp - combat.hero.hp,
      Math.round(combat.hero.maxHp * 0.15),
    );
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

  const origin: Origin = {
    src:
      tier === "boss"
        ? context.type === "weekly"
          ? "weekly"
          : "boss"
        : context.type === "dungeon"
          ? "dungeon"
          : "hunt",
    enemy: {
      proper: info.proper,
      kindId: info.kindId,
      ...(info.bossId ? { bossId: info.bossId } : {}),
    },
    ...(context.type === "dungeon" ? { floor: context.floor } : {}),
    day: ctx.state.time.day,
  };
  rollLoot(ctx, {
    ilvl: info.level,
    table: {
      ...table.rarity,
      legendary: table.rarity.legendary * torment.legendary,
      dropChance: table.dropChance,
    },
    bonusMagicFind: torment.magicFind,
    origin,
    kindId: info.kindId,
    elite: tier === "elite",
    boss: tier === "boss",
    bloodMoon,
    into: context.type === "dungeon" ? "stash" : "bag",
    ...(context.type === "dungeon" ? { dungeonFloor: context.floor } : {}),
    ...(context.type === "weekly"
      ? { guaranteedRarity: ctx.rng.chance(0.5) ? "legendary" : "rare" }
      : {}),
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
  ctx.state.mercy = Math.min(MAX_MERCY, ctx.state.mercy + 1);
  ctx.emit({ type: "defeat", goldLost, stashLost: inDungeon });
  if (inDungeon) hooks.onDungeonDefeat(ctx);
}

export function playCombat(ctx: Ctx, move: CombatMove | "auto", hooks: CombatHooks): void {
  const outcome = move === "auto" ? autoFight(ctx) : combatMove(ctx, move);
  resolveCombat(ctx, outcome, hooks);
}
