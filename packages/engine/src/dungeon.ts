/**
 * The Depths: floors of rooms behind doors. Loot found down there sits in a stash that is only
 * yours once you climb back out; die, and the stash is lost (experience is kept).
 */
import type { Boss } from "@textrpg/content";

import { startCombat } from "./combat";
import type { Ctx } from "./ctx";
import { spawnBoss, spawnEnemy } from "./enemies";
import { assertIdle, spendEnergy } from "./encounters";
import { addToBag } from "./items";
import { generateEquipment, rollRarity } from "./loot";
import { computeStats } from "./stats";
import type { Combat, DungeonRun, RoomType } from "./types";

export const DUNGEON_ENERGY = 6;
export const STEPS_PER_FLOOR = 5;
export const BOSS_EVERY = 5;

const ROOM_WEIGHTS: [RoomType, number][] = [
  ["fight", 42],
  ["elite", 10],
  ["treasure", 12],
  ["trap", 10],
  ["event", 16],
  ["campfire", 10],
];

const BOSS_ROTATION = ["goblin_king", "hollow_king", "bone_colossus", "ancient_dragon"];

export function bossForFloor(ctx: Ctx, floor: number): Boss {
  const index = (Math.floor(floor / BOSS_EVERY) - 1) % BOSS_ROTATION.length;
  return ctx.content.bosses.get(BOSS_ROTATION[index]!)!;
}

export function enemyLevelForFloor(heroLevel: number, floor: number): number {
  return Math.max(floor, heroLevel - 2);
}

function rollDoors(ctx: Ctx): RoomType[] {
  const pick = () => ctx.rng.weighted(ROOM_WEIGHTS, ([, w]) => w)[0];
  return [pick(), pick()];
}

function run(ctx: Ctx): DungeonRun {
  const dungeon = ctx.state.dungeon;
  if (!dungeon) ctx.fail("notInDungeon");
  return dungeon;
}

function reachFloor(ctx: Ctx, floor: number): void {
  ctx.state.counters.deepestFloor = Math.max(ctx.state.counters.deepestFloor, floor);
}

export function enterDungeon(ctx: Ctx): void {
  assertIdle(ctx);
  spendEnergy(ctx, DUNGEON_ENERGY);
  const floor = ctx.state.time.dungeonCheckpoint;
  ctx.state.dungeon = {
    floor,
    step: 0,
    doors: rollDoors(ctx),
    stash: [],
    stashGold: 0,
    stashShards: 0,
    atStairs: false,
  };
  reachFloor(ctx, floor);
}

function advance(ctx: Ctx): void {
  const dungeon = run(ctx);
  dungeon.step += 1;
  delete dungeon.pendingEvent;
  if (dungeon.step >= STEPS_PER_FLOOR - 1) {
    if (dungeon.floor % BOSS_EVERY === 0 && dungeon.step === STEPS_PER_FLOOR - 1) {
      dungeon.doors = ["boss"];
      return;
    }
    dungeon.atStairs = true;
    dungeon.doors = [];
    ctx.emit({ type: "stairs", floor: dungeon.floor });
    return;
  }
  dungeon.doors = rollDoors(ctx);
}

function dungeonDifficulty(ctx: Ctx, floor: number) {
  const normal = ctx.content.difficulties.get("normal")!;
  const scale = 1 + floor * 0.015;
  return { ...normal, mods: { hp: scale, atk: scale, def: scale, spd: 1 } };
}

export function openDoor(ctx: Ctx, index: number): void {
  const dungeon = run(ctx);
  if (ctx.state.combat) ctx.fail("inCombat");
  if (dungeon.pendingEvent) ctx.fail("eventPending");
  if (dungeon.atStairs) ctx.fail("atStairs");
  const room = dungeon.doors[index];
  if (!room) ctx.fail("unknownDoor");
  ctx.emit({ type: "dungeonRoom", room, floor: dungeon.floor, step: dungeon.step });

  const level = enemyLevelForFloor(ctx.hero.level, dungeon.floor);
  const stats = computeStats(ctx.state, ctx.content);
  switch (room) {
    case "fight":
    case "elite": {
      const enemy = spawnEnemy(ctx, level, dungeonDifficulty(ctx, dungeon.floor), { elite: room === "elite" });
      startCombat(ctx, enemy, { type: "dungeon", floor: dungeon.floor, boss: false });
      return;
    }
    case "boss": {
      const boss = spawnBoss(ctx, bossForFloor(ctx, dungeon.floor), level + 1, dungeonDifficulty(ctx, dungeon.floor));
      startCombat(ctx, boss, { type: "dungeon", floor: dungeon.floor, boss: true });
      return;
    }
    case "treasure": {
      const rarity = rollRarity(ctx, { magic: 0.55, rare: 0.22, legendary: 0.025 }, stats.magicFind, level);
      const item = generateEquipment(ctx, { ilvl: level, rarity, classId: ctx.hero.classId });
      dungeon.stash.push(item);
      dungeon.stashGold += Math.round((10 + 6 * dungeon.floor) * ctx.rng.float(0.8, 1.4));
      ctx.emit({ type: "treasure" });
      ctx.emit({ type: "loot", item });
      break;
    }
    case "trap": {
      const dodged = ctx.rng.chance(Math.min(0.6, stats.speed * 0.02 + stats.dodge / 100));
      const damage = dodged ? 0 : Math.round(stats.maxHealth * ctx.rng.float(0.1, 0.25));
      ctx.hero.health = Math.max(1, ctx.hero.health - damage);
      ctx.emit({ type: "trap", damage, dodged });
      break;
    }
    case "campfire": {
      const heal = Math.min(stats.maxHealth - ctx.hero.health, Math.round(stats.maxHealth * 0.35));
      ctx.hero.health += heal;
      ctx.emit({ type: "campfire", heal });
      break;
    }
    case "event": {
      const event = ctx.rng.pick(ctx.content.events);
      dungeon.pendingEvent = event.id;
      ctx.emit({ type: "dungeonEvent", eventId: event.id });
      return;
    }
    case "stairs":
      break;
  }
  advance(ctx);
}

