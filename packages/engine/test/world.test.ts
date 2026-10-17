import { describe, expect, it } from "vitest";

import { type Action, CHALLENGE_FIGHTS, type GameState, STEPS_PER_FLOOR } from "../src";
import { simpleItem } from "../src/items";
import {
  act,
  content,
  ctxFor,
  fightOut,
  godMode,
  newGame,
  NOON,
  ofType,
  weakling,
} from "./helpers";

const story = () => [...content.quests.values()].filter((q) => q.type === "story");

describe("story", () => {
  it("starts with the first chapter and advances on turn-in", () => {
    let state = godMode(newGame());
    const first = state.quests.find((q) => q.type === "story")!;
    expect(first.templateId).toBe(story()[0]!.id);
    state.hero.energy = 1000;
    state.hero.base.maxEnergy = 1000;
    for (
      let i = 0;
      i < 40 && state.quests.find((q) => q.uid === first.uid)!.progress < first.goal;
      i++
    ) {
      state = fightOut(act(state, { type: "hunt.start", difficulty: "easy" }).state).state;
    }
    const { state: after, events } = act(state, { type: "quest.turnIn", uid: first.uid });
    expect(ofType(events, "questDone")[0]!.templateId).toBe(first.templateId);
    expect(after.story.chapter).toBe(1);
    expect(after.quests.some((q) => q.templateId === story()[0]!.next)).toBe(true);
  });

  it("cannot turn in unfinished quests or abandon story", () => {
    const state = newGame();
    const quest = state.quests.find((q) => q.type === "story")!;
    expect(() => act(state, { type: "quest.turnIn", uid: quest.uid })).toThrow("questNotDone");
    expect(() => act(state, { type: "quest.abandon", uid: quest.uid })).toThrow(
      "cannotAbandonStory",
    );
  });

  it("waits for the hero to reach the next chapter's level", () => {
    const state = newGame();
    const locked = story().find((q) => q.minLevel > 1)!;
    state.quests = state.quests.filter((q) => q.type !== "story");
    state.story.nextId = locked.id;
    expect(act(state, { type: "sync" }).state.quests.some((q) => q.templateId === locked.id)).toBe(
      false,
    );
    state.hero.level = locked.minLevel;
    expect(act(state, { type: "sync" }).state.quests.some((q) => q.templateId === locked.id)).toBe(
      true,
    );
  });
});

describe("board and dailies", () => {
  it("limits active board quests", () => {
    let state = newGame();
    state.hero.level = 15;
    state = act(state, { type: "sync" }, NOON + 86_400_000).state;
    for (const offer of [...state.board.offers])
      state = act(state, { type: "quest.accept", uid: offer.uid }, NOON + 86_400_000).state;
    expect(state.quests.filter((q) => q.type === "board").length).toBeLessThanOrEqual(3);
  });

  it("collect quests consume their items when turned in", () => {
    const state = newGame();
    const template = [...content.quests.values()].find(
      (q) => q.type === "board" && q.objective.kind === "collect",
    )!;
    const objective = template.objective;
    if (objective.kind !== "collect") throw new Error("not a collect quest");
    const ctx = ctxFor(state, "collect");
    state.quests.push({
      uid: "qc",
      templateId: template.id,
      type: "board",
      progress: 0,
      goal: objective.count,
      reward: { exp: 10, gold: 7, shards: 1 },
    });
    state.hero.bag.push(simpleItem(ctx, objective.itemId, objective.count + 1));
    const after = act(state, { type: "quest.turnIn", uid: "qc" }).state;
    expect(after.hero.bag.find((i) => i.baseId === objective.itemId)?.quantity).toBe(1);
    expect(after.hero.gold).toBe(state.hero.gold + 7);
  });
});

