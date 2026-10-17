import type {
  Building,
  ClassId,
  Counter,
  DifficultyId,
  PowerId,
  ProcTemplate,
  Rarity,
  Slot,
  StatKey,
  StatusId,
} from "@textrpg/content";

import type { RngState } from "./rng";

export type Stats = Record<StatKey, number>;
export type StatBag = Partial<Record<StatKey, number>>;
export type BuildingId = Building["id"];
export type Attribute = "strength" | "defense" | "speed" | "luck";

// --- Items -------------------------------------------------------------------

export interface RolledAffix {
  id: string;
  tier: number;
  value: number;
}

/**
 * A procedural power instance. `value` is a percentage whose meaning depends on the template
 * (DoT strength, extra damage, healing...). See procs.ts.
 */
export interface Proc {
  t: ProcTemplate;
  chance: number;
  value: number;
  turns?: number;
  every?: number;
}

export interface Enchant {
  affix?: RolledAffix;
  proc?: Proc;
}

/** Where an item came from: every drop has a story. */
export interface Origin {
  src:
    | "start"
    | "hunt"
    | "dungeon"
    | "boss"
    | "weekly"
    | "quest"
    | "craft"
    | "market"
    | "event"
    | "class";
  enemy?: { proper: string; kindId: string; bossId?: string };
  floor?: number;
  day: number;
}

/** Name parts of a procedurally generated legendary. */
export interface LegendName {
  noun: number;
  proper: string;
  lore: number;
}

export interface Item {
  uid: string;
  baseId: string;
  rarity: Rarity;
  ilvl: number;
  identified: boolean;
  quantity: number;
  implicit: StatBag;
  affixes: RolledAffix[];
  /** Stats fixed by the legendary / set definition, rolled once. */
  fixed: StatBag;
  legendaryId?: string;
  setPieceId?: string;
  /** Indexes into the rare name lists, so the name exists in every language. */
  rareName?: [number, number];
  upgrade: number;
  locked: boolean;
  /** Procedural identity (v2). Absent on simple items like potions. */
  material?: string;
  /** 0-100: how well this copy was made. Scales the implicit stats. */
  quality?: number;
  /** Unique serial shown on the item ("№ 4F2K9"). */
  seed?: string;
  origin?: Origin;
  /** Procedural set affinity. */
  sigil?: string;
  /** Generated powers (procedural legendaries, mythic rares). */
  procs?: Proc[];
  legend?: LegendName;
  enchant?: Enchant;
}

// --- Hero --------------------------------------------------------------------

export const PARAGON_STATS = [
  "maxHealth",
  "damagePct",
  "critChance",
  "defense",
  "magicFind",
  "goldFind",
] as const;
export type ParagonStat = (typeof PARAGON_STATS)[number];

export interface Buff {
  sourceId: string;
  stat: StatKey;
  value: number;
  fights: number;
}

export interface Hero {
  name: string;
  level: number;
  exp: number;
  paragon: number;
  classId: ClassId | null;
  talents: Record<string, number>;
  paragonPoints: Partial<Record<ParagonStat, number>>;
  /** Base attributes: rolled at creation, raised by level-ups. */
  base: {
    maxHealth: number;
    maxEnergy: number;
    strength: number;
    defense: number;
    speed: number;
    luck: number;
  };
  health: number;
  energy: number;
  gold: number;
  shards: number;
  bag: Item[];
  equipment: Partial<Record<Slot, Item>>;
  buffs: Buff[];
  buildings: Record<BuildingId, number>;
  /** Endgame difficulty (0 = off), selectable at level 20. */
  torment: number;
}

/** A power extracted into the cube, usable from a cube slot. */
export interface CubePower {
  key: string;
  baseId: string;
  legendaryId?: string;
  legend?: LegendName;
  procs?: Proc[];
}

export interface CubeState {
  powers: CubePower[];
  slots: (string | null)[];
  /** Enchantment options waiting for the player's choice. */
  offer: { uid: string; options: Enchant[] } | null;
}

// --- Quests ------------------------------------------------------------------

export interface QuestInstance {
  uid: string;
  templateId: string;
  type: "story" | "board" | "daily";
  progress: number;
  goal: number;
  reward: { exp: number; gold: number; shards: number; itemId?: string; rarity?: Rarity };
}

// --- Combat ------------------------------------------------------------------

export interface Status {
  id: StatusId;
  turns: number;
  /** Damage per turn for damage-over-time statuses. */
  value: number;
}

export type CombatContext =
  | { type: "hunt"; difficulty: DifficultyId; bloodMoon: boolean }
  | { type: "dungeon"; floor: number; boss: boolean }
  | { type: "weekly" }
  | { type: "challenge"; index: number };

