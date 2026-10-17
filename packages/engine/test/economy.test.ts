import { describe, expect, it } from "vitest";

import { computeStats, sellValue, upgradeCost } from "../src";
import { simpleItem } from "../src/items";
import { generateEquipment } from "../src/loot";
import { act, content, ctxFor, newGame, ofType } from "./helpers";

function withItem(rarity: "common" | "magic" | "rare" | "legendary" = "magic", slot: "weapon" | "armor" = "armor", seed = "eco") {
  const state = newGame();
  const ctx = ctxFor(state, seed);
  const item = generateEquipment(ctx, { ilvl: 1, rarity, slot });
  state.hero.bag.push(item);
  state.nextUid += 100;
  return { state, item };
}

describe("equipment", () => {
  it("equips, swaps and unequips", () => {
    const { state, item } = withItem("common", "weapon");
    const oldWeapon = state.hero.equipment.weapon!.uid;
    const equipped = act(state, { type: "item.equip", uid: item.uid }).state;
    expect(equipped.hero.equipment.weapon!.uid).toBe(item.uid);
    expect(equipped.hero.bag.some((i) => i.uid === oldWeapon)).toBe(true);
    const bare = act(equipped, { type: "item.unequip", slot: "weapon" }).state;
    expect(bare.hero.equipment.weapon).toBeUndefined();
  });

  it("enforces level requirements", () => {
    const state = newGame();
    const ctx = ctxFor(state, "req");
    const item = generateEquipment(ctx, { ilvl: 16, rarity: "common", slot: "weapon" });
    state.hero.bag.push(item);
    expect(() => act(state, { type: "item.equip", uid: item.uid })).toThrow("levelTooLow");
  });
});

describe("consumables", () => {
  it("potions heal outside combat, elixirs grant fight-limited buffs", () => {
    const state = newGame();
    state.hero.health = 20;
    const potion = state.hero.bag.find((i) => i.baseId === "potion")!;
    const healed = act(state, { type: "item.use", uid: potion.uid }).state;
    expect(healed.hero.health).toBe(50);

    const ctx = ctxFor(healed, "elixir");
    const elixir = simpleItem(ctx, "elixir_vigor");
    healed.hero.bag.push(elixir);
    const buffed = act(healed, { type: "item.use", uid: elixir.uid }).state;
    expect(computeStats(buffed, content).maxHealth).toBe(computeStats(healed, content).maxHealth + 25);
    expect(buffed.hero.buffs[0]!.fights).toBe(3);
  });

  it("refuses useless drinks", () => {
    const state = newGame();
    const potion = state.hero.bag.find((i) => i.baseId === "potion")!;
    expect(() => act(state, { type: "item.use", uid: potion.uid })).toThrow("alreadyFull");
  });
});

describe("selling", () => {
  it("sells for gold and protects locked items", () => {
    const { state, item } = withItem();
    const locked = act(state, { type: "item.lock", uid: item.uid }).state;
    expect(() => act(locked, { type: "item.sell", uid: item.uid })).toThrow("cannotSell");
    const sold = act(state, { type: "item.sell", uid: item.uid }).state;
    expect(sold.hero.gold).toBe(state.hero.gold + sellValue(item, content));
  });

  it("sells junk in one go but keeps rares", () => {
    const { state } = withItem("magic");
    const ctx = ctxFor(state, "junk");
    state.hero.bag.push(generateEquipment(ctx, { ilvl: 3, rarity: "common" }), generateEquipment(ctx, { ilvl: 3, rarity: "rare" }));
    const { state: after, events } = act(state, { type: "item.sellJunk" });
    expect(ofType(events, "sold")[0]!.count).toBe(2);
    expect(after.hero.bag.some((i) => i.rarity === "rare")).toBe(true);
    expect(after.hero.bag.some((i) => i.baseId === "potion")).toBe(true);
  });
});

describe("identify", () => {
  it("uses a scroll first, then gold", () => {
    const { state, item } = withItem("rare");
    const ctx = ctxFor(state, "second");
    const second = generateEquipment(ctx, { ilvl: 5, rarity: "rare" });
    state.hero.bag.push(second);
    state.hero.gold = 1000;
    let after = act(state, { type: "item.identify", uid: item.uid }).state;
    expect(after.hero.bag.some((i) => i.baseId === "identify_scroll")).toBe(false);
    expect(after.hero.gold).toBe(1000);
    after = act(after, { type: "item.identify", uid: second.uid }).state;
    expect(after.hero.gold).toBeLessThan(1000);
    expect(after.counters.itemsIdentified).toBe(2);
  });

  it("records legendaries in the codex", () => {
    const state = newGame();
    const ctx = ctxFor(state, "codex");
    const item = generateEquipment(ctx, { ilvl: 20, rarity: "legendary" });
    state.hero.bag.push(item);
    const after = act(state, { type: "item.identify", uid: item.uid }).state;
    expect(after.codex.legendaries).toContain(item.legendaryId);
  });
});

