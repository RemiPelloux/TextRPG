/** Story chain, quest board, daily quests: progress tracking and rewards. */
import type { DifficultyId, QuestTemplate } from "@textrpg/content";

import type { Ctx } from "./ctx";
import { addToBag, countInBag, removeByBase, simpleItem } from "./items";
import { grantExp } from "./leveling";
import { generateEquipment } from "./loot";
import type { QuestInstance } from "./types";

export const MAX_BOARD_QUESTS = 3;
export const BOARD_OFFERS = 3;
export const DAILY_QUESTS = 3;

export function goalOf(template: QuestTemplate): number {
  const o = template.objective;
  switch (o.kind) {
    case "kill":
    case "collect":
    case "fish":
    case "identify":
    case "hunt":
      return o.count;
    case "floor":
      return o.floor;
    case "level":
      return o.level;
    case "boss":
      return 1;
  }
}

function instantiate(ctx: Ctx, template: QuestTemplate): QuestInstance {
  const scale = template.type === "story" ? 1 : ctx.hero.level;
  const r = template.reward;
  return {
    uid: ctx.uid("q"),
    templateId: template.id,
    type: template.type,
    progress: 0,
    goal: goalOf(template),
    reward: {
      exp: r.exp * scale,
      gold: r.gold * scale,
      shards: r.shards * scale,
      ...(r.itemId ? { itemId: r.itemId } : {}),
      ...(r.rarity ? { rarity: r.rarity } : {}),
    },
  };
}

export function firstStoryQuest(templates: Iterable<QuestTemplate>): string | null {
  const story = [...templates].filter((q) => q.type === "story");
  const pointed = new Set(story.map((q) => q.next));
  return story.find((q) => !pointed.has(q.id))?.id ?? null;
}

/** Activate the next story quest once the hero is strong enough. */
export function ensureStory(ctx: Ctx): void {
  const nextId = ctx.state.story.nextId;
  if (!nextId || ctx.state.quests.some((q) => q.templateId === nextId)) return;
  const template = ctx.content.quests.get(nextId)!;
  if (template.minLevel > ctx.hero.level) return;
  ctx.state.quests.push(instantiate(ctx, template));
  ctx.emit({ type: "storyUnlocked", templateId: nextId });
}

export function refreshBoard(ctx: Ctx): void {
  const active = new Set(ctx.state.quests.map((q) => q.templateId));
  const pool = [...ctx.content.quests.values()].filter(
    (q) => q.type === "board" && q.minLevel <= ctx.hero.level && !active.has(q.id),
  );
  ctx.state.board = {
    day: ctx.state.time.day,
    offers: ctx.rng.shuffle(pool).slice(0, BOARD_OFFERS).map((t) => instantiate(ctx, t)),
  };
}

export function refreshDaily(ctx: Ctx): void {
  ctx.state.quests = ctx.state.quests.filter((q) => q.type !== "daily");
  const pool = [...ctx.content.quests.values()].filter((q) => q.type === "daily" && q.minLevel <= ctx.hero.level);
  for (const template of ctx.rng.shuffle(pool).slice(0, DAILY_QUESTS)) {
    ctx.state.quests.push(instantiate(ctx, template));
  }
  ctx.state.daily = { day: ctx.state.time.day };
}

function bump(ctx: Ctx, match: (t: QuestTemplate) => boolean, amount = 1): void {
  for (const quest of ctx.state.quests) {
    const template = ctx.content.quests.get(quest.templateId)!;
    if (quest.progress >= quest.goal || !match(template)) continue;
    quest.progress = Math.min(quest.goal, quest.progress + amount);
    ctx.emit({ type: "questProgress", uid: quest.uid, progress: quest.progress, goal: quest.goal });
    if (quest.progress >= quest.goal) ctx.emit({ type: "questReady", uid: quest.uid, templateId: template.id });
  }
}

export function onKill(ctx: Ctx, kindId: string, opts: { bossId?: string; hunt?: DifficultyId }): void {
  bump(ctx, (t) => t.objective.kind === "kill" && (!t.objective.target || t.objective.target === kindId));
  if (opts.bossId) bump(ctx, (t) => t.objective.kind === "boss" && t.objective.bossId === opts.bossId);
  if (opts.hunt) bump(ctx, (t) => t.objective.kind === "hunt" && t.objective.difficulty === opts.hunt);
}

