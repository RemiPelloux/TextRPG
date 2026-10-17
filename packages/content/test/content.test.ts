import * as gi from "react-icons/gi";
import { describe, expect, it } from "vitest";

import { buildContent, RARITIES, SLOTS } from "../src";

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
