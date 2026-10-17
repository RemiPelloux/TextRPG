import { PROC_TEMPLATES } from "@textrpg/content";
import { describe, expect, it } from "vitest";

import { computeStats, type GameState, itemStats, migrate, type Proc } from "../src";
import { generateEquipment, rollAffix } from "../src/loot";
import { rollProc } from "../src/procs";
import { activeProcs, sigilCounts } from "../src/stats";
import { act, content, ctxFor, fightOut, godMode, newGame, ofType } from "./helpers";

describe("the item generator", () => {
  it("makes every drop one of a kind", () => {
    const ctx = ctxFor(newGame(), "unique");
    const items = Array.from({ length: 1500 }, (_, i) =>
      generateEquipment(ctx, {
        ilvl: 1 + (i % 25),
        rarity: (["common", "magic", "rare"] as const)[i % 3]!,
      }),
    );
    const fingerprint = (item: (typeof items)[number]) =>
      JSON.stringify([
        item.baseId,
        item.material,
        item.quality,
        item.implicit,
        item.affixes,
        item.sigil,
        item.rareName,
      ]);
    expect(new Set(items.map((i) => i.seed)).size).toBeGreaterThan(1490);
    expect(new Set(items.map(fingerprint)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.material)).size).toBeGreaterThan(20);
  });

  it("rolls materials and quality that change the implicit stats", () => {
    const ctx = ctxFor(newGame(), "quality");
    const swords = Array.from({ length: 300 }, () =>
      generateEquipment(ctx, { ilvl: 18, rarity: "common", slot: "weapon" }),
    );
    expect(
      swords.every((s) => s.material && content.materials.some((m) => m.id === s.material)),
    ).toBe(true);
    const qualities = swords.map((s) => s.quality!);
    expect(Math.min(...qualities)).toBeLessThan(25);
    expect(Math.max(...qualities)).toBeGreaterThan(85);
  });

  it("records where each item came from", () => {
    let state = godMode(newGame("origin"));
    state.hero.base.maxEnergy = state.hero.energy = 1000;
    for (let i = 0; i < 25; i++)
      state = fightOut(act(state, { type: "hunt.start", difficulty: "hell" }).state).state;
    const gear = state.hero.bag.filter((i) => content.items.get(i.baseId)?.kind === "equipment");
    expect(gear.length).toBeGreaterThan(0);
    expect(gear.every((i) => i.origin?.src === "hunt" && i.origin.enemy?.kindId)).toBe(true);
  });

  it("generates procedural legendaries with a name, lore and powers", () => {
    const ctx = ctxFor(newGame(), "legend");
    const legends = Array.from({ length: 200 }, () =>
      generateEquipment(ctx, { ilvl: 15, rarity: "legendary" }),
    );
    const procedural = legends.filter((l) => l.legend);
    expect(procedural.length).toBeGreaterThan(80);
    expect(legends.some((l) => l.legendaryId)).toBe(true);
    for (const item of procedural) {
      expect(item.procs).toHaveLength(1);
      expect(content.legendNames.nouns[item.legend!.noun]).toBeDefined();
    }
    const powers = new Set(procedural.map((l) => l.procs![0]!.t));
    expect(powers.size).toBeGreaterThan(12);
  });

  it("ancestral items have two maxed powers and perfect quality", () => {
    const ctx = ctxFor(newGame(), "ancestral");
    for (let i = 0; i < 30; i++) {
      const item = generateEquipment(ctx, { ilvl: 30, rarity: "ancestral" });
      expect(item.quality).toBe(100);
      if (item.legend) expect(item.procs).toHaveLength(2);
    }
  });

  it("keeps scaling affixes past item level 20 (endgame)", () => {
    const ctx = ctxFor(newGame(), "overgrowth");
    const affix = content.affixes.find((a) => a.stat === "strength")!;
    const at20 = rollAffix(ctx, affix, 20, true).value;
    const at40 = rollAffix(ctx, affix, 40, true).value;
    expect(at40).toBeGreaterThan(at20 * 1.7);
  });
});

