import { PROC_TEMPLATES } from "@textrpg/content";
import type { ClientItem } from "@textrpg/engine";
import { describe, expect, it } from "vitest";

import { translator } from "@/lib/i18n";
import { narrate } from "@/lib/narrate";
import {
  content,
  enemyName,
  formatStat,
  itemName,
  legendLore,
  originText,
  procText,
} from "@/lib/text";

const fr = translator("fr");
const en = translator("en");

function item(partial: Partial<ClientItem>): ClientItem {
  return {
    uid: "u",
    baseId: "sword",
    rarity: "common",
    ilvl: 1,
    identified: true,
    quantity: 1,
    implicit: {},
    affixes: [],
    fixed: {},
    upgrade: 0,
    locked: false,
    ...partial,
  };
}

describe("item names", () => {
  const prefix = content.affixes.find((a) => a.type === "prefix" && a.name.frF)!;
  const suffix = content.affixes.find((a) => a.type === "suffix")!;
  const magic = item({
    rarity: "magic",
    affixes: [
      { id: prefix.id, tier: 0, value: 1 },
      { id: suffix.id, tier: 0, value: 1 },
    ],
  });

  it("compose magic names in each language's word order, with French agreement", () => {
    expect(itemName(magic, "en", en)).toBe(`${prefix.name.en} Sword ${suffix.name.en}`);
    expect(itemName(magic, "fr", fr)).toBe(`Épée ${prefix.name.frF} ${suffix.name.fr}`);
  });

  it("hide unidentified rares and show legendary names once known", () => {
    const hidden = item({ baseId: "longsword", rarity: "legendary", identified: false });
    expect(itemName(hidden, "fr", fr)).toBe("Épée longue inconnue");
    expect(
      itemName({ ...hidden, identified: true, legendaryId: "moon_half_sword" }, "en", en),
    ).toBe("Half-sword of the Moon");
  });
});

describe("enemy names", () => {
  it("elide and agree in French", () => {
    expect(enemyName({ proper: "Grak", kindId: "orc" }, "fr", fr)).toBe("Grak l'Orc");
    expect(enemyName({ proper: "Vessa", kindId: "spider", elite: "venomous" }, "fr", fr)).toContain(
      "Venimeuse",
    );
    expect(enemyName({ proper: "Grak", kindId: "goblin" }, "en", en)).toBe("Grak the Goblin");
  });
});

describe("stats and chronicle", () => {
  it("format percentages per locale", () => {
    expect(formatStat("critChance", 5, fr, "fr")).toBe("+5 % Chance de critique");
    expect(formatStat("strength", 3, en, "en")).toContain("+3");
  });

  it("narrates combat events", () => {
    const line = narrate(
      { type: "hit", by: "hero", damage: 23, crit: true },
      { t: fr, locale: "fr", hero: "Aria", enemy: "Grak", seed: 0 },
      0,
    );
    expect(line?.tone).toBe("crit");
    expect(line?.text).toContain("23");
  });
});

describe("generated items", () => {
  it("put the material in each language's place", () => {
    const iron = item({ material: "iron" });
    expect(itemName(iron, "en", en)).toBe("Iron Sword");
    expect(itemName(iron, "fr", fr)).toBe("Épée de fer");
  });

  it("never names the material twice", () => {
    const armor = [...content.items.values()].find((i) => / de /.test(i.name.fr) && i.slot)!;
    const named = item({ baseId: armor.id, material: "iron" });
    expect(itemName(named, "fr", fr)).toBe(armor.name.fr);
    expect(itemName(named, "en", en)).toBe(armor.name.en);
  });

  it("name procedural legendaries, eliding in French", () => {
    const legend = item({ rarity: "legendary", legend: { noun: 0, proper: "Aldric", lore: 0 } });
    const noun = content.legendNames.nouns[0]!;
    expect(itemName(legend, "en", en)).toBe(`Aldric's ${noun.en}`);
    expect(itemName(legend, "fr", fr)).toBe(`${noun.fr} d'Aldric`);
    expect(itemName({ ...legend, legend: { noun: 0, proper: "Morwen", lore: 0 } }, "fr", fr)).toBe(
      `${noun.fr} de Morwen`,
    );
    expect(legendLore({ lore: 0, proper: "Aldric" }, "en")).toContain("Aldric");
  });

  it("describe every power with its numbers, in both languages", () => {
    for (const template of PROC_TEMPLATES) {
      const proc = { t: template, chance: 0.25, value: 42, turns: 3, every: 4 };
      for (const [t, locale] of [
        [fr, "fr"],
        [en, "en"],
      ] as const) {
        const text = procText(proc, t, locale);
        expect(text).not.toContain("{");
        expect(text).not.toBe(`procs.${template}`);
      }
    }
    expect(procText({ t: "hit_burn", chance: 0.25, value: 30, turns: 3 }, en, "en")).toContain(
      "25%",
    );
    expect(procText({ t: "hit_burn", chance: 1, value: 35.8, turns: 3 }, fr, "fr")).toContain(
      "35,8",
    );
  });

  it("tell where an item came from", () => {
    expect(
      originText({ src: "hunt", day: 1, enemy: { proper: "Grak", kindId: "orc" } }, "fr", fr),
    ).toBe("Arraché à Grak l'Orc");
    expect(originText({ src: "dungeon", day: 1, floor: 7 }, "en", en)).toContain("7");
  });
});
