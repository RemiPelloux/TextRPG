import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type Action, GameError } from "../src";
import { act, fightOut, godMode, newGame, ofType, play, weakling } from "./helpers";

describe("hunting", () => {
  it("costs energy and starts a fight scaled by difficulty", () => {
    const { state, events } = act(newGame(), { type: "hunt.start", difficulty: "normal" });
    // Beginners pay half (rounded up) until the class unlocks.
    expect(state.hero.energy).toBe(18);
    expect(state.combat?.enemy.info.level).toBe(1);
    expect(ofType(events, "combatStart")).toHaveLength(1);
    const veteran = newGame();
    veteran.hero.level = 5;
    expect(act(veteran, { type: "hunt.start", difficulty: "normal" }).state.hero.energy).toBe(17);
  });

  it("refuses without enough energy", () => {
    const state = newGame();
    state.hero.energy = 1;
    expect(() => act(state, { type: "hunt.start", difficulty: "normal" })).toThrow(
      "notEnoughEnergy",
    );
  });

  it("only allows combat actions during a fight", () => {
    const { state } = act(newGame(), { type: "hunt.start", difficulty: "easy" });
    expect(() => act(state, { type: "rest" })).toThrow("inCombat");
    expect(() => act(state, { type: "hunt.start", difficulty: "easy" })).toThrow(GameError);
  });

  it("rewards a victory with exp, gold, kills and quest progress", () => {
    const start = act(godMode(newGame()), { type: "hunt.start", difficulty: "normal" }).state;
    const { state, events } = fightOut(start);
    const [victory] = ofType(events, "victory");
    expect(victory!.exp).toBeGreaterThan(0);
    expect(victory!.gold).toBeGreaterThan(0);
    expect(state.counters.kills).toBe(1);
    expect(state.hero.exp).toBe(victory!.exp);
    const killQuests = state.quests.filter((q) => q.progress > 0);
    expect(killQuests.length + ofType(events, "questProgress").length).toBeGreaterThan(0);
  });

  it("sends a defeated hero back with 10% health and 10% less gold, never dead", () => {
    const state = weakling(newGame());
    state.hero.gold = 100;
    const { state: after, events } = fightOut(
      act(state, { type: "hunt.start", difficulty: "hell" }).state,
    );
    expect(ofType(events, "defeat")[0]!.goldLost).toBe(10);
    expect(after.hero.gold).toBe(90);
    expect(after.hero.health).toBeGreaterThanOrEqual(1);
  });

  it("drinks potions mid-fight", () => {
    const state = act(newGame(), { type: "hunt.start", difficulty: "easy" }).state;
    state.combat!.hero.hp = 5;
    const { state: after, events } = act(state, { type: "combat.potion" });
    expect(ofType(events, "heal")[0]!.source).toBe("potion");
    expect(after.hero.bag.find((i) => i.baseId === "potion")?.quantity).toBe(2);
  });

  it("can flee from normal enemies", () => {
    let state = act(newGame("flee"), { type: "hunt.start", difficulty: "easy" }).state;
    state.combat!.hero.stats.speed = 999;
    state.combat!.hero.hp = state.combat!.hero.maxHp = 1e6;
    let fled = false;
    // Fleeing is capped at 90%: a few tries are always enough.
    for (let i = 0; i < 10 && state.combat; i++) {
      const result = act(state, { type: "combat.flee" });
      fled ||= result.events.some((e) => e.type === "flee" && e.success);
      state = result.state;
    }
    expect(fled).toBe(true);
    expect(state.combat).toBeNull();
  });
});

describe("bosses", () => {
  it("telegraph heavy blows that guard absorbs", () => {
    const state = godMode(newGame("boss"));
    state.hero.level = 6;
    let current = act(state, { type: "weekly.start" }).state;
    expect(current.combat?.enemy.info.bossId).toBe("blood_moon_wyrm");
    current.combat!.enemy.hp = current.combat!.enemy.maxHp = 1e9;
    let sawWindup = false;
    for (let i = 0; i < 10 && current.combat; i++) {
      const action: Action = current.combat.enemy.windup
        ? { type: "combat.guard" }
        : { type: "combat.attack" };
      const result = act(current, action);
      if (ofType(result.events, "windup").length) sawWindup = true;
      const heavy = ofType(result.events, "heavyBlow")[0];
      if (heavy) expect(heavy.guarded).toBe(true);
      current = result.state;
    }
    expect(sawWindup).toBe(true);
  });

  it("weekly boss is once per week", () => {
    const state = godMode(newGame());
    state.hero.level = 6;
    const { state: after } = fightOut(act(state, { type: "weekly.start" }).state);
    expect(() => act(after, { type: "weekly.start" })).toThrow("weeklyDone");
    expect(after.counters.bossesKilled).toBe(1);
  });

  it("cannot be fled", () => {
    const state = godMode(newGame());
    state.hero.level = 6;
    const fight = act(state, { type: "weekly.start" }).state;
    expect(() => act(fight, { type: "combat.flee" })).toThrow("cannotFlee");
  });
});

describe("skills", () => {
  it("go on cooldown", () => {
    const fight = act(newGame(), { type: "hunt.start", difficulty: "hard" }).state;
    fight.combat!.enemy.hp = fight.combat!.enemy.maxHp = 1e6;
    const after = act(fight, { type: "combat.skill", skillId: "heavy_strike" }).state;
    expect(() => act(after, { type: "combat.skill", skillId: "heavy_strike" })).toThrow(
      "skillCooldown",
    );
  });

  it("class skills need the class", () => {
    const fight = act(newGame(), { type: "hunt.start", difficulty: "easy" }).state;
    expect(() => act(fight, { type: "combat.skill", skillId: "shield_bash" })).toThrow(
      "unknownSkill",
    );
  });
});

describe("combat invariants (property-based)", () => {
  const difficulties = ["easy", "normal", "hard", "hell"] as const;

  it("auto-combat always ends, and health never exceeds its maximum", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.constantFrom(...difficulties),
        fc.integer({ min: 1, max: 20 }),
        (seed, difficulty, level) => {
          const state = newGame(seed);
          state.hero.level = level;
          let current = act(state, { type: "hunt.start", difficulty }).state;
          for (let i = 0; i < 100 && current.combat; i++) {
            const action: Action =
              current.combat.hero.hp < current.combat.hero.maxHp * 0.3
                ? { type: "combat.attack" }
                : { type: "combat.auto" };
            current = act(current, action).state;
            if (current.combat) {
              expect(current.combat.hero.hp).toBeLessThanOrEqual(current.combat.hero.maxHp);
              expect(current.combat.enemy.hp).toBeLessThanOrEqual(current.combat.enemy.maxHp);
            }
          }
          expect(current.combat).toBeNull();
          expect(current.hero.health).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 60 },
    );
  });

  it("never duplicates items", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 8 }), (seed) => {
        let state = godMode(newGame(seed));
        state.hero.energy = 1000;
        state.hero.base.maxEnergy = 1000;
        for (let i = 0; i < 15; i++)
          state = fightOut(act(state, { type: "hunt.start", difficulty: "hell" }).state).state;
        const uids = [...state.hero.bag, ...Object.values(state.hero.equipment)].map(
          (item) => item!.uid,
        );
        expect(new Set(uids).size).toBe(uids.length);
      }),
      { numRuns: 10 },
    );
  });

  it("same seed and same choices give the same fight", () => {
    const run = () =>
      play(newGame("same"), [
        { type: "hunt.start", difficulty: "normal" },
        { type: "combat.auto" },
      ]);
    expect(run()).toEqual(run());
  });
});
