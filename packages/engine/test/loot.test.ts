import { describe, expect, it } from "vitest";

import type { Rarity } from "@textrpg/content";

import { computeStats, itemStats } from "../src";
import { generateEquipment, PITY_STEP, rollLoot, rollRarity } from "../src/loot";
import { content, ctxFor, newGame } from "./helpers";

describe("item generation", () => {
  const statOf = (id: string) => content.affixes.find((a) => a.id === id)!.stat;

  it.each<[Rarity, number, number]>([
    ["common", 0, 0],
    ["magic", 1, 2],
    ["rare", 3, 4],
  ])("%s items have %i-%i affixes on distinct stats", (rarity, low, high) => {
    const ctx = ctxFor(newGame(), rarity);
    for (let i = 0; i < 200; i++) {
      const item = generateEquipment(ctx, { ilvl: 12, rarity });
      expect(item.affixes.length).toBeGreaterThanOrEqual(low);
      expect(item.affixes.length).toBeLessThanOrEqual(high);
      const stats = item.affixes.map((a) => statOf(a.id));
      expect(new Set(stats).size).toBe(stats.length);
    }
  });

  it("magic items have at most one prefix and one suffix", () => {
    const ctx = ctxFor(newGame(), "magic-names");
    for (let i = 0; i < 200; i++) {
      const item = generateEquipment(ctx, { ilvl: 10, rarity: "magic" });
      const types = item.affixes.map((a) => content.affixes.find((x) => x.id === a.id)!.type);
      expect(types.filter((t) => t === "prefix").length).toBeLessThanOrEqual(1);
      expect(types.filter((t) => t === "suffix").length).toBeLessThanOrEqual(1);
    }
  });

  it("rare and better items drop unidentified and only grant implicit stats until identified", () => {
    const ctx = ctxFor(newGame(), "unid");
    const item = generateEquipment(ctx, { ilvl: 10, rarity: "rare" });
    expect(item.identified).toBe(false);
    expect(item.rareName).toBeDefined();
    const hidden = itemStats(item, content);
    const revealed = itemStats({ ...item, identified: true }, content);
    expect(Object.keys(revealed).length).toBeGreaterThan(Object.keys(hidden).length);
  });

  it("legendaries carry their power and set pieces their set", () => {
    const ctx = ctxFor(newGame(), "legend");
    const legendary = generateEquipment(ctx, { ilvl: 20, rarity: "legendary" });
    expect(content.legendaries.get(legendary.legendaryId!)).toBeDefined();
    const piece = generateEquipment(ctx, { ilvl: 20, rarity: "set" });
    expect(content.setPieces.get(piece.setPieceId!)).toBeDefined();
  });

  it("ancestral items roll every value at its maximum", () => {
    const ctx = ctxFor(newGame(), "ancestral");
    const item = generateEquipment(ctx, { ilvl: 20, rarity: "ancestral" });
    for (const affix of item.affixes) {
      const def = content.affixes.find((a) => a.id === affix.id)!;
      expect(affix.value).toBe(def.tiers[affix.tier]!.range[1]);
    }
  });

  it("higher item levels unlock higher affix tiers", () => {
    const ctx = ctxFor(newGame(), "tiers");
    const avgTier = (ilvl: number) => {
      let sum = 0;
      let n = 0;
      for (let i = 0; i < 100; i++) {
        for (const a of generateEquipment(ctx, { ilvl, rarity: "rare" }).affixes) {
          sum += a.tier;
          n += 1;
        }
      }
      return sum / n;
    };
    expect(avgTier(20)).toBeGreaterThan(avgTier(2) + 2);
  });

  it("upgrades raise every stat by 10% per level", () => {
    const ctx = ctxFor(newGame(), "upgrade");
    const item = generateEquipment(ctx, { ilvl: 10, rarity: "common", slot: "weapon" });
    const plain = itemStats(item, content).strength!;
    expect(itemStats({ ...item, upgrade: 5 }, content).strength).toBeCloseTo(plain * 1.5, 0);
  });
});

