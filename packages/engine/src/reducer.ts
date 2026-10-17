/**
 * The whole game in one pure function: `apply(state, action, { now, content })`.
 * The server calls it for every player action; the client only animates the returned events.
 */
import type { Content } from "@textrpg/content";

import { nextChallengeFight, onChallengeEnd, startChallenge } from "./challenge";
import { Ctx, GameError } from "./ctx";
import {
  chooseEvent,
  descend,
  enterDungeon,
  leaveDungeon,
  onDungeonDefeat,
  onDungeonVictory,
  openDoor,
} from "./dungeon";
import * as cube from "./cube";
import * as economy from "./economy";
import { type CombatHooks, playCombat, setTorment, startHunt, startWeekly } from "./encounters";
import { cast, reel } from "./fishing";
import { migrate } from "./migrations";
import * as progression from "./progression";
import {
  abandonQuest,
  acceptQuest,
  ensureStory,
  refreshBoard,
  refreshDaily,
  refreshDynamicProgress,
  turnIn,
} from "./quests";
import { Rng } from "./rng";
import { computeStats } from "./stats";
import { syncTime } from "./time";
import type { Action, GameEvent, GameState } from "./types";

export interface ApplyOptions {
  now: number;
  content: Content;
}

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

const hooks: CombatHooks = { onDungeonVictory, onDungeonDefeat, onChallengeEnd };

/** Actions allowed while each activity is in progress. */
const DURING_COMBAT = new Set<Action["type"]>([
  "sync",
  "combat.attack",
  "combat.skill",
  "combat.potion",
  "combat.guard",
  "combat.flee",
  "combat.auto",
]);
const DURING_FISHING = new Set<Action["type"]>(["sync", "fish.reel"]);
const BLOCKED_IN_DUNGEON = new Set<Action["type"]>([
  "rest",
  "hunt.start",
  "weekly.start",
  "dungeon.enter",
  "fish.cast",
  "challenge.start",
  "challenge.next",
  "market.buy",
  "market.buyStock",
  "building.upgrade",
  "forge.upgrade",
  "forge.reroll",
  "forge.salvage",
  "alchemy.brew",
  "cube.transmute",
  "cube.enchant",
  "cube.enchantPick",
  "cube.infuse",
  "cube.reforge",
  "cube.extract",
  "cube.slot",
  "torment.set",
]);

function guard(ctx: Ctx, action: Action): void {
  const { state } = ctx;
  if (state.combat && !DURING_COMBAT.has(action.type)) ctx.fail("inCombat");
  if (!state.combat && action.type.startsWith("combat.")) ctx.fail("noCombat");
  if (state.fishing && !DURING_FISHING.has(action.type)) ctx.fail("fishing");
  if (state.dungeon && BLOCKED_IN_DUNGEON.has(action.type)) ctx.fail("inDungeon");
}

