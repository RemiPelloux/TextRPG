/** Diablo-style loot: rarity rolls, item bases, tiered affixes, legendaries, sets, bad-luck protection. */
import type { Affix, ClassId, ItemBase, Rarity, Slot } from "@textrpg/content";

import type { Ctx } from "./ctx";
import { addToBag, baseOf, countInBag, simpleItem } from "./items";
import { computeStats } from "./stats";
import type { Item, RolledAffix, StatBag } from "./types";

export interface RarityTable {
  magic: number;
  rare: number;
  legendary: number;
}

/** Every win without a legendary adds this much to the next legendary chance. */
export const PITY_STEP = 0.001;
/** Implicit stats grow 10% per item level above the base's level. */
const IMPLICIT_GROWTH = 0.1;

export function rollRarity(ctx: Ctx, table: RarityTable, magicFind: number, ilvl: number): Rarity {
  const mf = 1 + magicFind / 100;
  const legendary = table.legendary * mf + ctx.state.pity * PITY_STEP;
  const rare = table.rare * mf;
  const magic = table.magic * mf;
  const roll = ctx.rng.next();
  if (roll < legendary) {
    if (ilvl >= 20 && ctx.rng.chance(0.1)) return "ancestral";
    return ctx.rng.chance(0.35) && setPiecesFor(ctx, ilvl).length > 0 ? "set" : "legendary";
  }
  if (roll < legendary + rare) return "rare";
  if (roll < legendary + rare + magic) return "magic";
  return "common";
}

function setPiecesFor(ctx: Ctx, ilvl: number) {
  return [...ctx.content.setPieces.values()].filter(({ set }) => set.minIlvl <= ilvl);
}

function rollRange([low, high]: [number, number], ctx: Ctx, max: boolean): number {
  if (max) return high;
  return Number.isInteger(low) && Number.isInteger(high)
    ? ctx.rng.int(low, high)
    : Math.round(ctx.rng.float(low, high) * 10) / 10;
}

function rollImplicit(ctx: Ctx, base: ItemBase, ilvl: number, max: boolean): StatBag {
  const growth = 1 + IMPLICIT_GROWTH * Math.max(0, ilvl - base.level);
  const out: StatBag = {};
  for (const [stat, range] of Object.entries(base.implicit) as [keyof StatBag, [number, number]][]) {
    out[stat] = Math.round(rollRange(range, ctx, max) * growth);
  }
  return out;
}

function rollFixed(ctx: Ctx, fixed: Partial<Record<string, [number, number]>>, ilvl: number, max: boolean): StatBag {
  const growth = 1 + 0.04 * Math.max(0, ilvl - 1);
  const out: StatBag = {};
  for (const [stat, range] of Object.entries(fixed) as [keyof StatBag, [number, number]][]) {
    out[stat] = Math.round(rollRange(range, ctx, max) * growth);
  }
  return out;
}

export function tierFor(affix: Affix, ilvl: number): number {
  let tier = 0;
  affix.tiers.forEach((t, index) => {
    if (t.minIlvl <= ilvl) tier = index;
  });
  return tier;
}

export function rollAffix(ctx: Ctx, affix: Affix, ilvl: number, max: boolean): RolledAffix {
  let tier = tierFor(affix, ilvl);
  // 30% of the time the affix rolls one tier lower: perfect items stay rare.
  if (!max && tier > 0 && ctx.rng.chance(0.3)) tier -= 1;
  return { id: affix.id, tier, value: rollRange(affix.tiers[tier]!.range, ctx, max) };
}

/** Pick `count` affixes for a slot, never two on the same stat; optional prefix/suffix constraint. */
export function pickAffixes(
  ctx: Ctx,
  slot: Slot,
  count: number,
  exclude: Set<string>,
  type?: Affix["type"],
): Affix[] {
  const chosen: Affix[] = [];
  const usedStats = new Set(exclude);
  for (let i = 0; i < count; i++) {
    const pool = ctx.content.affixes.filter(
      (a) => a.slots.includes(slot) && !usedStats.has(a.stat) && (!type || a.type === type),
    );
    if (pool.length === 0) break;
    const affix = ctx.rng.weighted(pool, (a) => a.weight);
    chosen.push(affix);
    usedStats.add(affix.stat);
  }
  return chosen;
}

