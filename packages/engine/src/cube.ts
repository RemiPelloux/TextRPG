/**
 * The Cube: crafting from level 1, in the spirit of Diablo's Horadric Cube.
 *
 *   transmute  3 items of the same rarity → 1 item of the next rarity (common → … → legendary)
 *   enchant    pay to see 3 enchantments for an item, pick one (one enchantment per item)
 *   infuse     give an item the sigil of another (the donor is consumed)
 *   reforge    reroll every affix of a rare or legendary item
 *   extract    destroy a legendary to keep its power; place powers in the cube's slots
 */
import type { Rarity } from "@textrpg/content";

import type { Ctx } from "./ctx";
import { addToBag, baseOf, findInBag, removeFromBag } from "./items";
import { generateEquipment, pickAffixes, rollAffix } from "./loot";
import { rollProc } from "./procs";
import { CUBE_SLOT_LEVELS } from "./stats";
import type { Enchant, Item } from "./types";

export const TRANSMUTE_NEXT: Partial<Record<Rarity, Rarity>> = {
  common: "magic",
  magic: "rare",
  rare: "legendary",
};

export const TRANSMUTE_SHARDS: Partial<Record<Rarity, number>> = { common: 1, magic: 3, rare: 15 };
const ENCHANT_OPTIONS = 3;
/** Enchantments roll above an item's normal ceiling. */
const ENCHANT_BOOST = 1.15;
const ENCHANT_PROC_CHANCE = 0.25;

export function transmuteCost(rarity: Rarity, ilvl: number) {
  return { shards: TRANSMUTE_SHARDS[rarity] ?? 0, gold: 5 * ilvl };
}
export function enchantCost(item: Item) {
  return { shards: 2 + Math.floor(item.ilvl / 2), gold: 10 * item.ilvl };
}
export function infuseCost(item: Item) {
  return { shards: 4 + Math.floor(item.ilvl / 3), gold: 0 };
}
export function reforgeCost(item: Item) {
  return { shards: 5 + Math.floor(item.ilvl / 2), gold: 15 * item.ilvl };
}

function pay(ctx: Ctx, cost: { shards: number; gold: number }): void {
  if (ctx.hero.gold < cost.gold) ctx.fail("notEnoughGold", { cost: cost.gold });
  if (ctx.hero.shards < cost.shards) ctx.fail("notEnoughShards", { cost: cost.shards });
  ctx.hero.gold -= cost.gold;
  ctx.hero.shards -= cost.shards;
}

/** Equipment you own: in the bag or worn. */
function ownedGear(ctx: Ctx, uid: string): Item {
  const item =
    findInBag(ctx.state, uid) ?? Object.values(ctx.hero.equipment).find((i) => i?.uid === uid);
  if (!item || baseOf(ctx.content, item.baseId).kind !== "equipment") ctx.fail("unknownItem");
  return item;
}

function bagGear(ctx: Ctx, uid: string): Item {
  const item = findInBag(ctx.state, uid);
  if (!item || baseOf(ctx.content, item.baseId).kind !== "equipment") ctx.fail("unknownItem");
  if (item.locked) ctx.fail("itemLocked");
  return item;
}

export function transmute(ctx: Ctx, uids: string[]): void {
  if (new Set(uids).size !== 3) ctx.fail("needThreeItems");
  const items = uids.map((uid) => bagGear(ctx, uid));
  const rarity = items[0]!.rarity;
  if (items.some((i) => i.rarity !== rarity)) ctx.fail("sameRarity");
  const next = TRANSMUTE_NEXT[rarity];
  if (!next) ctx.fail("cannotTransmute");
  const ilvl = Math.max(...items.map((i) => i.ilvl));
  pay(ctx, transmuteCost(rarity, ilvl));
  for (const item of items) removeFromBag(ctx.state, item.uid, 1);
  // The first item decides the slot: transmutation can be aimed.
  const slot = baseOf(ctx.content, items[0]!.baseId).slot!;
  const result = generateEquipment(ctx, {
    ilvl,
    rarity: next,
    slot,
    classId: ctx.hero.classId,
    origin: { src: "craft", day: ctx.state.time.day },
  });
  addToBag(ctx, result);
  ctx.emit({ type: "transmuted", rarity: next });
  ctx.emit({ type: "loot", item: result });
}