describe("forge", () => {
  it("upgrades up to the forge limit", () => {
    const { state, item } = withItem("magic", "weapon");
    state.hero.gold = 100_000;
    state.hero.shards = 1000;
    let current = state;
    for (let i = 0; i < 3; i++) current = act(current, { type: "forge.upgrade", uid: item.uid }).state;
    expect(current.hero.bag.find((i) => i.uid === item.uid)!.upgrade).toBe(3);
    expect(() => act(current, { type: "forge.upgrade", uid: item.uid })).toThrow("forgeLimit");
  });

  it("costs rise and risk appears after +5", () => {
    const item = { upgrade: 5, ilvl: 10 } as never;
    expect(upgradeCost(item).failChance).toBeGreaterThan(0);
    expect(upgradeCost({ upgrade: 0, ilvl: 10 } as never).failChance).toBe(0);
  });

  it("salvages into shards", () => {
    const { state, item } = withItem("magic");
    const after = act(state, { type: "forge.salvage", uid: item.uid }).state;
    expect(after.hero.shards).toBe(2);
  });

  it("rerolls an affix of a rare item", () => {
    const { state, item } = withItem("rare", "armor", "reroll");
    item.identified = true;
    state.hero.gold = 10_000;
    state.hero.shards = 100;
    const before = JSON.stringify(item.affixes);
    let after = state;
    let changed = false;
    for (let i = 0; i < 5 && !changed; i++) {
      after = act(after, { type: "forge.reroll", uid: item.uid, affixIndex: 0 }).state;
      changed = JSON.stringify(after.hero.bag.find((x) => x.uid === item.uid)!.affixes) !== before;
    }
    expect(changed).toBe(true);
  });
});

describe("camp", () => {
  it("upgrades buildings with gold and shards", () => {
    const state = newGame();
    state.hero.gold = 300;
    const after = act(state, { type: "building.upgrade", buildingId: "satchel" }).state;
    expect(after.hero.buildings.satchel).toBe(1);
    expect(after.hero.gold).toBe(50);
  });

  it("brews potions from fish at the alchemist", () => {
    const state = newGame();
    state.hero.buildings.alchemist = 1;
    state.hero.shards = 10;
    const ctx = ctxFor(state, "brew");
    const fish = content.fish.find((f) => f.rarity === "common")!;
    state.hero.bag.push(simpleItem(ctx, fish.id, 2));
    const after = act(state, { type: "alchemy.brew", recipeId: "super_potion" }).state;
    expect(after.hero.bag.some((i) => i.baseId === "super_potion")).toBe(true);
    expect(after.hero.bag.some((i) => i.baseId === fish.id)).toBe(false);
  });
});

describe("market", () => {
  it("sells each offer once and stock items without limit", () => {
    const state = newGame();
    state.hero.gold = 100_000;
    const offer = state.market.offers[0]!;
    const bought = act(state, { type: "market.buy", offerUid: offer.uid }).state;
    expect(bought.hero.gold).toBe(100_000 - offer.price);
    expect(() => act(bought, { type: "market.buy", offerUid: offer.uid })).toThrow("unknownOffer");
    const potions = act(act(bought, { type: "market.buyStock", itemId: "potion" }).state, { type: "market.buyStock", itemId: "potion" }).state;
    expect(potions.hero.bag.find((i) => i.baseId === "potion")!.quantity).toBe(5);
  });

  it("respects bag capacity", () => {
    const state = newGame();
    state.hero.gold = 100_000;
    const ctx = ctxFor(state, "full");
    while (state.hero.bag.length < 24) state.hero.bag.push(generateEquipment(ctx, { ilvl: 1, rarity: "common" }));
    expect(() => act(state, { type: "market.buy", offerUid: state.market.offers[0]!.uid })).toThrow("bagFull");
  });
});

describe("classes and talents", () => {
  it("unlock at level 5 with a class weapon, talents cost points", () => {
    const state = newGame();
    expect(() => act(state, { type: "class.choose", classId: "ranger" })).toThrow("levelTooLow");
    state.hero.level = 6;
    const ranger = act(state, { type: "class.choose", classId: "ranger" });
    expect(ranger.state.hero.classId).toBe("ranger");
    expect(ofType(ranger.events, "loot")).toHaveLength(1);
    let current = ranger.state;
    current = act(current, { type: "talent.learn", talentId: "r_precision" }).state;
    current = act(current, { type: "talent.learn", talentId: "r_precision" }).state;
    expect(() => act(current, { type: "talent.learn", talentId: "r_precision" })).toThrow("noTalentPoints");
    expect(() => act(current, { type: "talent.learn", talentId: "w_toughness" })).toThrow("unknownTalent");
  });

  it("spends paragon points", () => {
    const state = newGame();
    state.hero.paragon = 1;
    const after = act(state, { type: "paragon.spend", stat: "maxHealth" }).state;
    expect(computeStats(after, content).maxHealth).toBe(computeStats(state, content).maxHealth + 6);
    expect(() => act(after, { type: "paragon.spend", stat: "maxHealth" })).toThrow("noParagonPoints");
  });
});
