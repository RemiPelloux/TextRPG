/** Bag, equipment, consumables, market, forge, alchemy and camp buildings. */
import type { Rarity, Slot } from "@textrpg/content";

import type { Ctx } from "./ctx";
import {
  addToBag,
  baseOf,
  buyValue,
  countInBag,
  findInBag,
  removeByBase,
  removeFromBag,
  SALVAGE_SHARDS,
  sellValue,
  simpleItem,
} from "./items";
import { generateEquipment, pickAffixes, rollAffix } from "./loot";
import { onIdentify } from "./quests";
import { computeStats } from "./stats";
import type { BuildingId, Item } from "./types";

// --- Equipment ---------------------------------------------------------------

export function requiredLevel(item: Item, ctx: { content: Ctx["content"] }): number {
  const base = baseOf(ctx.content, item.baseId);
  const legendary = item.legendaryId ? ctx.content.legendaries.get(item.legendaryId) : undefined;
  return Math.max(base.level, legendary?.minIlvl ?? 1);
}

function bagItem(ctx: Ctx, uid: string): Item {
  const item = findInBag(ctx.state, uid);
  if (!item) ctx.fail("unknownItem");
  return item;
}

function clampVitals(ctx: Ctx): void {
  const stats = computeStats(ctx.state, ctx.content);
  ctx.hero.health = Math.min(ctx.hero.health, stats.maxHealth);
  ctx.hero.energy = Math.min(ctx.hero.energy, stats.maxEnergy);
}

export function equip(ctx: Ctx, uid: string): void {
  const item = bagItem(ctx, uid);
  const base = baseOf(ctx.content, item.baseId);
  if (base.kind !== "equipment" || !base.slot) ctx.fail("notEquipable");
  if (requiredLevel(item, ctx) > ctx.hero.level) ctx.fail("levelTooLow", { level: requiredLevel(item, ctx) });
  const slot = base.slot;
  removeFromBag(ctx.state, uid, 1);
  const previous = ctx.hero.equipment[slot];
  ctx.hero.equipment[slot] = { ...item, quantity: 1 };
  if (previous) ctx.hero.bag.push(previous);
  ctx.emit({ type: "equipped", uid, slot });
  clampVitals(ctx);
}

export function unequip(ctx: Ctx, slot: Slot): void {
  const item = ctx.hero.equipment[slot];
  if (!item) ctx.fail("emptySlot");
  if (!addToBag(ctx, item)) ctx.fail("bagFull");
  delete ctx.hero.equipment[slot];
  clampVitals(ctx);
}

export function toggleLock(ctx: Ctx, uid: string): void {
  const item = findInBag(ctx.state, uid) ?? Object.values(ctx.hero.equipment).find((i) => i?.uid === uid);
  if (!item) ctx.fail("unknownItem");
  item.locked = !item.locked;
}

// --- Consumables -------------------------------------------------------------

export function useItem(ctx: Ctx, uid: string): void {
  if (ctx.state.combat) ctx.fail("inCombat");
  const item = bagItem(ctx, uid);
  const base = baseOf(ctx.content, item.baseId);
  const stats = computeStats(ctx.state, ctx.content);
  if (base.kind === "elixir" && base.buff) {
    ctx.hero.buffs = ctx.hero.buffs.filter((b) => b.sourceId !== base.id);
    ctx.hero.buffs.push({ sourceId: base.id, ...base.buff });
    removeFromBag(ctx.state, uid, 1);
    ctx.emit({ type: "itemUsed", baseId: base.id });
    return;
  }
  const healPct = base.effect?.healPct ?? 0;
  const energy = base.effect?.energy ?? 0;
  if (!healPct && !energy) ctx.fail("notUsable");
  const heal = Math.min(stats.maxHealth - ctx.hero.health, Math.round(stats.maxHealth * healPct));
  const gained = Math.min(stats.maxEnergy - ctx.hero.energy, energy);
  if (heal <= 0 && gained <= 0) ctx.fail("alreadyFull");
  ctx.hero.health += Math.max(0, heal);
  ctx.hero.energy += Math.max(0, gained);
  removeFromBag(ctx.state, uid, 1);
  if (base.kind === "potion") ctx.state.counters.potionsUsed += 1;
  ctx.emit({ type: "itemUsed", baseId: base.id, heal: Math.max(0, heal), energy: Math.max(0, gained) });
}

// --- Selling -----------------------------------------------------------------

