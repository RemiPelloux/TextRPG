/**
 * Soak test: a random player hammers the engine with thousands of actions across days.
 * Rule violations (GameError) are fine; anything else, or a broken invariant, is a bug.
 */
import type { Slot } from "@textrpg/content";
import { describe, expect, it } from "vitest";

import { type Action, computeStats, GameError, type GameState, Rng } from "../src";
import { bagCapacity } from "../src/items";
import { act, content, newGame, NOON } from "./helpers";

function candidates(state: GameState, rng: Rng): Action[] {
  const hero = state.hero;
  const pickUid = () => (hero.bag.length ? rng.pick(hero.bag).uid : "none");
  const equipped = Object.keys(hero.equipment) as Slot[];
  if (state.combat) {
    return [
      { type: "combat.attack" },
      { type: "combat.auto" },
      { type: "combat.guard" },
      { type: "combat.potion" },
      { type: "combat.flee" },
      { type: "combat.skill", skillId: rng.pick([...content.skills.keys()]) },
    ];
  }
  if (state.fishing)
    return [{ type: "fish.reel", move: rng.pick(["pull", "steady", "slack"] as const) }];
  if (state.dungeon) {
    return [
      { type: "dungeon.door", index: rng.int(0, 1) },
      { type: "dungeon.choice", index: rng.int(0, 2) },
      { type: "dungeon.descend" },
      { type: "dungeon.leave" },
      { type: "item.use", uid: pickUid() },
    ];
  }
  return [
    {
      type: "hunt.start",
      difficulty: rng.pick(["easy", "easy", "normal", "hard", "hell"] as const),
    },
    { type: "rest" },
    { type: "dungeon.enter" },
    { type: "weekly.start" },
    { type: "challenge.start" },
    { type: "challenge.next" },
    { type: "fish.cast" },
    { type: "item.equip", uid: pickUid() },
    { type: "item.use", uid: pickUid() },
    { type: "item.sell", uid: pickUid() },
    { type: "item.identify", uid: pickUid() },
    { type: "item.identifyAll" },
    { type: "item.sellJunk" },
    { type: "item.lock", uid: pickUid() },
    { type: "forge.upgrade", uid: pickUid() },
    { type: "forge.salvage", uid: pickUid() },
    { type: "forge.reroll", uid: pickUid(), affixIndex: rng.int(0, 3) },
    { type: "alchemy.brew", recipeId: rng.pick(["super_potion", "elixir_vigor", "mega_potion"]) },
    {
      type: "building.upgrade",
      buildingId: rng.pick(["forge", "satchel", "market", "alchemist"] as const),
    },
    {
      type: "market.buy",
      offerUid: state.market.offers.length ? rng.pick(state.market.offers).uid : "none",
    },
    {
      type: "market.buyStock",
      itemId: rng.pick(["potion", "fish_bait", "fishing_rod", "identify_scroll"]),
    },
    { type: "quest.accept", uid: state.board.offers[0]?.uid ?? "none" },
    { type: "quest.turnIn", uid: state.quests.length ? rng.pick(state.quests).uid : "none" },
    { type: "class.choose", classId: rng.pick(["warrior", "ranger", "occultist"] as const) },
    { type: "talent.learn", talentId: rng.pick(["w_toughness", "r_precision", "o_hunger"]) },
    { type: "paragon.spend", stat: "maxHealth" },
    { type: "cube.transmute", uids: [pickUid(), pickUid(), pickUid()] },
    { type: "cube.enchant", uid: pickUid() },
    { type: "cube.enchantPick", index: rng.int(0, 3) },
    { type: "cube.infuse", uid: pickUid(), donorUid: pickUid() },
    { type: "cube.reforge", uid: pickUid() },
    { type: "cube.extract", uid: pickUid() },
    {
      type: "cube.slot",
      slot: rng.int(0, 2),
      key: state.cube.powers.length ? rng.pick(state.cube.powers).key : null,
    },
    { type: "torment.set", level: rng.int(0, 3) },
    ...(equipped.length ? [{ type: "item.unequip", slot: rng.pick(equipped) } as Action] : []),
  ];
}

function checkInvariants(state: GameState): void {
  const stats = computeStats(state, content);
  const hero = state.hero;
  expect(hero.health).toBeGreaterThanOrEqual(0);
  expect(hero.health).toBeLessThanOrEqual(stats.maxHealth);
  expect(hero.energy).toBeGreaterThanOrEqual(0);
  expect(hero.gold).toBeGreaterThanOrEqual(0);
  expect(hero.shards).toBeGreaterThanOrEqual(0);
  expect(hero.bag.length).toBeLessThanOrEqual(bagCapacity(state, content));
  expect(hero.bag.every((i) => i.quantity > 0)).toBe(true);
  const uids = [...hero.bag, ...Object.values(hero.equipment)].map((i) => i!.uid);
  expect(new Set(uids).size).toBe(uids.length);
  if (state.combat) {
    expect(state.combat.hero.hp).toBeLessThanOrEqual(state.combat.hero.maxHp);
    expect(state.combat.enemy.hp).toBeGreaterThan(0);
  }
  expect(hero.level).toBeLessThanOrEqual(20);
  expect(hero.torment).toBeGreaterThanOrEqual(0);
  expect(state.mercy).toBeLessThanOrEqual(3);
  const powers = new Set(state.cube.powers.map((p) => p.key));
  expect(powers.size).toBe(state.cube.powers.length);
  const slotted = state.cube.slots.filter((k): k is string => k !== null);
  expect(slotted.every((k) => powers.has(k))).toBe(true);
  expect(new Set(slotted).size).toBe(slotted.length);
  if (state.cube.offer) expect(state.cube.offer.options.length).toBe(3);
}

describe("soak", () => {
  it.each(["alpha", "beta", "gamma", "delta"])("survives 2500 random actions (seed %s)", (seed) => {
    const rng = Rng.fromSeed(`soak-${seed}`);
    let state = newGame(seed);
    // A rich, experienced hero exercises more systems (classes, forge, buildings, dungeons).
    state.hero.gold = 5000;
    state.hero.shards = 300;
    let now = NOON;
    let gameErrors = 0;
    for (let step = 0; step < 2500; step++) {
      now += rng.int(0, 30) * 60_000; // time passes: regeneration, new days, blood moons
      const action = rng.pick(candidates(state, rng));
      try {
        state = act(state, action, now).state;
      } catch (error) {
        if (!(error instanceof GameError))
          throw new Error(`step ${step} ${JSON.stringify(action)}: ${String(error)}`, {
            cause: error,
          });
        gameErrors += 1;
      }
      checkInvariants(state);
    }
    expect(gameErrors).toBeLessThan(2500);
    expect(state.counters.kills).toBeGreaterThan(10);
  });
});