describe("dungeon", () => {
  function deeper(state: GameState, actions: number): GameState {
    let current = state;
    for (let i = 0; i < actions; i++) {
      const d = current.dungeon;
      if (!d) break;
      let action: Action;
      if (current.combat) action = { type: "combat.auto" };
      else if (d.pendingEvent) action = { type: "dungeon.choice", index: 0 };
      else if (d.atStairs) action = { type: "dungeon.descend" };
      else action = { type: "dungeon.door", index: 0 };
      current = act(current, action).state;
    }
    return current;
  }

  it("costs energy, tracks depth and keeps the stash only on the way out", () => {
    let state = godMode(newGame("dungeon"));
    state = act(state, { type: "dungeon.enter" }).state;
    expect(state.hero.energy).toBe(14);
    expect(state.dungeon!.doors).toHaveLength(2);
    expect(() => act(state, { type: "dungeon.leave" })).toThrow("notAtStairs");
    state = deeper(state, 40);
    expect(state.counters.deepestFloor).toBeGreaterThan(1);
    // Walk to the next stairs and leave.
    for (let i = 0; i < 40 && state.dungeon && !state.dungeon.atStairs; i++)
      state = deeper(state, 1);
    const stash = state.dungeon!.stash.length;
    const gold = state.hero.gold + state.dungeon!.stashGold;
    const { state: out, events } = act(state, { type: "dungeon.leave" });
    expect(out.dungeon).toBeNull();
    expect(out.hero.gold).toBe(gold);
    expect(ofType(events, "dungeonLeft")[0]!.items).toBe(stash);
  });

  it("guards the fifth floor with a boss that opens a shortcut", () => {
    let state = godMode(newGame("boss-floor"));
    state.time.dungeonCheckpoint = 5;
    state = act(state, { type: "dungeon.enter" }).state;
    for (let i = 0; i < 60 && state.dungeon && state.dungeon.doors[0] !== "boss"; i++)
      state = deeper(state, 1);
    expect(state.dungeon!.step).toBe(STEPS_PER_FLOOR - 1);
    state = act(state, { type: "dungeon.door", index: 0 }).state;
    expect(state.combat?.enemy.info.bossId).toBe("goblin_king");
    state = fightOut(state).state;
    expect(state.time.dungeonCheckpoint).toBe(6);
    expect(state.dungeon!.atStairs).toBe(true);
  });

  it("loses the stash on death", () => {
    let state = godMode(newGame("death"));
    state = act(state, { type: "dungeon.enter" }).state;
    state.dungeon!.stash.push(simpleItem(ctxFor(state), "potion"));
    state.dungeon!.doors = ["fight", "fight"];
    weakling(state);
    state = fightOut(act(state, { type: "dungeon.door", index: 0 }).state).state;
    expect(state.dungeon).toBeNull();
    expect(state.hero.bag.filter((i) => i.baseId === "potion")).toHaveLength(1);
  });
});

describe("fishing", () => {
  function angler(): GameState {
    const state = newGame("fish");
    const ctx = ctxFor(state, "rod");
    state.hero.equipment.tool = simpleItem(ctx, "fishing_rod");
    state.hero.bag.push(simpleItem(ctx, "fish_bait", 5));
    return state;
  }

  it("needs a rod and bait", () => {
    expect(() => act(newGame(), { type: "fish.cast" })).toThrow("noRod");
  });

  it("lands a fish when every move is right (the server knows the answer)", () => {
    let state = act(angler(), { type: "fish.cast" }).state;
    expect(state.fishing).not.toBeNull();
    for (let i = 0; i < 10 && state.fishing; i++)
      state = act(state, { type: "fish.reel", move: state.fishing.answer }).state;
    expect(state.counters.fishCaught).toBe(1);
    expect(state.codex.fish).toHaveLength(1);
  });

  it("blocks other activities while the line is in the water", () => {
    const state = act(angler(), { type: "fish.cast" }).state;
    expect(() => act(state, { type: "hunt.start", difficulty: "easy" })).toThrow("fishing");
  });
});

describe("daily challenge", () => {
  it("gives every player the same enemies, once a day", () => {
    const a = act(newGame("player-a"), { type: "challenge.start" }).state;
    const b = act(newGame("player-b"), { type: "challenge.start" }).state;
    expect(a.combat!.enemy.info).toEqual(b.combat!.enemy.info);
    expect(a.combat!.enemy.maxHp).toBe(b.combat!.enemy.maxHp);

    let state = a;
    for (let fight = 0; fight < CHALLENGE_FIGHTS && !state.challenge!.finished; fight++) {
      if (!state.combat) state = act(state, { type: "challenge.next" }).state;
      for (let i = 0; i < 100 && state.combat; i++)
        state = act(state, { type: "combat.auto" }).state;
      for (let i = 0; i < 100 && state.combat; i++)
        state = act(state, { type: "combat.attack" }).state;
    }
    expect(state.challenge!.finished).toBe(true);
    expect(state.challenge!.score).toBeGreaterThanOrEqual(0);
    expect(() => act(state, { type: "challenge.start" })).toThrow("challengeDone");
  });

  it("does not touch the real hero", () => {
    const state = newGame();
    state.hero.health = 42;
    const after = act(state, { type: "challenge.start" }).state;
    expect(after.combat!.hero.hp).toBe(300);
    expect(after.hero.health).toBe(42);
  });
});

describe("achievements", () => {
  it("unlock from counters and pay out once", () => {
    const state = newGame();
    const achievement = content.achievements.find((a) => a.counter === "kills")!;
    state.counters.kills = achievement.gte;
    const { state: after, events } = act(state, { type: "sync" });
    expect(after.achievements).toContain(achievement.id);
    expect(ofType(events, "achievement").map((e) => e.id)).toContain(achievement.id);
    expect(ofType(act(after, { type: "sync" }).events, "achievement")).toHaveLength(0);
  });
});