function canSell(ctx: Ctx, item: Item): boolean {
  return baseOf(ctx.content, item.baseId).sellable && !item.locked;
}

export function sell(ctx: Ctx, uid: string): void {
  const item = bagItem(ctx, uid);
  if (!canSell(ctx, item)) ctx.fail("cannotSell");
  const gold = sellValue(item, ctx.content) * item.quantity;
  removeFromBag(ctx.state, uid, item.quantity);
  ctx.hero.gold += gold;
  ctx.state.counters.goldEarned += gold;
  ctx.emit({ type: "sold", gold, count: 1 });
}

/** Sell every unlocked common and magic piece of equipment. */
export function sellJunk(ctx: Ctx): void {
  const junk = ctx.hero.bag.filter(
    (i) => (i.rarity === "common" || i.rarity === "magic") && baseOf(ctx.content, i.baseId).kind === "equipment" && canSell(ctx, i),
  );
  if (junk.length === 0) ctx.fail("nothingToSell");
  const gold = junk.reduce((sum, i) => sum + sellValue(i, ctx.content), 0);
  ctx.hero.bag = ctx.hero.bag.filter((i) => !junk.includes(i));
  ctx.hero.gold += gold;
  ctx.state.counters.goldEarned += gold;
  ctx.emit({ type: "sold", gold, count: junk.length });
}

// --- Identify ----------------------------------------------------------------

export function identifyCost(item: Item): number {
  return 10 + 3 * item.ilvl;
}

function revealItem(ctx: Ctx, item: Item): void {
  item.identified = true;
  ctx.state.counters.itemsIdentified += 1;
  if (item.legendaryId && !ctx.state.codex.legendaries.includes(item.legendaryId)) {
    ctx.state.codex.legendaries.push(item.legendaryId);
  }
  if (item.legendaryId) ctx.state.counters.legendariesFound += 1;
  if (item.setPieceId) {
    ctx.state.counters.setPiecesFound += 1;
    if (!ctx.state.codex.setPieces.includes(item.setPieceId)) ctx.state.codex.setPieces.push(item.setPieceId);
  }
  ctx.emit({ type: "identified", uid: item.uid, rarity: item.rarity });
}

function findAnywhere(ctx: Ctx, uid: string): Item | undefined {
  return findInBag(ctx.state, uid) ?? Object.values(ctx.hero.equipment).find((i) => i?.uid === uid);
}

/** Identify with a scroll if you have one, otherwise pay the smith. */
export function identify(ctx: Ctx, uid: string): void {
  const item = findAnywhere(ctx, uid);
  if (!item) ctx.fail("unknownItem");
  if (item.identified) ctx.fail("alreadyIdentified");
  if (countInBag(ctx.state, "identify_scroll") > 0) {
    removeByBase(ctx.state, "identify_scroll", 1);
  } else {
    const cost = identifyCost(item);
    if (ctx.hero.gold < cost) ctx.fail("notEnoughGold", { cost });
    ctx.hero.gold -= cost;
  }
  revealItem(ctx, item);
  onIdentify(ctx);
}

export function identifyAll(ctx: Ctx): void {
  const unknown = [...ctx.hero.bag, ...Object.values(ctx.hero.equipment)].filter((i): i is Item => !!i && !i.identified);
  if (unknown.length === 0) ctx.fail("nothingToIdentify");
  let done = 0;
  for (const item of unknown) {
    if (countInBag(ctx.state, "identify_scroll") > 0) {
      removeByBase(ctx.state, "identify_scroll", 1);
    } else if (ctx.hero.gold >= identifyCost(item)) {
      ctx.hero.gold -= identifyCost(item);
    } else {
      break;
    }
    revealItem(ctx, item);
    done += 1;
  }
  if (done === 0) ctx.fail("notEnoughGold", { cost: identifyCost(unknown[0]!) });
  onIdentify(ctx, done);
}

// --- Forge -------------------------------------------------------------------

export function buildingValue(ctx: { state: Ctx["state"]; content: Ctx["content"] }, id: BuildingId): number {
  return ctx.content.buildings.get(id)!.levels[ctx.state.hero.buildings[id]]!.value;
}

export function upgradeCost(item: Item): { gold: number; shards: number; failChance: number } {
  const next = item.upgrade + 1;
  return {
    gold: Math.round(25 * Math.pow(next, 1.6) * (1 + item.ilvl / 10)),
    shards: next * 2,
    failChance: next >= 6 ? Math.min(0.6, 0.1 * (next - 5)) : 0,
  };
}