describe("generated powers", () => {
  it("roll every template with values that grow with item level", () => {
    const ctx = ctxFor(newGame(), "procs");
    for (const template of PROC_TEMPLATES) {
      const low = rollProc(ctx.rng, 1, { template, max: true });
      const high = rollProc(ctx.rng, 30, { template, max: true });
      expect(low.t).toBe(template);
      expect(high.value).toBeGreaterThanOrEqual(low.value);
      expect(low.chance).toBeGreaterThan(0);
    }
  });

  function fightWith(procs: Proc[], seed = "proc-fight") {
    const state = godMode(newGame(seed));
    state.hero.base.strength = 5;
    const sword = state.hero.equipment.weapon!;
    sword.procs = procs;
    sword.identified = true;
    let current = act(state, { type: "hunt.start", difficulty: "normal" }).state;
    current.combat!.enemy.hp = current.combat!.enemy.maxHp = 400;
    const events = [];
    for (let i = 0; i < 12 && current.combat; i++) {
      const result = act(current, { type: "combat.attack" });
      events.push(...result.events);
      current = result.state;
    }
    return { state: current, events };
  }

  it("fire in combat: statuses, extra strikes, retaliation", () => {
    const burn = fightWith([{ t: "hit_burn", chance: 1, value: 30, turns: 3 }]);
    expect(
      ofType(burn.events, "statusApplied").some((e) => e.status === "burn" && e.target === "enemy"),
    ).toBe(true);

    const rhythm = fightWith([{ t: "turn_strike", chance: 1, value: 50, every: 2 }]);
    expect(ofType(rhythm.events, "hit").some((e) => e.proc === "turn_strike")).toBe(true);
  });

  it("open fights without ever killing outright", () => {
    const state = godMode(newGame("opening"));
    state.hero.equipment.weapon!.procs = [{ t: "start_strike", chance: 1, value: 10_000 }];
    const { state: after, events } = act(state, { type: "hunt.start", difficulty: "easy" });
    expect(ofType(events, "hit").some((e) => e.proc === "start_strike")).toBe(true);
    expect(after.combat!.enemy.hp).toBe(1);
  });

  it("are hidden while the item is unidentified", () => {
    const state = newGame();
    state.hero.equipment.weapon!.procs = [{ t: "hit_burn", chance: 1, value: 30, turns: 3 }];
    state.hero.equipment.weapon!.identified = false;
    expect(activeProcs(state, content)).toHaveLength(0);
  });
});

describe("sigils (procedural sets)", () => {
  function wear(state: GameState, sigil: string, count: number, ilvl: number) {
    const ctx = ctxFor(state, `sigil-${sigil}-${count}`);
    const slots = ["helm", "armor", "gloves", "boots", "amulet", "ring", "weapon"] as const;
    for (let i = 0; i < count; i++) {
      const item = generateEquipment(ctx, { ilvl, rarity: "magic", slot: slots[i]! });
      item.sigil = sigil;
      state.hero.equipment[slots[i]!] = item;
    }
  }

  it("grant bonuses from two pieces, even at level 1", () => {
    const sigil = [...content.sigils.values()].find((s) => s.minIlvl === 1)!;
    const state = newGame();
    state.hero.equipment = {};
    wear(state, sigil.id, 1, 1);
    const one = computeStats(state, content);
    wear(state, sigil.id, 2, 1);
    expect(sigilCounts(state).get(sigil.id)).toEqual({ count: 2, level: 1 });
    const two = computeStats(state, content);
    const bonus = sigil.bonuses.find((b) => b.pieces === 2)!;
    const [stat] = Object.keys(bonus.stats ?? {});
    if (stat) expect(two[stat as keyof typeof two]).toBeGreaterThan(one[stat as keyof typeof one]);
  });

  it("add their 4-piece power and scale with the lowest item level", () => {
    const sigil = [...content.sigils.values()][0]!;
    const low = newGame();
    low.hero.equipment = {};
    wear(low, sigil.id, 4, 2);
    const high = newGame();
    high.hero.equipment = {};
    wear(high, sigil.id, 4, 20);
    expect(
      activeProcs(low, content).some(
        (p) => p.t === sigil.bonuses.find((b) => b.pieces === 4)!.proc!.template,
      ),
    ).toBe(true);
    const lowProc = activeProcs(low, content)[0]!;
    const highProc = activeProcs(high, content)[0]!;
    expect(highProc.value).toBeGreaterThanOrEqual(lowProc.value);
  });

  it("favor sigils the hero already wears (smart loot)", () => {
    const sigil = [...content.sigils.values()].find((s) => s.minIlvl === 1)!;
    const state = newGame();
    state.hero.equipment.weapon!.sigil = sigil.id;
    const ctx = ctxFor(state, "smart");
    const drops = Array.from({ length: 600 }, () =>
      generateEquipment(ctx, { ilvl: 3, rarity: "rare" }),
    ).filter((i) => i.sigil);
    const share = drops.filter((i) => i.sigil === sigil.id).length / drops.length;
    expect(share).toBeGreaterThan(0.45);
  });
});

