/**
 * The item generator. Every drop is one of a kind:
 *
 *   base × material × quality (0-100) × affixes (tiered, scaling past ilvl 20)
 *        × sigil (procedural set) × procs (generated powers) × name × provenance × serial
 *
 * Legendaries are either handcrafted (named, iconic) or procedural: a generated name, a lore
 * line and one or two generated powers. Ancestral items roll every value at its maximum.
 */
import type { Affix, ClassId, ItemBase, Material, Rarity, Slot } from "@textrpg/content";

import type { Ctx } from "./ctx";
import { generateName } from "./enemies";
import { addToBag, baseOf, countInBag, simpleItem } from "./items";
import { rollProc } from "./procs";
import { computeStats } from "./stats";
import type { Item, Origin, RolledAffix, StatBag } from "./types";

export interface RarityTable {
  magic: number;
  rare: number;
  legendary: number;
}

/** Every win without a legendary adds this much to the next legendary chance. */
export const PITY_STEP = 0.001;
/** Implicit stats grow 10% per item level above the base's level. */
const IMPLICIT_GROWTH = 0.1;
/** Affixes keep growing 4% per item level beyond the last tier (endgame / torments). */
const AFFIX_OVERGROWTH = 0.04;
const LAST_TIER_ILVL = 20;
/** Share of legendary drops that are handcrafted (the rest are procedural). */
const HANDCRAFTED_SHARE = 0.4;
/** Chance for a rare item to carry a "mythic" generated power. */
const MYTHIC_RARE_CHANCE = 0.06;
/** Early levels: a small extra chance that a drop is a set piece, so sets show up fast. */
const EARLY_SET_CHANCE = 0.012;
const EARLY_SET_ILVL = 10;

export const SIGIL_CHANCE: Record<Rarity, number> = {
  common: 0.12,
  magic: 0.35,
  rare: 0.5,
  legendary: 0.45,
  set: 0,
  ancestral: 1,
};
/** When the hero already wears sigils, new sigils favor them ("smart loot"). */
const SMART_SIGIL_CHANCE = 0.4;

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

export function pickMaterial(ctx: Ctx, base: ItemBase, ilvl: number): Material | undefined {
  if (!base.family) return undefined;
  const pool = ctx.content.materials.filter(
    (m) => m.families.includes(base.family!) && m.minIlvl <= ilvl,
  );
  if (pool.length === 0) return undefined;
  const best = Math.max(...pool.map((m) => m.minIlvl));
  // Recent tiers are common, older ones still appear.
  return ctx.rng.weighted(pool, (m) => m.weight * (m.minIlvl === best ? 3 : 1));
}

/** Implicit stats: base range × level growth × material × quality, plus the material's trait. */
function rollImplicit(
  ctx: Ctx,
  base: ItemBase,
  ilvl: number,
  max: boolean,
  material: Material | undefined,
  quality: number,
): StatBag {
  const growth = 1 + IMPLICIT_GROWTH * Math.max(0, ilvl - base.level);
  const factor = growth * (material?.implicitMult ?? 1) * (0.85 + 0.3 * (quality / 100));
  const out: StatBag = {};
  for (const [stat, range] of Object.entries(base.implicit) as [
    keyof StatBag,
    [number, number],
  ][]) {
    out[stat] = Math.round(rollRange(range, ctx, max) * factor);
  }
  if (material?.trait) {
    const { stat, base: b, perLevel } = material.trait;
    out[stat] = Math.round(((out[stat] ?? 0) + b + perLevel * ilvl) * 10) / 10;
  }
  return out;
}