function pay(ctx: Ctx, gold: number, shards: number): void {
  if (ctx.hero.gold < gold) ctx.fail("notEnoughGold", { cost: gold });
  if (ctx.hero.shards < shards) ctx.fail("notEnoughShards", { cost: shards });
  ctx.hero.gold -= gold;
  ctx.hero.shards -= shards;
}

export function upgrade(ctx: Ctx, uid: string): void {
  const item = findAnywhere(ctx, uid);
  if (!item || baseOf(ctx.content, item.baseId).kind !== "equipment") ctx.fail("unknownItem");
  if (item.upgrade >= buildingValue(ctx, "forge")) ctx.fail("forgeLimit");
  const cost = upgradeCost(item);
  pay(ctx, cost.gold, cost.shards);
  const success = !ctx.rng.chance(cost.failChance);
  if (success) {
    item.upgrade += 1;
    ctx.state.counters.upgradesDone += 1;
  }
  ctx.emit({ type: "upgraded", uid, level: item.upgrade, success });
}

export function salvage(ctx: Ctx, uid: string): void {
  const item = bagItem(ctx, uid);
  if (baseOf(ctx.content, item.baseId).kind !== "equipment") ctx.fail("cannotSalvage");
  if (item.locked) ctx.fail("itemLocked");
  const shards = SALVAGE_SHARDS[item.rarity] + item.upgrade;
  removeFromBag(ctx.state, uid, 1);
  ctx.hero.shards += shards;
  ctx.state.counters.itemsSalvaged += 1;
  ctx.emit({ type: "salvaged", shards });
}

export function rerollCost(item: Item) {
  return { gold: 20 * item.ilvl, shards: 8 + item.ilvl };
}

/** Replace one affix by a new random one (never on a stat the item already has). */
export function reroll(ctx: Ctx, uid: string, index: number): void {
  const item = findAnywhere(ctx, uid);
  if (!item) ctx.fail("unknownItem");
  if (!item.identified || ["common", "magic"].includes(item.rarity)) ctx.fail("cannotReroll");
  if (!item.affixes[index]) ctx.fail("unknownAffix");
  const cost = rerollCost(item);
  pay(ctx, cost.gold, cost.shards);
  const statOf = (id: string) => ctx.content.affixes.find((a) => a.id === id)!.stat;
  const exclude = new Set([
    ...item.affixes.filter((_, i) => i !== index).map((a) => statOf(a.id)),
    ...Object.keys(item.fixed),
  ]);
  const [affix] = pickAffixes(ctx, baseOf(ctx.content, item.baseId).slot!, 1, exclude);
  if (!affix) ctx.fail("cannotReroll");
  item.affixes[index] = rollAffix(ctx, affix, item.ilvl, false);
  ctx.emit({ type: "rerolled", uid });
}

// --- Alchemy -----------------------------------------------------------------

export interface Recipe {
  id: string;
  level: number;
  fish: number;
  rareFish?: boolean;
  shards: number;
}

export const RECIPES: Recipe[] = [
  { id: "super_potion", level: 1, fish: 2, shards: 2 },
  { id: "energy_tonic", level: 1, fish: 2, shards: 6 },
  { id: "elixir_vigor", level: 1, fish: 3, shards: 5 },
  { id: "elixir_might", level: 2, fish: 3, shards: 8 },
  { id: "mega_potion", level: 2, fish: 1, rareFish: true, shards: 10 },
  { id: "elixir_fortune", level: 2, fish: 4, shards: 20 },
];

function fishRarity(ctx: Ctx, baseId: string): Rarity | undefined {
  return ctx.content.fish.find((f) => f.id === baseId)?.rarity;
}

