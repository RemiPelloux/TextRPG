import * as gi from "react-icons/gi";
import { describe, expect, it } from "vitest";

import { buildContent, FAMILIES, RARITIES, SLOTS } from "../src";

const content = buildContent();
const icons = gi as unknown as Record<string, unknown>;

describe("content", () => {
  it("loads and cross-validates every data file", () => {
    expect(content.items.size).toBeGreaterThan(40);
    expect(content.difficulties.size).toBe(4);
    expect(content.classes.size).toBe(3);
  });

  it("uses only icons that exist in react-icons/gi", () => {
    const used = [
      ...[...content.items.values()].map((i) => i.icon),
      ...content.enemyKinds.map((k) => k.icon),
      ...[...content.bosses.values()].map((b) => b.icon),
      ...[...content.classes.values()].map((c) => c.icon),
      ...[...content.skills.values()].map((s) => s.icon),
      ...[...content.npcs.values()].map((n) => n.icon),
      ...[...content.buildings.values()].map((b) => b.icon),
      ...content.achievements.map((a) => a.icon),
      ...[...content.sigils.values()].map((s) => s.icon),
    ];
    const missing = used.filter((name) => typeof icons[name] !== "function");
    expect(missing).toEqual([]);
  });

  it("has droppable equipment for every slot except tools", () => {
    for (const slot of SLOTS.filter((s) => s !== "tool")) {
      const bases = [...content.items.values()].filter((i) => i.slot === slot && i.droppable);
      expect(bases.length, slot).toBeGreaterThan(0);
    }
  });

  it("has affixes available for every equipment slot", () => {
    for (const slot of SLOTS.filter((s) => s !== "tool")) {
      expect(content.affixes.filter((a) => a.slots.includes(slot)).length, slot).toBeGreaterThan(2);
    }
  });

  it("defines a reachable story chain", () => {
    const story = [...content.quests.values()].filter((q) => q.type === "story");
    const pointedTo = new Set(story.map((q) => q.next).filter(Boolean));
    const roots = story.filter((q) => !pointedTo.has(q.id));
    expect(roots).toHaveLength(1);
    const seen = new Set<string>();
    let current = roots[0];
    while (current) {
      seen.add(current.id);
      current = current.next ? content.quests.get(current.next) : undefined;
    }
    expect(seen.size).toBe(story.length);
  });

  it("knows every rarity", () => {
    expect(RARITIES).toContain("ancestral");
  });
});

describe("procedural content", () => {
  it("has a material for every family from item level 1, with more as levels rise", () => {
    for (const family of FAMILIES) {
      const materials = content.materials.filter((m) => m.families.includes(family));
      expect(
        materials.some((m) => m.minIlvl === 1),
        family,
      ).toBe(true);
      expect(materials.length, family).toBeGreaterThanOrEqual(4);
    }
  });

  it("offers at least three sigils from level 1, each with a 2-piece bonus", () => {
    const sigils = [...content.sigils.values()];
    expect(sigils.length).toBeGreaterThanOrEqual(8);
    expect(sigils.filter((s) => s.minIlvl === 1).length).toBeGreaterThanOrEqual(3);
    for (const sigil of sigils) {
      expect(
        sigil.bonuses.some((b) => b.pieces === 2),
        sigil.id,
      ).toBe(true);
      expect(
        sigil.bonuses.some((b) => b.proc),
        sigil.id,
      ).toBe(true);
    }
  });

  it("has low-level handcrafted sets so set bonuses appear early", () => {
    expect([...content.sets.values()].filter((s) => s.minIlvl <= 2).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("has enough words to name procedural legendaries", () => {
    expect(content.legendNames.nouns.length).toBeGreaterThanOrEqual(30);
    expect(
      content.legendNames.lore.every((l) => l.en.includes("{proper}") && l.fr.includes("{proper}")),
    ).toBe(true);
  });
});