const AFFIX_COUNT: Record<Rarity, [number, number]> = {
  common: [0, 0],
  magic: [1, 2],
  rare: [3, 4],
  legendary: [2, 2],
  set: [1, 1],
  ancestral: [3, 3],
};

function pickBase(ctx: Ctx, ilvl: number, slot?: Slot, classId?: ClassId | null): ItemBase {
  const candidates = [...ctx.content.items.values()].filter(
    (b) => b.kind === "equipment" && b.droppable && (!slot || b.slot === slot),
  );
  let bases = candidates.filter((b) => b.level <= ilvl);
  // Nothing low enough for this slot yet: fall back to its lowest base.
  if (bases.length === 0) {
    const lowest = Math.min(...candidates.map((b) => b.level));
    bases = candidates.filter((b) => b.level === lowest);
  }
  if (bases.length === 0) throw new Error(`no base for ${slot ?? "any slot"}`);
  return ctx.rng.weighted(bases, (b) => {
    let weight = b.level >= ilvl - 5 ? 3 : 1;
    if (b.slot === "weapon") weight *= classId ? (b.weaponClass === classId ? 3 : 0.5) : 1;
    return weight;
  });
}

export interface ItemSpec {
  ilvl: number;
  rarity: Rarity;
  slot?: Slot;
  classId?: ClassId | null;
}

export function generateEquipment(ctx: Ctx, spec: ItemSpec): Item {
  const { rarity } = spec;
  const ilvl = Math.max(1, Math.min(spec.ilvl, 60));
  const max = rarity === "ancestral";
  let base: ItemBase;
  const item: Partial<Item> = { fixed: {} };

  if (rarity === "legendary" || rarity === "ancestral") {
    const pool = [...ctx.content.legendaries.values()].filter(
      (l) => l.minIlvl <= ilvl && (!spec.slot || baseOf(ctx.content, l.baseId).slot === spec.slot),
    );
    if (pool.length === 0) return generateEquipment(ctx, { ...spec, rarity: "rare" });
    const legendary = ctx.rng.pick(pool);
    base = baseOf(ctx.content, legendary.baseId);
    item.legendaryId = legendary.id;
    item.fixed = rollFixed(ctx, legendary.fixed, ilvl, max);
  } else if (rarity === "set") {
    const pool = setPiecesFor(ctx, ilvl).filter(
      ({ piece }) => !spec.slot || baseOf(ctx.content, piece.baseId).slot === spec.slot,
    );
    if (pool.length === 0) return generateEquipment(ctx, { ...spec, rarity: "legendary" });
    const { piece } = ctx.rng.pick(pool);
    base = baseOf(ctx.content, piece.baseId);
    item.setPieceId = piece.id;
    item.fixed = rollFixed(ctx, piece.fixed, ilvl, false);
  } else {
    base = pickBase(ctx, ilvl, spec.slot, spec.classId);
  }

  const slot = base.slot!;
  const [low, high] = AFFIX_COUNT[rarity];
  const count = ctx.rng.int(low, high);
  const exclude = new Set(Object.keys(item.fixed ?? {}));
  let affixes: Affix[];
  if (rarity === "magic") {
    // Magic items read "Prefix Base Suffix": at most one of each.
    const types: Affix["type"][] = count === 2 ? ["prefix", "suffix"] : [ctx.rng.pick(["prefix", "suffix"] as const)];
    affixes = types.flatMap((type) => {
      const [affix] = pickAffixes(ctx, slot, 1, exclude, type);
      if (affix) exclude.add(affix.stat);
      return affix ? [affix] : [];
    });
  } else {
    affixes = pickAffixes(ctx, slot, count, exclude);
  }

  const names = ctx.content.rareNames;
  return {
    uid: ctx.uid(),
    baseId: base.id,
    rarity,
    ilvl,
    identified: rarity === "common" || rarity === "magic",
    quantity: 1,
    implicit: rollImplicit(ctx, base, ilvl, max),
    affixes: affixes.map((a) => rollAffix(ctx, a, ilvl, max)),
    fixed: item.fixed ?? {},
    ...(item.legendaryId ? { legendaryId: item.legendaryId } : {}),
    ...(item.setPieceId ? { setPieceId: item.setPieceId } : {}),
    ...(rarity === "rare"
      ? {
          rareName: [
            ctx.rng.int(0, Math.min(names.en.first.length, names.fr.first.length) - 1),
            ctx.rng.int(0, Math.min(names.en.second.length, names.fr.second.length) - 1),
          ] as [number, number],
        }
      : {}),
    upgrade: 0,
    locked: false,
  };
}