export function brew(ctx: Ctx, recipeId: string): void {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) ctx.fail("unknownRecipe");
  if (buildingValue(ctx, "alchemist") < recipe.level) ctx.fail("alchemistLevel", { level: recipe.level });
  const eligible = ctx.hero.bag
    .filter((i) => {
      const rarity = fishRarity(ctx, i.baseId);
      return rarity && (!recipe.rareFish || ["rare", "legendary"].includes(rarity));
    })
    .sort((a, b) => sellValue(a, ctx.content) - sellValue(b, ctx.content));
  const available = eligible.reduce((n, i) => n + i.quantity, 0);
  if (available < recipe.fish) ctx.fail("notEnoughFish", { needed: recipe.fish });
  if (ctx.hero.shards < recipe.shards) ctx.fail("notEnoughShards", { cost: recipe.shards });
  ctx.hero.shards -= recipe.shards;
  let left = recipe.fish;
  for (const fish of eligible) {
    const take = Math.min(left, fish.quantity);
    removeFromBag(ctx.state, fish.uid, take);
    left -= take;
    if (left === 0) break;
  }
  const potion = simpleItem(ctx, recipe.id);
  if (!addToBag(ctx, potion)) ctx.fail("bagFull");
  ctx.emit({ type: "brewed", itemId: recipe.id });
}

// --- Buildings ---------------------------------------------------------------

export function upgradeBuilding(ctx: Ctx, id: BuildingId): void {
  const building = ctx.content.buildings.get(id);
  if (!building) ctx.fail("unknownBuilding");
  const next = building.levels[ctx.hero.buildings[id] + 1];
  if (!next) ctx.fail("buildingMaxed");
  pay(ctx, next.gold, next.shards);
  ctx.hero.buildings[id] += 1;
  ctx.emit({ type: "buildingUpgraded", buildingId: id, level: ctx.hero.buildings[id] });
}

// --- Market ------------------------------------------------------------------

/** Always in stock, unlimited. */
export const STOCK: { itemId: string; minLevel: number }[] = [
  { itemId: "potion", minLevel: 1 },
  { itemId: "super_potion", minLevel: 5 },
  { itemId: "mega_potion", minLevel: 10 },
  { itemId: "identify_scroll", minLevel: 1 },
  { itemId: "fish_bait", minLevel: 1 },
  { itemId: "fishing_rod", minLevel: 1 },
  { itemId: "energy_tonic", minLevel: 2 },
  { itemId: "elixir_vigor", minLevel: 2 },
  { itemId: "elixir_might", minLevel: 4 },
  { itemId: "elixir_fortune", minLevel: 6 },
];

export function refreshMarket(ctx: Ctx): void {
  const marketLevel = ctx.hero.buildings.market;
  const count = buildingValue(ctx, "market");
  const offers = [];
  for (let i = 0; i < count; i++) {
    const roll = ctx.rng.next();
    const rarity: Rarity =
      roll < 0.01 * marketLevel ? "legendary" : roll < 0.12 + 0.06 * marketLevel ? "rare" : roll < 0.75 ? "magic" : "common";
    const item = generateEquipment(ctx, { ilvl: ctx.hero.level, rarity, classId: ctx.hero.classId });
    item.identified = true;
    offers.push({ uid: ctx.uid("m"), item, price: buyValue(item, ctx.content), sold: false });
  }
  ctx.state.market = { day: ctx.state.time.day, offers };
}

export function buyOffer(ctx: Ctx, offerUid: string): void {
  const offer = ctx.state.market.offers.find((o) => o.uid === offerUid);
  if (!offer || offer.sold) ctx.fail("unknownOffer");
  if (ctx.hero.gold < offer.price) ctx.fail("notEnoughGold", { cost: offer.price });
  if (!addToBag(ctx, { ...offer.item, uid: ctx.uid() })) ctx.fail("bagFull");
  ctx.hero.gold -= offer.price;
  offer.sold = true;
  ctx.emit({ type: "bought", uid: offer.uid, price: offer.price });
}

export function buyStock(ctx: Ctx, itemId: string): void {
  const entry = STOCK.find((s) => s.itemId === itemId);
  if (!entry || entry.minLevel > ctx.hero.level) ctx.fail("unknownOffer");
  const base = baseOf(ctx.content, itemId);
  if (itemId === "fishing_rod" && (countInBag(ctx.state, itemId) > 0 || ctx.hero.equipment.tool)) ctx.fail("alreadyOwned");
  if (ctx.hero.gold < base.price) ctx.fail("notEnoughGold", { cost: base.price });
  const item =
    base.kind === "equipment"
      ? { ...simpleItem(ctx, itemId), implicit: Object.fromEntries(Object.entries(base.implicit).map(([k, r]) => [k, r[1]])) }
      : simpleItem(ctx, itemId);
  if (!addToBag(ctx, item)) ctx.fail("bagFull");
  ctx.hero.gold -= base.price;
  ctx.emit({ type: "bought", uid: item.uid, price: base.price });
}