function rollEnchant(ctx: Ctx, item: Item): Enchant {
  if (ctx.rng.chance(ENCHANT_PROC_CHANCE))
    return { proc: rollProc(ctx.rng, item.ilvl, { strength: 0.6 }) };
  const slot = baseOf(ctx.content, item.baseId).slot!;
  const [affix] = pickAffixes(ctx, slot, 1, new Set());
  if (!affix) return { proc: rollProc(ctx.rng, item.ilvl, { strength: 0.6 }) };
  return { affix: rollAffix(ctx, affix, item.ilvl, true, ENCHANT_BOOST) };
}

export function enchant(ctx: Ctx, uid: string): void {
  const item = ownedGear(ctx, uid);
  if (!item.identified) ctx.fail("identifyFirst");
  pay(ctx, enchantCost(item));
  const options = Array.from({ length: ENCHANT_OPTIONS }, () => rollEnchant(ctx, item));
  ctx.state.cube.offer = { uid, options };
  ctx.emit({ type: "enchantOffer", uid, count: options.length });
}

export function pickEnchant(ctx: Ctx, index: number): void {
  const offer = ctx.state.cube.offer;
  if (!offer) ctx.fail("noOffer");
  const option = offer.options[index];
  if (!option) ctx.fail("unknownChoice");
  const item = ownedGear(ctx, offer.uid);
  item.enchant = option;
  ctx.state.cube.offer = null;
  ctx.emit({ type: "enchanted", uid: item.uid });
}

export function infuse(ctx: Ctx, uid: string, donorUid: string): void {
  if (uid === donorUid) ctx.fail("unknownItem");
  const item = ownedGear(ctx, uid);
  const donor = bagGear(ctx, donorUid);
  if (!donor.sigil || !donor.identified) ctx.fail("noSigil");
  if (item.rarity === "set") ctx.fail("cannotInfuse");
  pay(ctx, infuseCost(item));
  removeFromBag(ctx.state, donor.uid, 1);
  item.sigil = donor.sigil;
  ctx.emit({ type: "infused", uid: item.uid, sigil: donor.sigil });
}

export function reforge(ctx: Ctx, uid: string): void {
  const item = ownedGear(ctx, uid);
  if (!item.identified) ctx.fail("identifyFirst");
  if (!["rare", "legendary", "ancestral"].includes(item.rarity)) ctx.fail("cannotReroll");
  pay(ctx, reforgeCost(item));
  const slot = baseOf(ctx.content, item.baseId).slot!;
  const affixes = pickAffixes(ctx, slot, item.affixes.length, new Set(Object.keys(item.fixed)));
  item.affixes = affixes.map((a) => rollAffix(ctx, a, item.ilvl, item.rarity === "ancestral"));
  ctx.emit({ type: "reforged", uid: item.uid });
}

export function powerKey(item: Item): string | undefined {
  if (item.legendaryId) return item.legendaryId;
  if (item.legend && item.seed) return `p:${item.seed}`;
  return undefined;
}

export function extract(ctx: Ctx, uid: string): void {
  const item = bagGear(ctx, uid);
  if (!item.identified) ctx.fail("identifyFirst");
  const key = powerKey(item);
  if (!key) ctx.fail("noPower");
  if (ctx.state.cube.powers.some((p) => p.key === key)) ctx.fail("alreadyExtracted");
  removeFromBag(ctx.state, item.uid, 1);
  ctx.state.cube.powers.push({
    key,
    baseId: item.baseId,
    ...(item.legendaryId ? { legendaryId: item.legendaryId } : {}),
    ...(item.legend ? { legend: item.legend } : {}),
    ...(item.procs ? { procs: item.procs } : {}),
  });
  ctx.emit({ type: "extracted", key });
}

export function setCubeSlot(ctx: Ctx, slot: number, key: string | null): void {
  const unlocked = CUBE_SLOT_LEVELS.filter((level) => ctx.hero.level >= level).length;
  if (slot < 0 || slot >= unlocked) ctx.fail("slotLocked", { level: CUBE_SLOT_LEVELS[slot] ?? 99 });
  if (key !== null && !ctx.state.cube.powers.some((p) => p.key === key)) ctx.fail("noPower");
  const slots = ctx.state.cube.slots;
  // A power sits in one slot at a time.
  for (let i = 0; i < slots.length; i++) if (slots[i] === key) slots[i] = null;
  slots[slot] = key;
}