export interface EnemyInfo {
  proper: string;
  kindId: string;
  bossId?: string;
  elite?: string;
  level: number;
  telegraphEvery?: number;
  onHit?: { status: StatusId; chance: number; turns: number };
  icon: string;
}

export interface Side {
  stats: Stats;
  hp: number;
  maxHp: number;
  statuses: Status[];
}

export interface Combat {
  context: CombatContext;
  /** Generated powers active this fight (items, enchants, sigils, cube). */
  procs: Proc[];
  /** One-shot procs already used this fight. */
  procsUsed: string[];
  enemy: Side & { info: EnemyInfo; windup: boolean; enraged: boolean };
  hero: Side & { powers: PowerId[]; level: number };
  turn: number;
  cooldowns: Record<string, number>;
  guarding: boolean;
  bastionUsed: boolean;
  attacksMade: number;
  nextCrit: boolean;
  mysteryAttribute?: Attribute;
  night: boolean;
}

// --- Activities --------------------------------------------------------------

export type RoomType =
  "fight" | "elite" | "treasure" | "trap" | "event" | "campfire" | "boss" | "stairs";

export interface DungeonRun {
  floor: number;
  step: number;
  /** The doors offered at the current step (one or two). */
  doors: RoomType[];
  stash: Item[];
  stashGold: number;
  stashShards: number;
  /** A dungeon event waiting for the player's choice. */
  pendingEvent?: string;
  /** True when standing at the stairs between floors. */
  atStairs: boolean;
}

export type Reel = "pull" | "steady" | "slack";

export interface Fishing {
  fishId: string;
  round: number;
  rounds: number;
  /** What the fish is telling you (may be a lie for sly fish). */
  hint: Reel;
  answer: Reel;
  slips: number;
}

export interface Challenge {
  day: number;
  index: number;
  score: number;
  hp: number;
  potions: number;
  finished: boolean;
}

export interface MarketOffer {
  uid: string;
  item: Item;
  price: number;
  sold: boolean;
}

// --- State -------------------------------------------------------------------

export interface GameState {
  schemaVersion: number;
  rng: RngState;
  nextUid: number;
  hero: Hero;
  combat: Combat | null;
  dungeon: DungeonRun | null;
  fishing: Fishing | null;
  challenge: Challenge | null;
  quests: QuestInstance[];
  board: { day: number; offers: QuestInstance[] };
  daily: { day: number };
  story: { nextId: string | null; chapter: number };
  market: { day: number; offers: MarketOffer[] };
  counters: Record<Counter, number>;
  codex: {
    kills: Record<string, number>;
    legendaries: string[];
    setPieces: string[];
    fish: string[];
  };
  achievements: string[];
  pity: number;
  cube: CubeState;
  /** Consecutive defeats: enemies ease off a little (max 3). */
  mercy: number;
  time: {
    /** Player clock offset from UTC in minutes (as given by `Date#getTimezoneOffset`, negated sign handled in time.ts). */
    tzOffset: number;
    day: number;
    tickAt: number;
    lastRestDay: number | null;
    orcsToday: number;
    weeklyBossWeek: number | null;
    dungeonCheckpoint: number;
  };
}

// --- Actions -----------------------------------------------------------------

export type Action =
  | { type: "sync" }
  | { type: "rest" }
  | { type: "hunt.start"; difficulty: DifficultyId }
  | { type: "weekly.start" }
  | { type: "combat.attack" }
  | { type: "combat.skill"; skillId: string }
  | { type: "combat.potion"; uid?: string }
  | { type: "combat.guard" }
  | { type: "combat.flee" }
  | { type: "combat.auto" }
  | { type: "item.equip"; uid: string }
  | { type: "item.unequip"; slot: Slot }
  | { type: "item.use"; uid: string }
  | { type: "item.sell"; uid: string }
  | { type: "item.sellJunk" }
  | { type: "item.lock"; uid: string }
  | { type: "item.identify"; uid: string }
  | { type: "item.identifyAll" }
  | { type: "forge.upgrade"; uid: string }
  | { type: "forge.salvage"; uid: string }
  | { type: "forge.reroll"; uid: string; affixIndex: number }
  | { type: "alchemy.brew"; recipeId: string }
  | { type: "building.upgrade"; buildingId: BuildingId }
  | { type: "market.buy"; offerUid: string }
  | { type: "market.buyStock"; itemId: string }
  | { type: "quest.accept"; uid: string }
  | { type: "quest.abandon"; uid: string }
  | { type: "quest.turnIn"; uid: string }
  | { type: "class.choose"; classId: ClassId }
  | { type: "talent.learn"; talentId: string }
  | { type: "talent.reset" }
  | { type: "paragon.spend"; stat: ParagonStat }
  | { type: "dungeon.enter" }
  | { type: "dungeon.door"; index: number }
  | { type: "dungeon.choice"; index: number }
  | { type: "dungeon.descend" }
  | { type: "dungeon.leave" }
  | { type: "fish.cast" }
  | { type: "fish.reel"; move: Reel }
  | { type: "challenge.start" }
  | { type: "challenge.next" }
  | { type: "cube.transmute"; uids: [string, string, string] }
  | { type: "cube.enchant"; uid: string }
  | { type: "cube.enchantPick"; index: number }
  | { type: "cube.infuse"; uid: string; donorUid: string }
  | { type: "cube.reforge"; uid: string }
  | { type: "cube.extract"; uid: string }
  | { type: "cube.slot"; slot: number; key: string | null }
  | { type: "torment.set"; level: number };