export function onFish(ctx: Ctx): void {
  bump(ctx, (t) => t.objective.kind === "fish");
}

export function onIdentify(ctx: Ctx, count = 1): void {
  bump(ctx, (t) => t.objective.kind === "identify", count);
}

/** Objectives that mirror the current state (level, items held, deepest floor). */
export function refreshDynamicProgress(ctx: Ctx): void {
  for (const quest of ctx.state.quests) {
    const o = ctx.content.quests.get(quest.templateId)!.objective;
    let value: number | undefined;
    if (o.kind === "level") value = ctx.hero.level;
    if (o.kind === "collect") value = countInBag(ctx.state, o.itemId);
    if (o.kind === "floor") value = ctx.state.counters.deepestFloor;
    if (value === undefined) continue;
    const progress = Math.min(quest.goal, value);
    if (progress !== quest.progress) {
      const wasReady = quest.progress >= quest.goal;
      quest.progress = progress;
      ctx.emit({ type: "questProgress", uid: quest.uid, progress, goal: quest.goal });
      if (!wasReady && progress >= quest.goal) ctx.emit({ type: "questReady", uid: quest.uid, templateId: quest.templateId });
    }
  }
}

export function acceptQuest(ctx: Ctx, uid: string): void {
  const offer = ctx.state.board.offers.find((q) => q.uid === uid);
  if (!offer) ctx.fail("unknownQuest");
  if (ctx.state.quests.filter((q) => q.type === "board").length >= MAX_BOARD_QUESTS) ctx.fail("questLogFull");
  ctx.state.board.offers = ctx.state.board.offers.filter((q) => q !== offer);
  ctx.state.quests.push(offer);
}

export function abandonQuest(ctx: Ctx, uid: string): void {
  const quest = ctx.state.quests.find((q) => q.uid === uid);
  if (!quest) ctx.fail("unknownQuest");
  if (quest.type === "story") ctx.fail("cannotAbandonStory");
  ctx.state.quests = ctx.state.quests.filter((q) => q !== quest);
}

export function turnIn(ctx: Ctx, uid: string): void {
  const quest = ctx.state.quests.find((q) => q.uid === uid);
  if (!quest) ctx.fail("unknownQuest");
  refreshDynamicProgress(ctx);
  if (quest.progress < quest.goal) ctx.fail("questNotDone");
  const template = ctx.content.quests.get(quest.templateId)!;
  if (template.objective.kind === "collect") removeByBase(ctx.state, template.objective.itemId, template.objective.count);

  ctx.state.quests = ctx.state.quests.filter((q) => q !== quest);
  const { reward } = quest;
  ctx.hero.gold += reward.gold;
  ctx.hero.shards += reward.shards;
  ctx.state.counters.goldEarned += reward.gold;
  if (reward.itemId) {
    const item = simpleItemOrGear(ctx, reward.itemId);
    ctx.emit(addToBag(ctx, item) ? { type: "loot", item } : { type: "loot", item, lost: true });
  }
  if (reward.rarity) {
    const item = generateEquipment(ctx, { ilvl: ctx.hero.level + 1, rarity: reward.rarity, classId: ctx.hero.classId });
    ctx.emit(addToBag(ctx, item) ? { type: "loot", item } : { type: "loot", item, lost: true });
  }
  ctx.state.counters.questsCompleted += 1;
  ctx.emit({ type: "questDone", templateId: template.id });
  if (template.type === "story") {
    ctx.state.story.chapter += 1;
    ctx.state.counters.storyChapter = ctx.state.story.chapter;
    ctx.state.story.nextId = template.next ?? null;
  }
  grantExp(ctx, reward.exp);
  ensureStory(ctx);
}

function simpleItemOrGear(ctx: Ctx, itemId: string) {
  const base = ctx.content.items.get(itemId)!;
  if (base.kind !== "equipment") return simpleItem(ctx, itemId);
  return {
    ...simpleItem(ctx, itemId),
    implicit: Object.fromEntries(Object.entries(base.implicit).map(([k, r]) => [k, r[1]])),
  };
}