/** Quest items drop only while an active quest needs them. */
const QUEST_DROPS: Record<string, { kinds: string[]; dungeonFloor?: number }> = {
  orc_teeth: { kinds: ["orc"] },
  goblin_ear: { kinds: ["goblin"] },
  bone_dust: { kinds: ["skeleton", "zombie"] },
  demon_horn: { kinds: ["demon"] },
  moonstone: { kinds: ["wraith"], dungeonFloor: 4 },
};

export interface LootSource {
  ilvl: number;
  table: RarityTable & { dropChance: number };
  kindId: string;
  elite: boolean;
  boss: boolean;
  bloodMoon?: boolean;
  dungeonFloor?: number;
  /** Where the loot goes: the bag, or the dungeon stash (lost on death). */
  into: "bag" | "stash";
  guaranteedRarity?: Rarity;
}

function stow(ctx: Ctx, source: LootSource, item: Item): void {
  if (source.into === "stash" && ctx.state.dungeon) {
    ctx.state.dungeon.stash.push(item);
    ctx.emit({ type: "loot", item });
    return;
  }
  const kept = addToBag(ctx, item);
  ctx.emit(kept ? { type: "loot", item } : { type: "loot", item, lost: true });
}

const RARE_PLUS: Rarity[] = ["rare", "legendary", "set", "ancestral"];

export function rollLoot(ctx: Ctx, source: LootSource): void {
  const stats = computeStats(ctx.state, ctx.content);
  const magicFind = stats.magicFind * (source.bloodMoon ? 2 : 1) + (source.bloodMoon ? 100 : 0);
  const rolls = source.boss ? 3 : source.elite ? 2 : 1;
  let gotLegendary = false;

  for (let i = 0; i < rolls; i++) {
    const forced = i === 0 ? source.guaranteedRarity : undefined;
    if (!forced && !source.boss && !ctx.rng.chance(source.table.dropChance)) continue;
    let rarity = forced ?? rollRarity(ctx, source.table, magicFind, source.ilvl);
    if (source.boss && i === 0 && !RARE_PLUS.includes(rarity)) rarity = "rare";
    if (rarity === "legendary" || rarity === "set" || rarity === "ancestral") gotLegendary = true;
    stow(ctx, source, generateEquipment(ctx, { ilvl: source.ilvl, rarity, classId: ctx.hero.classId }));
  }
  ctx.state.pity = gotLegendary ? 0 : ctx.state.pity + 1;

  if (ctx.rng.chance(0.12)) {
    const potion = source.ilvl >= 12 ? "mega_potion" : source.ilvl >= 6 ? "super_potion" : "potion";
    stow(ctx, source, simpleItem(ctx, ctx.rng.chance(0.15) ? "identify_scroll" : potion));
  }

  for (const quest of ctx.state.quests) {
    const template = ctx.content.quests.get(quest.templateId)!;
    if (template.objective.kind !== "collect") continue;
    const itemId = template.objective.itemId;
    const rule = QUEST_DROPS[itemId];
    if (!rule || countInBag(ctx.state, itemId) >= template.objective.count) continue;
    const matches =
      rule.kinds.includes(source.kindId) ||
      (rule.dungeonFloor !== undefined && (source.dungeonFloor ?? 0) >= rule.dungeonFloor);
    if (matches && ctx.rng.chance(0.4)) {
      // Quest items always go to the bag, even in a dungeon.
      const item = simpleItem(ctx, itemId);
      ctx.emit(addToBag(ctx, item) ? { type: "loot", item } : { type: "loot", item, lost: true });
    }
  }
}

