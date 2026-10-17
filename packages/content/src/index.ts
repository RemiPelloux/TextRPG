import { z } from "zod";

import achievementsJson from "../data/achievements.json";
import affixesJson from "../data/affixes.json";
import buildingsJson from "../data/buildings.json";
import classesJson from "../data/classes.json";
import enemiesJson from "../data/enemies.json";
import eventsJson from "../data/events.json";
import fishJson from "../data/fish.json";
import itemsJson from "../data/items.json";
import legendariesJson from "../data/legendaries.json";
import questsJson from "../data/quests.json";
import rareNamesJson from "../data/rare-names.json";
import setsJson from "../data/sets.json";
import * as S from "./schema";

export * from "./schema";

export interface Content {
  items: Map<string, S.ItemBase>;
  affixes: S.Affix[];
  legendaries: Map<string, S.Legendary>;
  sets: Map<string, S.ItemSet>;
  /** Set piece id -> its set. */
  setPieces: Map<string, { set: S.ItemSet; piece: S.ItemSet["pieces"][number] }>;
  rareNames: z.infer<typeof S.RareNames>;
  enemyKinds: S.EnemyKind[];
  bosses: Map<string, S.Boss>;
  elites: S.EliteMod[];
  difficulties: Map<S.DifficultyId, S.Difficulty>;
  classes: Map<S.ClassId, S.HeroClass>;
  skills: Map<string, S.Skill>;
  npcs: Map<string, z.infer<typeof S.Npc>>;
  quests: Map<string, S.QuestTemplate>;
  fish: S.Fish[];
  events: S.DungeonEvent[];
  buildings: Map<S.Building["id"], S.Building>;
  achievements: S.Achievement[];
}

export class ContentError extends Error {}

function byId<T extends { id: string }>(list: T[], what: string): Map<T["id"], T> {
  const map = new Map<T["id"], T>();
  for (const entry of list) {
    if (map.has(entry.id)) throw new ContentError(`duplicate ${what} id "${entry.id}"`);
    map.set(entry.id, entry);
  }
  return map;
}

function parse<T extends z.ZodType>(schema: T, data: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ContentError(`${file}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function validate(c: Content): void {
  const need = (cond: boolean, msg: string) => {
    if (!cond) throw new ContentError(msg);
  };
  const kindIds = new Set([
    ...c.enemyKinds.map((k) => k.id),
    ...[...c.bosses.values()].map((b) => b.kind),
  ]);
  for (const item of c.items.values()) {
    need(
      item.kind !== "equipment" || item.slot !== undefined,
      `item ${item.id}: equipment needs a slot`,
    );
  }
  for (const l of c.legendaries.values()) {
    need(c.items.get(l.baseId)?.kind === "equipment", `legendary ${l.id}: bad base ${l.baseId}`);
  }
  for (const { piece } of c.setPieces.values()) {
    need(
      c.items.get(piece.baseId)?.kind === "equipment",
      `set piece ${piece.id}: bad base ${piece.baseId}`,
    );
  }
  for (const q of c.quests.values()) {
    need(c.npcs.has(q.giver), `quest ${q.id}: unknown giver ${q.giver}`);
    if (q.next) need(c.quests.has(q.next), `quest ${q.id}: unknown next ${q.next}`);
    if (q.reward.itemId)
      need(c.items.has(q.reward.itemId), `quest ${q.id}: unknown item ${q.reward.itemId}`);
    const o = q.objective;
    if (o.kind === "kill" && o.target)
      need(kindIds.has(o.target), `quest ${q.id}: unknown target ${o.target}`);
    if (o.kind === "collect")
      need(c.items.has(o.itemId), `quest ${q.id}: unknown item ${o.itemId}`);
    if (o.kind === "boss") need(c.bosses.has(o.bossId), `quest ${q.id}: unknown boss ${o.bossId}`);
  }
  need(c.difficulties.size === S.DIFFICULTY_IDS.length, "missing difficulty tiers");
  need(c.classes.size === S.CLASS_IDS.length, "missing classes");
  for (const s of c.skills.values()) {
    need(s.classId === null || c.classes.has(s.classId), `skill ${s.id}: unknown class`);
  }
}

export function buildContent(): Content {
  const fish = parse(z.array(S.Fish), fishJson, "fish.json");
  const items = [
    ...parse(z.array(S.ItemBase), itemsJson, "items.json"),
    // Every fish is also an inventory item (sold, eaten or brewed).
    ...fish.map((f) =>
      S.ItemBase.parse({
        id: f.id,
        name: f.name,
        kind: "fish",
        icon: f.icon,
        price: f.price,
        effect: f.healPct ? { healPct: f.healPct } : undefined,
        flavor: f.lore,
        droppable: false,
      }),
    ),
  ];
  const sets = parse(z.array(S.ItemSet), setsJson, "sets.json");
  const enemies = parse(
    z.object({
      kinds: z.array(S.EnemyKind),
      bosses: z.array(S.Boss),
      elites: z.array(S.EliteMod),
      difficulties: z.array(S.Difficulty),
    }),
    enemiesJson,
    "enemies.json",
  );
  const classes = parse(
    z.object({ classes: z.array(S.HeroClass), skills: z.array(S.Skill) }),
    classesJson,
    "classes.json",
  );
  const quests = parse(
    z.object({ npcs: z.array(S.Npc), quests: z.array(S.QuestTemplate) }),
    questsJson,
    "quests.json",
  );

  const setPieces: Content["setPieces"] = new Map();
  for (const set of sets) {
    for (const piece of set.pieces) {
      if (setPieces.has(piece.id)) throw new ContentError(`duplicate set piece ${piece.id}`);
      setPieces.set(piece.id, { set, piece });
    }
  }

  const content: Content = {
    items: byId(items, "item"),
    affixes: [...byId(parse(z.array(S.Affix), affixesJson, "affixes.json"), "affix").values()],
    legendaries: byId(
      parse(z.array(S.Legendary), legendariesJson, "legendaries.json"),
      "legendary",
    ),
    sets: byId(sets, "set"),
    setPieces,
    rareNames: parse(S.RareNames, rareNamesJson, "rare-names.json"),
    enemyKinds: [...byId(enemies.kinds, "enemy kind").values()],
    bosses: byId(enemies.bosses, "boss"),
    elites: enemies.elites,
    difficulties: byId(enemies.difficulties, "difficulty"),
    classes: byId(classes.classes, "class"),
    skills: byId(classes.skills, "skill"),
    npcs: byId(quests.npcs, "npc"),
    quests: byId(quests.quests, "quest"),
    fish: [...byId(fish, "fish").values()],
    events: [...byId(parse(z.array(S.DungeonEvent), eventsJson, "events.json"), "event").values()],
    buildings: byId(parse(z.array(S.Building), buildingsJson, "buildings.json"), "building"),
    achievements: [
      ...byId(
        parse(z.array(S.Achievement), achievementsJson, "achievements.json"),
        "achievement",
      ).values(),
    ],
  };
  validate(content);
  return content;
}

let cached: Content | undefined;

/** The validated game content (parsed once, then cached). */
export function getContent(): Content {
  cached ??= buildContent();
  return cached;
}