describe("the cube", () => {
  function rich(seed = "cube"): GameState {
    const state = newGame(seed);
    state.hero.gold = 100_000;
    state.hero.shards = 10_000;
    return state;
  }

  it("transmutes three items of a rarity into one of the next, aimed by the first item's slot", () => {
    const state = rich();
    const ctx = ctxFor(state, "transmute");
    const items = [
      generateEquipment(ctx, { ilvl: 4, rarity: "magic", slot: "boots" }),
      generateEquipment(ctx, { ilvl: 6, rarity: "magic", slot: "ring" }),
      generateEquipment(ctx, { ilvl: 5, rarity: "magic", slot: "helm" }),
    ];
    state.hero.bag.push(...items);
    const { state: after, events } = act(state, {
      type: "cube.transmute",
      uids: items.map((i) => i.uid) as [string, string, string],
    });
    expect(ofType(events, "transmuted")[0]!.rarity).toBe("rare");
    const result = ofType(events, "loot")[0]!.item;
    expect(content.items.get(result.baseId)!.slot).toBe("boots");
    expect(result.ilvl).toBe(6);
    expect(after.hero.bag.filter((i) => items.some((x) => x.uid === i.uid))).toHaveLength(0);
  });

  it("refuses mixed rarities", () => {
    const state = rich();
    const ctx = ctxFor(state, "mixed");
    const items = [
      generateEquipment(ctx, { ilvl: 4, rarity: "magic" }),
      generateEquipment(ctx, { ilvl: 4, rarity: "common" }),
      generateEquipment(ctx, { ilvl: 4, rarity: "magic" }),
    ];
    state.hero.bag.push(...items);
    expect(() =>
      act(state, {
        type: "cube.transmute",
        uids: items.map((i) => i.uid) as [string, string, string],
      }),
    ).toThrow("sameRarity");
  });

  it("enchants: three choices, one pick, stats change", () => {
    const state = rich("enchant");
    const sword = state.hero.equipment.weapon!;
    const offered = act(state, { type: "cube.enchant", uid: sword.uid }).state;
    expect(offered.cube.offer?.options).toHaveLength(3);
    const picked = act(offered, { type: "cube.enchantPick", index: 0 }).state;
    expect(picked.hero.equipment.weapon!.enchant).toEqual(offered.cube.offer!.options[0]);
    expect(picked.cube.offer).toBeNull();
    const option = offered.cube.offer!.options[0]!;
    if (option.affix)
      expect(Object.keys(itemStats(picked.hero.equipment.weapon!, content)).length).toBeGreaterThan(
        0,
      );
  });

  it("infuses a sigil and consumes the donor", () => {
    const state = rich("infuse");
    const ctx = ctxFor(state, "donor");
    const donor = generateEquipment(ctx, { ilvl: 3, rarity: "magic" });
    donor.sigil = [...content.sigils.keys()][0]!;
    state.hero.bag.push(donor);
    const after = act(state, {
      type: "cube.infuse",
      uid: state.hero.equipment.weapon!.uid,
      donorUid: donor.uid,
    }).state;
    expect(after.hero.equipment.weapon!.sigil).toBe(donor.sigil);
    expect(after.hero.bag.some((i) => i.uid === donor.uid)).toBe(false);
  });

  it("extracts a legendary power and slots it", () => {
    const state = rich("extract");
    const ctx = ctxFor(state, "legendary");
    let legendary = generateEquipment(ctx, { ilvl: 10, rarity: "legendary" });
    while (!legendary.legend) legendary = generateEquipment(ctx, { ilvl: 10, rarity: "legendary" });
    legendary.identified = true;
    state.hero.bag.push(legendary);
    let after = act(state, { type: "cube.extract", uid: legendary.uid }).state;
    const key = after.cube.powers[0]!.key;
    expect(() => act(after, { type: "cube.slot", slot: 1, key })).toThrow("slotLocked");
    after = act(after, { type: "cube.slot", slot: 0, key }).state;
    expect(activeProcs(after, content).some((p) => p.t === legendary.procs![0]!.t)).toBe(true);
  });

  it("reforges a rare's affixes", () => {
    const state = rich("reforge");
    const ctx = ctxFor(state, "rare");
    const rare = generateEquipment(ctx, { ilvl: 12, rarity: "rare" });
    rare.identified = true;
    state.hero.bag.push(rare);
    let changed = false;
    let current = state;
    for (let i = 0; i < 5 && !changed; i++) {
      current = act(current, { type: "cube.reforge", uid: rare.uid }).state;
      changed =
        JSON.stringify(current.hero.bag.find((x) => x.uid === rare.uid)!.affixes) !==
        JSON.stringify(rare.affixes);
    }
    expect(changed).toBe(true);
  });
});