function rollFixed(
  ctx: Ctx,
  fixed: Partial<Record<string, [number, number]>>,
  ilvl: number,
  max: boolean,
): StatBag {
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

/** Roll an affix value. Past the last tier, values keep growing with the item level. */
export function rollAffix(
  ctx: Ctx,
  affix: Affix,
  ilvl: number,
  max: boolean,
  boost = 1,
): RolledAffix {
  let tier = tierFor(affix, ilvl);
  // 30% of the time the affix rolls one tier lower: perfect items stay rare.
  if (!max && tier > 0 && ctx.rng.chance(0.3)) tier -= 1;
  const overgrowth = 1 + AFFIX_OVERGROWTH * Math.max(0, ilvl - LAST_TIER_ILVL);
  const raw = rollRange(affix.tiers[tier]!.range, ctx, max) * overgrowth * boost;
  const value = Number.isInteger(affix.tiers[tier]!.range[0])
    ? Math.round(raw)
    : Math.round(raw * 10) / 10;
  return { id: affix.id, tier, value };
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

export function pickBase(ctx: Ctx, ilvl: number, slot?: Slot, classId?: ClassId | null): ItemBase {
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

/** A unique serial for display: 5 base-36 characters. */
function serial(ctx: Ctx): string {
  let out = "";
  for (let i = 0; i < 5; i++) out += "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"[ctx.rng.int(0, 33)];
  return out;
}

function rollSigil(ctx: Ctx, rarity: Rarity, ilvl: number): string | undefined {
  if (!ctx.rng.chance(SIGIL_CHANCE[rarity])) return undefined;
  const pool = [...ctx.content.sigils.values()].filter((s) => s.minIlvl <= ilvl);
  if (pool.length === 0) return undefined;
  const worn = Object.values(ctx.hero.equipment)
    .map((i) => i?.sigil)
    .filter((s): s is string => Boolean(s) && pool.some((p) => p.id === s));
  if (worn.length && ctx.rng.chance(SMART_SIGIL_CHANCE)) return ctx.rng.pick(worn);
  return ctx.rng.pick(pool).id;
}

export interface ItemSpec {
  ilvl: number;
  rarity: Rarity;
  slot?: Slot;
  classId?: ClassId | null;
  origin?: Origin;
}

export function generateEquipment(ctx: Ctx, spec: ItemSpec): Item {
  const { rarity } = spec;
  const ilvl = Math.max(1, Math.min(spec.ilvl, 80));
  const max = rarity === "ancestral";
  let base: ItemBase;
  const extra: Partial<Item> = { fixed: {} };

  if (rarity === "legendary" || rarity === "ancestral") {
    const pool = [...ctx.content.legendaries.values()].filter(
      (l) => l.minIlvl <= ilvl && (!spec.slot || baseOf(ctx.content, l.baseId).slot === spec.slot),
    );
    if (pool.length > 0 && ctx.rng.chance(HANDCRAFTED_SHARE)) {
      const legendary = ctx.rng.pick(pool);
      base = baseOf(ctx.content, legendary.baseId);
      extra.legendaryId = legendary.id;
      extra.fixed = rollFixed(ctx, legendary.fixed, ilvl, max);
    } else {
      // Procedural legendary: generated name, lore and powers.
      base = pickBase(ctx, ilvl, spec.slot, spec.classId);
      const names = ctx.content.legendNames;
      extra.legend = {
        noun: ctx.rng.int(0, Math.max(0, names.nouns.length - 1)),
        proper: generateName(ctx, [2, 2]),
        lore: ctx.rng.int(0, Math.max(0, names.lore.length - 1)),
      };
      const count = rarity === "ancestral" ? 2 : 1;
      const procs = [];
      for (let i = 0; i < count; i++) procs.push(rollProc(ctx.rng, ilvl, { max }));
      extra.procs = procs;
    }
  } else if (rarity === "set") {
    const pool = setPiecesFor(ctx, ilvl).filter(
      ({ piece }) => !spec.slot || baseOf(ctx.content, piece.baseId).slot === spec.slot,
    );
    if (pool.length === 0) return generateEquipment(ctx, { ...spec, rarity: "legendary" });
    const { piece } = ctx.rng.pick(pool);
    base = baseOf(ctx.content, piece.baseId);
    extra.setPieceId = piece.id;
    extra.fixed = rollFixed(ctx, piece.fixed, ilvl, false);
  } else {
    base = pickBase(ctx, ilvl, spec.slot, spec.classId);
  }

  const slot = base.slot!;
  const [low, high] = AFFIX_COUNT[rarity];
  // Procedural legendaries have no fixed stats: one more affix instead.
  const count = ctx.rng.int(low, high) + (extra.legend ? 1 : 0);
  const exclude = new Set(Object.keys(extra.fixed ?? {}));
  let affixes: Affix[];
  if (rarity === "magic") {
    // Magic items read "Prefix Base Suffix": at most one of each.
    const types: Affix["type"][] =
      count === 2 ? ["prefix", "suffix"] : [ctx.rng.pick(["prefix", "suffix"] as const)];
    affixes = types.flatMap((type) => {
      const [affix] = pickAffixes(ctx, slot, 1, exclude, type);
      if (affix) exclude.add(affix.stat);
      return affix ? [affix] : [];
    });
  } else {
    affixes = pickAffixes(ctx, slot, count, exclude);
  }

  if (rarity === "rare" && ctx.rng.chance(MYTHIC_RARE_CHANCE)) {
    extra.procs = [rollProc(ctx.rng, ilvl, { strength: 0.6 })];
  }

  const material = pickMaterial(ctx, base, ilvl);
  const quality = max
    ? 100
    : Math.round(
        Math.min(100, Math.max(0, ctx.rng.float(0, 100) * 0.7 + ctx.rng.float(0, 100) * 0.3)),
      );
  const sigil = rollSigil(ctx, rarity, ilvl);
  const names = ctx.content.rareNames;
  return {
    uid: ctx.uid(),
    baseId: base.id,
    rarity,
    ilvl,
    identified: rarity === "common" || rarity === "magic",
    quantity: 1,
    implicit: rollImplicit(ctx, base, ilvl, max, material, quality),
    affixes: affixes.map((a) => rollAffix(ctx, a, ilvl, max)),
    fixed: extra.fixed ?? {},
    ...(extra.legendaryId ? { legendaryId: extra.legendaryId } : {}),
    ...(extra.setPieceId ? { setPieceId: extra.setPieceId } : {}),
    ...(extra.legend ? { legend: extra.legend } : {}),
    ...(extra.procs ? { procs: extra.procs } : {}),
    ...(rarity === "rare"
      ? {
          rareName: [
            ctx.rng.int(0, Math.min(names.en.first.length, names.fr.first.length) - 1),
            ctx.rng.int(0, Math.min(names.en.second.length, names.fr.second.length) - 1),
          ] as [number, number],
        }
      : {}),
    ...(material ? { material: material.id } : {}),
    quality,
    seed: serial(ctx),
    origin: spec.origin ?? { src: "craft", day: ctx.state.time.day },
    ...(sigil ? { sigil } : {}),
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
  /** Extra magic find (torments). */
  bonusMagicFind?: number;
  origin?: Origin;
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
  const magicFind =
    stats.magicFind * (source.bloodMoon ? 2 : 1) +
    (source.bloodMoon ? 100 : 0) +
    (source.bonusMagicFind ?? 0);
  const rolls = source.boss ? 3 : source.elite ? 2 : 1;
  let gotLegendary = false;

  for (let i = 0; i < rolls; i++) {
    const forced = i === 0 ? source.guaranteedRarity : undefined;
    if (!forced && !source.boss && !ctx.rng.chance(source.table.dropChance)) continue;
    let rarity = forced ?? rollRarity(ctx, source.table, magicFind, source.ilvl);
    if (source.boss && i === 0 && !RARE_PLUS.includes(rarity)) rarity = "rare";
    if (
      (rarity === "common" || rarity === "magic") &&
      source.ilvl <= EARLY_SET_ILVL &&
      ctx.rng.chance(EARLY_SET_CHANCE) &&
      setPiecesFor(ctx, source.ilvl).length > 0
    ) {
      rarity = "set";
    }
    if (rarity === "legendary" || rarity === "set" || rarity === "ancestral") gotLegendary = true;
    stow(
      ctx,
      source,
      generateEquipment(ctx, {
        ilvl: source.ilvl,
        rarity,
        classId: ctx.hero.classId,
        ...(source.origin ? { origin: source.origin } : {}),
      }),
    );
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
