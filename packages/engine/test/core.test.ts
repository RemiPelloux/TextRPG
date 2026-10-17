import { describe, expect, it } from "vitest";

import { apply, expToNext, GameError, MAX_LEVEL, Rng, sanitizeName, TICK, toClientView } from "../src";
import { grantExp } from "../src/leveling";
import { act, content, ctxFor, newGame, NOON } from "./helpers";

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = Rng.fromSeed("x");
    const b = Rng.fromSeed("x");
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });

  it("stays within bounds and resumes from a saved state", () => {
    const rng = Rng.fromSeed("bounds");
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
    const saved = rng.state();
    const expected = rng.next();
    expect(new Rng(saved).next()).toBe(expected);
  });
});

describe("new game", () => {
  it("creates a hero with the original's starting kit", () => {
    const state = newGame();
    expect(state.hero.name).toBe("Aria");
    expect(state.hero.level).toBe(1);
    expect(state.hero.equipment.weapon?.baseId).toBe("sword");
    expect(state.hero.bag.find((i) => i.baseId === "potion")?.quantity).toBe(3);
    expect(state.quests.some((q) => q.type === "story")).toBe(true);
    expect(state.quests.filter((q) => q.type === "daily")).toHaveLength(3);
    expect(state.market.offers.length).toBe(6);
    expect(state.board.offers.length).toBeGreaterThan(0);
  });

  it("rolls attributes from the seed", () => {
    expect(newGame("a").hero.base).toEqual(newGame("a").hero.base);
  });

  it("sanitizes names", () => {
    expect(sanitizeName("  <script>Zed</script>  ")).toBe("scriptZedscript");
    expect(sanitizeName("Élodie d'Arc-en-Ciel")).toBe("Élodie d'Arc-en-Ciel");
    expect(sanitizeName("x".repeat(50))).toHaveLength(20);
  });
});

describe("leveling", () => {
  it("follows a growing curve and caps at 20", () => {
    expect(expToNext(1)).toBe(100);
    expect(expToNext(2)).toBeGreaterThan(expToNext(1));
    expect(expToNext(MAX_LEVEL)).toBeGreaterThan(0);
  });

  it("levels up with gains and full heal, keeping the remainder", () => {
    const state = newGame();
    state.hero.health = 10;
    const ctx = ctxFor(state);
    const before = { ...state.hero.base };
    grantExp(ctx, 130);
    expect(state.hero.level).toBe(2);
    expect(state.hero.exp).toBe(30);
    expect(state.hero.base.maxHealth).toBe(before.maxHealth + 10);
    expect(state.hero.health).toBe(state.hero.base.maxHealth);
    expect(ctx.events.some((e) => e.type === "levelUp")).toBe(true);
  });

  it("handles several level-ups at once and paragon beyond the cap", () => {
    const state = newGame();
    const ctx = ctxFor(state);
    grantExp(ctx, 10_000_000);
    expect(state.hero.level).toBe(MAX_LEVEL);
    expect(state.hero.paragon).toBeGreaterThan(0);
    expect(ctx.events.filter((e) => e.type === "levelUp")).toHaveLength(MAX_LEVEL - 1);
    expect(ctx.events.some((e) => e.type === "classUnlocked")).toBe(true);
  });
});

describe("apply", () => {
  it("never mutates its input and rejects illegal actions", () => {
    const state = newGame();
    const snapshot = JSON.stringify(state);
    expect(() => act(state, { type: "combat.attack" })).toThrow(GameError);
    act(state, { type: "hunt.start", difficulty: "easy" });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("regenerates energy over time, without banking while full", () => {
    let state = newGame();
    state = act(state, { type: "hunt.start", difficulty: "hell" }).state;
    state.combat = null;
    const spent = state.hero.energy;
    const later = act(state, { type: "sync" }, NOON + 3 * TICK).state;
    expect(later.hero.energy).toBe(spent + 3);
    const muchLater = act(later, { type: "sync" }, NOON + 1000 * TICK).state;
    expect(muchLater.hero.energy).toBe(20);
  });

  it("allows one rest per day and grows the campfire streak", () => {
    let state = act(newGame(), { type: "rest" }).state;
    expect(state.counters.restStreak).toBe(1);
    expect(() => act(state, { type: "rest" })).toThrow("alreadyRested");
    state = act(state, { type: "rest" }, NOON + 86_400_000).state;
    expect(state.counters.restStreak).toBe(2);
    state = act(state, { type: "rest" }, NOON + 4 * 86_400_000).state;
    expect(state.counters.restStreak).toBe(1);
  });

  it("refreshes market, board and dailies at midnight local time", () => {
    const state = newGame();
    const tomorrow = act(state, { type: "sync" }, NOON + 86_400_000).state;
    expect(tomorrow.time.day).toBe(state.time.day + 1);
    expect(tomorrow.market.offers[0]!.uid).not.toBe(state.market.offers[0]!.uid);
    expect(tomorrow.quests.filter((q) => q.type === "daily").map((q) => q.uid)).not.toEqual(
      state.quests.filter((q) => q.type === "daily").map((q) => q.uid),
    );
  });

  it("is reproducible: same state + same action = same result", () => {
    const state = newGame("repro");
    const a = apply(state, { type: "hunt.start", difficulty: "normal" }, { now: NOON, content });
    const b = apply(state, { type: "hunt.start", difficulty: "normal" }, { now: NOON, content });
    expect(a).toEqual(b);
  });
});

describe("client view", () => {
  it("hides the rng and unidentified properties", () => {
    const state = newGame();
    const ctx = ctxFor(state);
    state.hero.bag.push({
      uid: "secret",
      baseId: "longsword",
      rarity: "legendary",
      ilvl: 9,
      identified: false,
      quantity: 1,
      implicit: { strength: 8 },
      affixes: [{ id: content.affixes[0]!.id, tier: 0, value: 3 }],
      fixed: { critChance: 4 },
      legendaryId: "moon_half_sword",
      upgrade: 0,
      locked: false,
    });
    void ctx;
    const view = toClientView(state, content, NOON);
    const json = JSON.stringify(view);
    expect(json).not.toContain('"rng"');
    expect(json).not.toContain("moon_half_sword");
    const secret = view.hero.bag.find((i) => i.uid === "secret")!;
    expect(secret.affixes).toEqual([]);
    expect(secret.hiddenAffixes).toBe(1);
  });
});

describe("event redaction", () => {
  it("hides unidentified loot in events and in the dungeon stash", async () => {
    const { redactEvents } = await import("../src");
    const secret = { uid: "s", baseId: "longsword", rarity: "legendary" as const, ilvl: 9, identified: false, quantity: 1, implicit: {}, affixes: [{ id: "x", tier: 0, value: 1 }], fixed: { strength: 3 }, legendaryId: "moon_half_sword", upgrade: 0, locked: false };
    expect(JSON.stringify(redactEvents([{ type: "loot", item: secret }]))).not.toContain("moon_half_sword");
    const state = newGame();
    state.dungeon = { floor: 1, step: 0, doors: ["fight"], stash: [secret], stashGold: 0, stashShards: 0, atStairs: false };
    expect(JSON.stringify(toClientView(state, content, NOON))).not.toContain("moon_half_sword");
  });
});
