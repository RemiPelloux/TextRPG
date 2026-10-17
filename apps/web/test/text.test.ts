import type { ClientItem } from "@textrpg/engine";
import { describe, expect, it } from "vitest";

import { translator } from "@/lib/i18n";
import { narrate } from "@/lib/narrate";
import { content, enemyName, formatStat, itemName } from "@/lib/text";

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
