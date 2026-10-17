/** The chronicle: every engine event told as a line of text. This is the "Text" in TextRPG. */
import type { ClientItem, GameEvent } from "@textrpg/engine";

import type { Locale, T } from "./i18n";
import { content, enemyName, itemName, tx } from "./text";

export type Tone = "hero" | "enemy" | "crit" | "loot" | "good" | "bad" | "sys";

export interface Line {
  id: string;
  text: string;
  tone: Tone;
  rarity?: string;
}

export interface NarrateContext {
  t: T;
  locale: Locale;
  hero: string;
  enemy: string;
  /** Stable seed so the same event always gets the same wording variant. */
  seed: number;
}

export function narrate(
  event: GameEvent,
  ctx: NarrateContext,
  index: number,
): Omit<Line, "id"> | null {
  const { t, locale } = ctx;
  const v = ctx.seed + index;
  const base = { hero: ctx.hero, enemy: ctx.enemy, v };
  switch (event.type) {
    case "combatStart":
      return {
        text: t("log.combatStart", { ...base, enemy: enemyName(event.enemy, locale, t) }),
        tone: "sys",
      };
    case "hit": {
      const skill = event.skillId ? tx(content.skills.get(event.skillId)?.name, locale) : "";
      const params = { ...base, damage: event.damage, skill };
      if (event.by === "hero") {
        const key = event.crit
          ? "log.heroCrit"
          : skill
            ? "log.heroSkill"
            : event.extra
              ? "log.heroExtra"
              : "log.heroHit";
        return { text: t(key, params), tone: event.crit ? "crit" : "hero" };
      }
      return { text: t(event.crit ? "log.enemyCrit" : "log.enemyHit", params), tone: "enemy" };
    }
    case "dodge":
      return {
        text: t(event.by === "hero" ? "log.heroDodge" : "log.enemyDodge", base),
        tone: event.by === "hero" ? "good" : "sys",
      };
    case "statusApplied":
      return {
        text: t(event.target === "hero" ? "log.statusOnHero" : "log.statusOnEnemy", {
          ...base,
          status: t(`status.${event.status}`),
          turns: event.turns,
        }),
        tone: event.target === "hero" ? "bad" : "hero",
      };
    case "dot":
      return {
        text: t("log.dot", {
          ...base,
          who: event.target === "hero" ? ctx.hero : ctx.enemy,
          status: t(`status.${event.status}`),
          damage: event.damage,
        }),
        tone: event.target === "hero" ? "bad" : "hero",
      };
    case "stunned":
      return { text: t("log.stunned", base), tone: "hero" };
    case "heal":
      return event.target === "hero"
        ? { text: t(`log.heal.${event.source}`, { ...base, amount: event.amount }), tone: "good" }
        : { text: t("log.enemyHeal", { ...base, amount: event.amount }), tone: "enemy" };
    case "thorns":
      return {
        text: t("log.thorns", { ...base, damage: event.damage }),
        tone: event.target === "enemy" ? "hero" : "bad",
      };
    case "windup":
      return { text: t("log.windup", base), tone: "bad" };
    case "heavyBlow":
      return {
        text: t(event.guarded ? "log.heavyGuarded" : "log.heavy", {
          ...base,
          damage: event.damage,
        }),
        tone: event.guarded ? "good" : "bad",
      };
    case "enrage":
      return { text: t("log.enrage", base), tone: "bad" };
    case "bastion":
      return { text: t("log.bastion", base), tone: "crit" };
    case "guard":
      return { text: t("log.guard", base), tone: "hero" };
    case "counter":
      return { text: t("log.counter", base), tone: "hero" };
    case "mystery":
      return {
        text: t("log.mystery", { ...base, stat: t(`stats.${event.attribute}`) }),
        tone: "loot",
        rarity: "legendary",
      };
    case "flee":
      return {
        text: t(event.success ? "log.fled" : "log.fleeFailed", base),
        tone: event.success ? "sys" : "bad",
      };
    case "victory":
      return {
        text: t("log.victory", { ...base, exp: event.exp, gold: event.gold }),
        tone: "good",
      };
    case "defeat":
      return {
        text: t(event.stashLost ? "log.defeatDungeon" : "log.defeat", {
          ...base,
          gold: event.goldLost,
        }),
        tone: "bad",
      };
    case "loot":
      return {
        text: t(event.lost ? "log.lootLost" : "log.loot", {
          ...base,
          item: itemName(event.item as ClientItem, locale, t),
        }),
        tone: event.lost ? "bad" : "loot",
        rarity: event.item.rarity,
      };
    case "levelUp":
      return { text: t("log.levelUp", { ...base, level: event.level }), tone: "crit" };
    case "paragonUp":
      return { text: t("log.paragonUp", { ...base, paragon: event.paragon }), tone: "crit" };
    case "questReady":
      return {
        text: t("log.questReady", {
          ...base,
          quest: tx(content.quests.get(event.templateId)?.title, locale),
        }),
        tone: "good",
      };
    case "questDone":
      return {
        text: t("log.questDone", {
          ...base,
          quest: tx(content.quests.get(event.templateId)?.title, locale),
        }),
        tone: "good",
      };
    case "storyUnlocked":
      return {
        text: t("log.storyUnlocked", {
          ...base,
          quest: tx(content.quests.get(event.templateId)?.title, locale),
        }),
        tone: "sys",
      };
    case "achievement":
      return {
        text: t("log.achievement", {
          ...base,
          name: tx(content.achievements.find((a) => a.id === event.id)?.name, locale),
        }),
        tone: "crit",
      };
    case "rested":
      return { text: t("log.rested", { ...base, streak: event.streak }), tone: "good" };
    case "itemUsed":
      return {
        text: t("log.used", { ...base, item: tx(content.items.get(event.baseId)?.name, locale) }),
        tone: "good",
      };
    case "sold":
      return {
        text: t("log.sold", { ...base, gold: event.gold, count: event.count }),
        tone: "sys",
      };
    case "identified":
      return { text: t("log.identified", base), tone: "loot", rarity: event.rarity };
    case "upgraded":
      return {
        text: t(event.success ? "log.upgraded" : "log.upgradeFailed", {
          ...base,
          level: event.level,
        }),
        tone: event.success ? "good" : "bad",
      };
    case "salvaged":
      return { text: t("log.salvaged", { ...base, shards: event.shards }), tone: "sys" };
    case "brewed":
      return {
        text: t("log.brewed", { ...base, item: tx(content.items.get(event.itemId)?.name, locale) }),
        tone: "good",
      };
    case "bought":
      return { text: t("log.bought", { ...base, gold: event.price }), tone: "sys" };
    case "buildingUpgraded":
      return {
        text: t("log.building", {
          ...base,
          name: tx(content.buildings.get(event.buildingId)?.name, locale),
          level: event.level + 1,
        }),
        tone: "good",
      };
    case "dungeonRoom":
      return { text: t(`log.room.${event.room}`, base), tone: "sys" };
    case "trap":
      return {
        text: t(event.dodged ? "log.trapDodged" : "log.trap", { ...base, damage: event.damage }),
        tone: event.dodged ? "good" : "bad",
      };
    case "campfire":
      return { text: t("log.campfire", { ...base, amount: event.heal }), tone: "good" };
    case "treasure":
      return { text: t("log.treasure", base), tone: "loot", rarity: "rare" };
    case "stairs":
      return { text: t("log.stairs", { ...base, floor: event.floor }), tone: "sys" };
    case "dungeonLeft":
      return {
        text: t("log.dungeonLeft", { ...base, items: event.items, gold: event.gold }),
        tone: "good",
      };
    case "dungeonOutcome": {
      const outcome = content.events.find((e) => e.id === event.eventId)?.choices[event.choice]
        ?.outcomes[event.outcome];
      return outcome ? { text: tx(outcome.text, locale), tone: "sys" } : null;
    }
    case "fishBite":
      return { text: t(`log.fish.${event.hint}`, base), tone: "sys" };
    case "fishSlip":
      return {
        text: t("log.fishSlip", base) + " " + t(`log.fish.${event.hint}`, base),
        tone: "bad",
      };
    case "fishCaught":
      return {
        text: t("log.fishCaught", {
          ...base,
          fish: tx(content.fish.find((f) => f.id === event.fishId)?.name, locale),
        }),
        tone: "good",
      };
    case "fishEscaped":
      return { text: t("log.fishEscaped", base), tone: "bad" };
    case "challengeScore":
      return {
        text: t(event.finished ? "log.challengeDone" : "log.challengeScore", {
          ...base,
          score: event.score,
        }),
        tone: "crit",
      };
    case "classUnlocked":
      return { text: t("log.classUnlocked", base), tone: "crit" };
    case "shardsGained":
      return { text: t("log.shards", { ...base, amount: event.amount }), tone: "sys" };
    default:
      return null;
  }
}