describe("rarity rolls", () => {
  it("magic find raises the odds of better loot", () => {
    const table = { magic: 0.25, rare: 0.06, legendary: 0.005 };
    const count = (mf: number) => {
      const ctx = ctxFor(newGame(), `mf${mf}`);
      let good = 0;
      for (let i = 0; i < 5000; i++) if (rollRarity(ctx, table, mf, 10) !== "common") good += 1;
      return good;
    };
    expect(count(200)).toBeGreaterThan(count(0) * 1.8);
  });

  it("bad-luck protection makes legendaries certain eventually", () => {
    const state = newGame();
    state.pity = Math.ceil(1 / PITY_STEP);
    const ctx = ctxFor(state, "pity");
    expect(["legendary", "set", "ancestral"]).toContain(
      rollRarity(ctx, { magic: 0, rare: 0, legendary: 0 }, 0, 10),
    );
  });

  it("pity resets when a legendary drops", () => {
    const state = newGame();
    state.pity = 5000;
    const ctx = ctxFor(state, "reset");
    rollLoot(ctx, {
      ilvl: 10,
      table: { magic: 0, rare: 0, legendary: 0, dropChance: 1 },
      kindId: "orc",
      elite: false,
      boss: false,
      into: "bag",
    });
    expect(state.pity).toBe(0);
  });
});

describe("quest items", () => {
  it("drop only while a quest needs them", () => {
    const state = newGame();
    const ctx = ctxFor(state, "teeth");
    const source = {
      ilvl: 3,
      table: { magic: 0, rare: 0, legendary: 0, dropChance: 0 },
      kindId: "orc",
      elite: false,
      boss: false,
      into: "bag" as const,
    };
    // No quest at all (daily quests could ask for teeth too).
    state.quests = [];
    for (let i = 0; i < 30; i++) rollLoot(ctx, source);
    expect(state.hero.bag.some((i) => i.baseId === "orc_teeth")).toBe(false);
    const template = [...content.quests.values()].find(
      (q) => q.objective.kind === "collect" && q.objective.itemId === "orc_teeth",
    )!;
    state.quests.push({
      uid: "q",
      templateId: template.id,
      type: template.type,
      progress: 0,
      goal: 5,
      reward: { exp: 0, gold: 0, shards: 0 },
    });
    for (let i = 0; i < 30; i++) rollLoot(ctx, source);
    expect(state.hero.bag.some((i) => i.baseId === "orc_teeth")).toBe(true);
  });
});

describe("derived stats", () => {
  it("include gear, class passives, talents, paragon and buffs", () => {
    const state = newGame();
    const before = computeStats(state, content);
    state.hero.level = 10;
    state.hero.classId = "warrior";
    state.hero.talents = { w_toughness: 2 };
    state.hero.paragon = 3;
    state.hero.paragonPoints = { maxHealth: 3 };
    state.hero.buffs = [{ sourceId: "elixir_vigor", stat: "maxHealth", value: 25, fights: 3 }];
    const after = computeStats(state, content);
    expect(after.maxHealth).toBe(before.maxHealth + 20 + 30 + 18 + 25);
  });

  it("activate set bonuses with enough pieces", () => {
    const state = newGame();
    const ctx = ctxFor(state, "set");
    const set = content.sets.get("ironwarden")!;
    const before = computeStats(state, content).maxHealth;
    for (const piece of set.pieces.slice(0, 2)) {
      const base = content.items.get(piece.baseId)!;
      state.hero.equipment[base.slot!] = {
        ...generateEquipment(ctx, { ilvl: 12, rarity: "common", slot: base.slot! }),
        baseId: base.id,
        setPieceId: piece.id,
        rarity: "set",
        implicit: {},
        fixed: {},
        affixes: [],
        identified: true,
      };
    }
    expect(computeStats(state, content).maxHealth).toBe(before + 40);
  });
});
