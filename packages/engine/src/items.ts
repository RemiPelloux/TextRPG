import type { Content, ItemBase, Rarity } from "@textrpg/content";

import type { Ctx } from "./ctx";
import type { GameState, Item } from "./types";

export const RARITY_ORDER: Rarity[] = ["common", "magic", "rare", "legendary", "set", "ancestral"];

const VALUE_MULT: Record<Rarity, number> = {
  common: 1,
  magic: 2,
  rare: 4,
  legendary: 10,
  set: 10,
  ancestral: 20,
};

export const SALVAGE_SHARDS: Record<Rarity, number> = {
  common: 1,
  magic: 2,
  rare: 5,
  legendary: 15,
  set: 15,
  ancestral: 30,
};

export function baseOf(content: Content, baseId: string): ItemBase {
  const base = content.items.get(baseId);
  if (!base) throw new Error(`unknown item ${baseId}`);
  return base;
}

export function isStackable(base: ItemBase): boolean {
  return base.kind !== "equipment";
}

/** Gold received when selling one unit. */
export function sellValue(item: Item, content: Content): number {
  const base = baseOf(content, item.baseId);
  if (base.kind !== "equipment") return Math.max(1, Math.round(base.price * 0.4));
  return Math.max(
    1,
    Math.round(
      base.price *
        VALUE_MULT[item.rarity] *
        (1 + item.ilvl * 0.15) *
        (1 + 0.1 * item.upgrade) *
        0.4,
    ),
  );
}

/** Market price for an equipment offer. */
export function buyValue(item: Item, content: Content): number {
  return Math.round(sellValue(item, content) * 2.5);
}

export function bagCapacity(state: GameState, content: Content): number {
  const satchel = content.buildings.get("satchel")!;
  return satchel.levels[state.hero.buildings.satchel]!.value;
}

export function countInBag(state: GameState, baseId: string): number {
  return state.hero.bag.filter((i) => i.baseId === baseId).reduce((n, i) => n + i.quantity, 0);
}

export function findInBag(state: GameState, uid: string): Item | undefined {
  return state.hero.bag.find((i) => i.uid === uid);
}

/** Put an item in the bag. Returns false (and adds nothing) when the bag is full. */
export function addToBag(ctx: Ctx, item: Item): boolean {
  const base = baseOf(ctx.content, item.baseId);
  const bag = ctx.hero.bag;
  if (isStackable(base)) {
    const stack = bag.find((i) => i.baseId === item.baseId);
    if (stack) {
      stack.quantity += item.quantity;
      return true;
    }
  }
  if (bag.length >= bagCapacity(ctx.state, ctx.content)) return false;
  bag.push(item);
  return true;
}

export function removeFromBag(state: GameState, uid: string, quantity = 1): Item {
  const index = state.hero.bag.findIndex((i) => i.uid === uid);
  if (index < 0) throw new Error(`item ${uid} not in bag`);
  const item = state.hero.bag[index]!;
  if (quantity > item.quantity) throw new Error("not enough items");
  item.quantity -= quantity;
  if (item.quantity === 0) state.hero.bag.splice(index, 1);
  return { ...item, quantity };
}

export function removeByBase(state: GameState, baseId: string, quantity: number): void {
  let left = quantity;
  for (const item of [...state.hero.bag]) {
    if (item.baseId !== baseId || left <= 0) continue;
    const take = Math.min(left, item.quantity);
    removeFromBag(state, item.uid, take);
    left -= take;
  }
  if (left > 0) throw new Error(`missing ${left} ${baseId}`);
}

/** A plain, identified copy of a non-equipment item (potion, bait, quest item, fish...). */
export function simpleItem(ctx: Ctx, baseId: string, quantity = 1): Item {
  baseOf(ctx.content, baseId);
  return {
    uid: ctx.uid(),
    baseId,
    rarity: "common",
    ilvl: 1,
    identified: true,
    quantity,
    implicit: {},
    affixes: [],
    fixed: {},
    upgrade: 0,
    locked: false,
  };
}