function dispatch(ctx: Ctx, action: Action): void {
  switch (action.type) {
    case "sync":
      return;
    case "rest":
      return progression.rest(ctx);
    case "hunt.start":
      return startHunt(ctx, action.difficulty);
    case "weekly.start":
      return startWeekly(ctx);
    case "combat.attack":
      return playCombat(ctx, { kind: "attack" }, hooks);
    case "combat.skill":
      return playCombat(ctx, { kind: "skill", skillId: action.skillId }, hooks);
    case "combat.potion":
      return playCombat(
        ctx,
        action.uid ? { kind: "potion", uid: action.uid } : { kind: "potion" },
        hooks,
      );
    case "combat.guard":
      return playCombat(ctx, { kind: "guard" }, hooks);
    case "combat.flee":
      return playCombat(ctx, { kind: "flee" }, hooks);
    case "combat.auto":
      return playCombat(ctx, "auto", hooks);
    case "item.equip":
      return economy.equip(ctx, action.uid);
    case "item.unequip":
      return economy.unequip(ctx, action.slot);
    case "item.use":
      return economy.useItem(ctx, action.uid);
    case "item.sell":
      return economy.sell(ctx, action.uid);
    case "item.sellJunk":
      return economy.sellJunk(ctx);
    case "item.lock":
      return economy.toggleLock(ctx, action.uid);
    case "item.identify":
      return economy.identify(ctx, action.uid);
    case "item.identifyAll":
      return economy.identifyAll(ctx);
    case "forge.upgrade":
      return economy.upgrade(ctx, action.uid);
    case "forge.salvage":
      return economy.salvage(ctx, action.uid);
    case "forge.reroll":
      return economy.reroll(ctx, action.uid, action.affixIndex);
    case "alchemy.brew":
      return economy.brew(ctx, action.recipeId);
    case "building.upgrade":
      return economy.upgradeBuilding(ctx, action.buildingId);
    case "market.buy":
      return economy.buyOffer(ctx, action.offerUid);
    case "market.buyStock":
      return economy.buyStock(ctx, action.itemId);
    case "quest.accept":
      return acceptQuest(ctx, action.uid);
    case "quest.abandon":
      return abandonQuest(ctx, action.uid);
    case "quest.turnIn":
      return turnIn(ctx, action.uid);
    case "class.choose":
      return progression.chooseClass(ctx, action.classId);
    case "talent.learn":
      return progression.learnTalent(ctx, action.talentId);
    case "talent.reset":
      return progression.resetTalents(ctx);
    case "paragon.spend":
      return progression.spendParagon(ctx, action.stat);
    case "dungeon.enter":
      return enterDungeon(ctx);
    case "dungeon.door":
      return openDoor(ctx, action.index);
    case "dungeon.choice":
      return chooseEvent(ctx, action.index);
    case "dungeon.descend":
      return descend(ctx);
    case "dungeon.leave":
      return leaveDungeon(ctx);
    case "fish.cast":
      return cast(ctx);
    case "fish.reel":
      return reel(ctx, action.move);
    case "challenge.start":
      return startChallenge(ctx);
    case "challenge.next":
      return nextChallengeFight(ctx);
    case "cube.transmute":
      return cube.transmute(ctx, action.uids);
    case "cube.enchant":
      return cube.enchant(ctx, action.uid);
    case "cube.enchantPick":
      return cube.pickEnchant(ctx, action.index);
    case "cube.infuse":
      return cube.infuse(ctx, action.uid, action.donorUid);
    case "cube.reforge":
      return cube.reforge(ctx, action.uid);
    case "cube.extract":
      return cube.extract(ctx, action.uid);
    case "cube.slot":
      return cube.setCubeSlot(ctx, action.slot, action.key);
    case "torment.set":
      return setTorment(ctx, action.level);
    default: {
      const unknown: never = action;
      throw new GameError("unknownAction", { type: String((unknown as { type: string }).type) });
    }
  }
}

/**
 * Resolve one action. Never mutates the input: on a GameError the caller keeps the old state.
 */
export function apply(input: GameState, action: Action, opts: ApplyOptions): ApplyResult {
  const state = migrate(structuredClone(input));
  const rng = new Rng(state.rng);
  const ctx = new Ctx(state, opts.content, rng, opts.now);

  const { newDay } = syncTime(ctx);
  if (newDay || state.market.day !== state.time.day) economy.refreshMarket(ctx);
  if (newDay || state.board.day !== state.time.day) refreshBoard(ctx);
  if (newDay || state.daily.day !== state.time.day) refreshDaily(ctx);

  guard(ctx, action);
  dispatch(ctx, action);

  ensureStory(ctx);
  refreshDynamicProgress(ctx);
  progression.checkAchievements(ctx);
  // Buffs expire and gear changes: vitals never stay above their (new) maximum.
  const stats = computeStats(state, opts.content);
  state.hero.health = Math.min(state.hero.health, stats.maxHealth);
  state.hero.energy = Math.min(state.hero.energy, stats.maxEnergy);
  state.rng = rng.state();
  return { state, events: ctx.events };
}