export function chooseEvent(ctx: Ctx, choiceIndex: number): void {
  const dungeon = run(ctx);
  const event = ctx.content.events.find((e) => e.id === dungeon.pendingEvent);
  if (!event) ctx.fail("noEvent");
  const choice = event.choices[choiceIndex];
  if (!choice) ctx.fail("unknownChoice");
  const outcomeIndex = choice.outcomes.indexOf(ctx.rng.weighted(choice.outcomes, (o) => o.weight));
  const outcome = choice.outcomes[outcomeIndex]!;
  const stats = computeStats(ctx.state, ctx.content);
  const scale = 1 + dungeon.floor * 0.2;
  if (outcome.healPct) ctx.hero.health = Math.min(stats.maxHealth, ctx.hero.health + Math.round(stats.maxHealth * outcome.healPct));
  if (outcome.damagePct) ctx.hero.health = Math.max(1, ctx.hero.health - Math.round(stats.maxHealth * outcome.damagePct));
  if (outcome.gold) dungeon.stashGold += Math.round(outcome.gold * scale);
  if (outcome.shards) dungeon.stashShards += outcome.shards;
  if (outcome.energy) ctx.hero.energy = Math.min(stats.maxEnergy, ctx.hero.energy + outcome.energy);
  if (outcome.buff) ctx.hero.buffs.push({ sourceId: `event:${event.id}`, ...outcome.buff });
  ctx.emit({ type: "dungeonOutcome", eventId: event.id, choice: choiceIndex, outcome: outcomeIndex });
  if (outcome.rarity) {
    const item = generateEquipment(ctx, {
      ilvl: enemyLevelForFloor(ctx.hero.level, dungeon.floor),
      rarity: outcome.rarity,
      classId: ctx.hero.classId,
    });
    dungeon.stash.push(item);
    ctx.emit({ type: "loot", item });
  }
  advance(ctx);
}

export function onDungeonVictory(ctx: Ctx, combat: Combat): void {
  const dungeon = ctx.state.dungeon;
  if (!dungeon || combat.context.type !== "dungeon") return;
  if (combat.context.boss) {
    // A slain guardian opens a shortcut: next runs start below it.
    ctx.state.time.dungeonCheckpoint = Math.max(ctx.state.time.dungeonCheckpoint, dungeon.floor + 1);
    dungeon.atStairs = true;
    dungeon.doors = [];
    ctx.emit({ type: "stairs", floor: dungeon.floor });
    return;
  }
  advance(ctx);
}

export function onDungeonDefeat(ctx: Ctx): void {
  ctx.state.dungeon = null;
}

export function descend(ctx: Ctx): void {
  const dungeon = run(ctx);
  if (!dungeon.atStairs) ctx.fail("notAtStairs");
  dungeon.floor += 1;
  dungeon.step = 0;
  dungeon.atStairs = false;
  dungeon.doors = rollDoors(ctx);
  reachFloor(ctx, dungeon.floor);
}

export function leaveDungeon(ctx: Ctx): void {
  const dungeon = run(ctx);
  if (ctx.state.combat) ctx.fail("inCombat");
  if (!dungeon.atStairs) ctx.fail("notAtStairs");
  let kept = 0;
  for (const item of dungeon.stash) {
    if (addToBag(ctx, item)) kept += 1;
    else ctx.emit({ type: "loot", item, lost: true });
  }
  ctx.hero.gold += dungeon.stashGold;
  ctx.hero.shards += dungeon.stashShards;
  ctx.state.counters.goldEarned += dungeon.stashGold;
  ctx.emit({ type: "dungeonLeft", floor: dungeon.floor, items: kept, gold: dungeon.stashGold });
  ctx.state.dungeon = null;
}