describe("torments and mercy", () => {
  it("torments unlock at level 20 and make enemies stronger and richer", () => {
    const state = godMode(newGame("torment"));
    expect(() => act(state, { type: "torment.set", level: 1 })).toThrow("tormentLocked");
    state.hero.level = 20;
    state.hero.paragon = 6;
    const t3 = act(state, { type: "torment.set", level: 3 }).state;
    expect(() => act(state, { type: "torment.set", level: 4 })).toThrow("tormentLocked");
    const plain = act(state, { type: "hunt.start", difficulty: "normal" }).state;
    const hard = act(t3, { type: "hunt.start", difficulty: "normal" }).state;
    expect(hard.combat!.enemy.maxHp).toBeGreaterThan(plain.combat!.enemy.maxHp * 1.8);
    expect(hard.combat!.enemy.info.level).toBe(plain.combat!.enemy.info.level + 3);
  });

  it("mercy softens enemies after defeats and resets on a win", () => {
    let state = newGame("mercy");
    Object.assign(state.hero.base, { maxHealth: 10, strength: 0, defense: 0, speed: 0 });
    state.hero.equipment = {};
    state.hero.health = 10;
    state = fightOut(act(state, { type: "hunt.start", difficulty: "hell" }).state).state;
    expect(state.mercy).toBe(1);
    const { events } = act(state, { type: "hunt.start", difficulty: "easy" });
    expect(ofType(events, "mercy")[0]!.level).toBe(1);
    godMode(state);
    state = fightOut(act(state, { type: "hunt.start", difficulty: "easy" }).state).state;
    expect(state.mercy).toBe(0);
  });
});

describe("save migration", () => {
  it("upgrades a v1 save to v2", () => {
    const v2 = newGame();
    const v1 = JSON.parse(JSON.stringify(v2)) as GameState & Record<string, unknown>;
    v1.schemaVersion = 1;
    delete (v1 as Partial<GameState>).cube;
    delete (v1 as Partial<GameState>).mercy;
    delete (v1.hero as Partial<GameState["hero"]>).torment;
    delete v1.hero.equipment.weapon!.seed;
    delete v1.hero.equipment.weapon!.quality;
    const migrated = migrate(v1);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.cube.slots).toHaveLength(3);
    expect(migrated.hero.torment).toBe(0);
    expect(migrated.hero.equipment.weapon!.seed).toMatch(/^[0-9A-Z]{5}$/);
    expect(act(migrated, { type: "hunt.start", difficulty: "easy" }).state.combat).not.toBeNull();
  });
});