export type ActionType = Action["type"];

// --- Events ------------------------------------------------------------------

export type Who = "hero" | "enemy";

export type GameEvent =
  | { type: "combatStart"; enemy: EnemyInfo; hp: number; context: CombatContext["type"] }
  | {
      type: "hit";
      by: Who;
      damage: number;
      crit: boolean;
      skillId?: string;
      extra?: boolean;
      proc?: ProcTemplate;
    }
  | { type: "procTriggered"; template: ProcTemplate }
  | { type: "mercy"; level: number }
  | { type: "transmuted"; rarity: Rarity }
  | { type: "enchantOffer"; uid: string; count: number }
  | { type: "enchanted"; uid: string }
  | { type: "infused"; uid: string; sigil: string }
  | { type: "reforged"; uid: string }
  | { type: "extracted"; key: string }
  | { type: "tormentSet"; level: number }
  | { type: "dodge"; by: Who }
  | { type: "statusApplied"; target: Who; status: StatusId; turns: number }
  | { type: "dot"; target: Who; status: StatusId; damage: number }
  | { type: "stunned"; target: Who }
  | { type: "heal"; target: Who; amount: number; source: string }
  | { type: "thorns"; target: Who; damage: number }
  | { type: "windup" }
  | { type: "heavyBlow"; damage: number; guarded: boolean }
  | { type: "enrage" }
  | { type: "bastion" }
  | { type: "guard" }
  | { type: "counter" }
  | { type: "mystery"; attribute: Attribute }
  | { type: "flee"; success: boolean }
  | { type: "victory"; exp: number; gold: number; shards: number; healed?: number }
  | { type: "defeat"; goldLost: number; stashLost: boolean }
  | { type: "loot"; item: Item; lost?: boolean }
  | { type: "goldGained"; amount: number; source: string }
  | { type: "shardsGained"; amount: number; source: string }
  | { type: "levelUp"; level: number; gains: Partial<Hero["base"]> }
  | { type: "paragonUp"; paragon: number }
  | { type: "classUnlocked" }
  | { type: "questProgress"; uid: string; progress: number; goal: number }
  | { type: "questReady"; uid: string; templateId: string }
  | { type: "questDone"; templateId: string }
  | { type: "storyUnlocked"; templateId: string }
  | { type: "achievement"; id: string }
  | { type: "rested"; streak: number }
  | { type: "energySpent"; amount: number }
  | { type: "itemUsed"; baseId: string; heal?: number; energy?: number }
  | { type: "equipped"; uid: string; slot: Slot }
  | { type: "sold"; gold: number; count: number }
  | { type: "identified"; uid: string; rarity: Rarity }
  | { type: "upgraded"; uid: string; level: number; success: boolean }
  | { type: "salvaged"; shards: number }
  | { type: "rerolled"; uid: string }
  | { type: "brewed"; itemId: string }
  | { type: "bought"; uid: string; price: number }
  | { type: "buildingUpgraded"; buildingId: BuildingId; level: number }
  | { type: "dungeonRoom"; room: RoomType; floor: number; step: number }
  | { type: "dungeonEvent"; eventId: string }
  | { type: "dungeonOutcome"; eventId: string; choice: number; outcome: number }
  | { type: "trap"; damage: number; dodged: boolean }
  | { type: "campfire"; heal: number }
  | { type: "treasure" }
  | { type: "stairs"; floor: number }
  | { type: "dungeonLeft"; floor: number; items: number; gold: number }
  | { type: "fishBite"; hint: Reel }
  | { type: "fishSlip"; hint: Reel }
  | { type: "fishCaught"; fishId: string }
  | { type: "fishEscaped"; fishId: string }
  | { type: "challengeScore"; score: number; finished: boolean };
