/**
 * The content contract. Every JSON file in `data/` is validated against these schemas when the
 * package is imported, so a typo in game data fails fast instead of breaking a game session.
 */
import { z } from "zod";

/** Bilingual text. `frF` is the feminine French form, used by affixes when the base noun is feminine. */
export const Text = z.object({
  en: z.string().min(1),
  fr: z.string().min(1),
  frF: z.string().optional(),
});
export type Text = z.infer<typeof Text>;

export const SLOTS = [
  "weapon",
  "armor",
  "helm",
  "gloves",
  "boots",
  "amulet",
  "ring",
  "tool",
] as const;
export const Slot = z.enum(SLOTS);
export type Slot = z.infer<typeof Slot>;

export const STAT_KEYS = [
  "strength",
  "defense",
  "speed",
  "luck",
  "maxHealth",
  "maxEnergy",
  "damagePct",
  "critChance",
  "critDamage",
  "dodge",
  "lifeSteal",
  "thorns",
  "goldFind",
  "magicFind",
  "expBonus",
] as const;
export const StatKey = z.enum(STAT_KEYS);
export type StatKey = z.infer<typeof StatKey>;

export const CLASS_IDS = ["warrior", "ranger", "occultist"] as const;
export const ClassId = z.enum(CLASS_IDS);
export type ClassId = z.infer<typeof ClassId>;

export const RARITIES = ["common", "magic", "rare", "legendary", "set", "ancestral"] as const;
export const Rarity = z.enum(RARITIES);
export type Rarity = z.infer<typeof Rarity>;

const Range = z.tuple([z.number(), z.number()]).refine(([a, b]) => a <= b, "inverted range");
const StatRanges = z.partialRecord(StatKey, Range);
const StatValues = z.partialRecord(StatKey, z.number());

/** Ids of legendary / set powers. Their behaviour is implemented in the engine (systems/powers.ts). */
export const POWER_IDS = [
  "moonblade",
  "mystery_ring",
  "orc_trophy",
  "last_bastion",
  "vampire_fang",
  "thunderstep",
  "gambler",
  "ember_heart",
  "shadow_first",
  "dragonbane",
  "frost_core",
  "eclipse",
  "counter_dodge",
  "iron_reflect",
  "blood_frenzy",
  "soul_harvest",
] as const;
export const PowerId = z.enum(POWER_IDS);
export type PowerId = z.infer<typeof PowerId>;

export const STATUS_IDS = [
  "poison",
  "burn",
  "bleed",
  "stun",
  "weaken",
  "empower",
  "evasive",
  "chill",
] as const;
export const StatusId = z.enum(STATUS_IDS);
export type StatusId = z.infer<typeof StatusId>;

// --- Items -------------------------------------------------------------------

/** What an equipment base is made of: decides which materials it can roll. */
export const FAMILIES = ["metal", "leather", "cloth", "wood", "bone", "gem"] as const;
export const Family = z.enum(FAMILIES);
export type Family = z.infer<typeof Family>;

/**
 * Procedural power templates. Items, enchantments, sigils and generated legendaries carry
 * instances of these; the engine (procs.ts) implements them and the UI describes them.
 */
export const PROC_TEMPLATES = [
  "hit_burn",
  "hit_poison",
  "hit_bleed",
  "hit_chill",
  "hit_stun",
  "hit_weaken",
  "hit_lifesteal",
  "crit_damage",
  "crit_heal",
  "dodge_empower",
  "kill_heal",
  "start_evasive",
  "start_strike",
  "turn_strike",
  "struck_retaliate",
  "low_empower",
  "low_heal",
] as const;
export const ProcTemplate = z.enum(PROC_TEMPLATES);
export type ProcTemplate = z.infer<typeof ProcTemplate>;

export const ITEM_KINDS = [
  "equipment",
  "potion",
  "elixir",
  "scroll",
  "bait",
  "fish",
  "quest",
  "material",
] as const;
export const ItemKind = z.enum(ITEM_KINDS);
export type ItemKind = z.infer<typeof ItemKind>;

export const ItemBase = z.object({
  id: z.string(),
  name: Text,
  /** French grammatical gender of the noun, for affix agreement. */
  gender: z.enum(["m", "f"]).default("m"),
  kind: ItemKind,
  slot: Slot.optional(),
  family: Family.optional(),
  icon: z.string(),
  /** Minimum item level at which this base can drop. */
  level: z.number().int().min(1).default(1),
  price: z.number().int().min(0),
  /** Stats every copy has, scaled by item level. */
  implicit: StatRanges.default({}),
  weaponClass: ClassId.optional(),
  effect: z.object({ healPct: z.number().optional(), energy: z.number().optional() }).optional(),
  buff: z.object({ stat: StatKey, value: z.number(), fights: z.number().int() }).optional(),
  flavor: Text.optional(),
  sellable: z.boolean().default(true),
  /** False for items that never appear as random loot (quest items, starter gear...). */
  droppable: z.boolean().default(true),
  /** Can be sold at the market. */
  marketable: z.boolean().default(false),
});
export type ItemBase = z.infer<typeof ItemBase>;

export const AffixTier = z.object({ minIlvl: z.number().int(), range: Range });
export const Affix = z.object({
  id: z.string(),
  type: z.enum(["prefix", "suffix"]),
  name: Text,
  stat: StatKey,
  slots: z.array(Slot).min(1),
  weight: z.number().positive().default(10),
  tiers: z.array(AffixTier).min(1),
});
export type Affix = z.infer<typeof Affix>;

export const Legendary = z.object({
  id: z.string(),
  baseId: z.string(),
  name: Text,
  minIlvl: z.number().int().default(1),
  fixed: StatRanges,
  power: PowerId,
  powerText: Text,
  flavor: Text,
});
export type Legendary = z.infer<typeof Legendary>;

export const SetBonus = z.object({
  pieces: z.number().int().min(2),
  stats: StatValues.optional(),
  power: PowerId.optional(),
  text: Text,
});
export const ItemSet = z.object({
  id: z.string(),
  name: Text,
  minIlvl: z.number().int().default(1),
  pieces: z.array(z.object({ id: z.string(), baseId: z.string(), name: Text, fixed: StatRanges })),
  bonuses: z.array(SetBonus),
});
export type ItemSet = z.infer<typeof ItemSet>;

export const RareNames = z.object({
  en: z.object({ first: z.array(z.string()), second: z.array(z.string()) }),
  fr: z.object({ first: z.array(z.string()), second: z.array(z.string()) }),
});

// --- Enemies -----------------------------------------------------------------

const Mods = z.object({
  hp: z.number().default(1),
  atk: z.number().default(1),
  def: z.number().default(1),
  spd: z.number().default(1),
});

export const EnemyKind = z.object({
  id: z.string(),
  name: Text,
  /** French grammatical gender, for "l'Orc" / "la Araignée" style names. */
  gender: z.enum(["m", "f"]).default("m"),
  icon: z.string(),
  weight: z.number().positive(),
  minLevel: z.number().int().default(1),
  mods: Mods,
  /** Status applied by its attacks, if any. */
  onHit: z.object({ status: StatusId, chance: z.number(), turns: z.number().int() }).optional(),
  lore: Text,
});
export type EnemyKind = z.infer<typeof EnemyKind>;

export const Boss = z.object({
  id: z.string(),
  name: Text,
  title: Text,
  icon: z.string(),
  /** Counts as this enemy kind for quests and powers (e.g. dragonbane). */
  kind: z.string(),
  mods: Mods,
  /** Every N turns the boss winds up a heavy blow (x2.5) that Guard can absorb. */
  telegraphEvery: z.number().int().min(2).default(4),
  onHit: z.object({ status: StatusId, chance: z.number(), turns: z.number().int() }).optional(),
  lore: Text,
});
export type Boss = z.infer<typeof Boss>;

export const EliteMod = z.object({
  id: z.enum(["swift", "vampiric", "enraged", "armored", "venomous", "burning"]),
  name: Text,
});
export type EliteMod = z.infer<typeof EliteMod>;

export const DIFFICULTY_IDS = ["easy", "normal", "hard", "hell"] as const;
export const DifficultyId = z.enum(DIFFICULTY_IDS);
export type DifficultyId = z.infer<typeof DifficultyId>;

export const Difficulty = z.object({
  id: DifficultyId,
  name: Text,
  energy: z.number().int(),
  levelOffset: z.number().int(),
  mods: Mods,
  dropChance: z.number(),
  rarity: z.object({ magic: z.number(), rare: z.number(), legendary: z.number() }),
  goldMult: z.number(),
  expMult: z.number(),
  eliteChance: z.number(),
});
export type Difficulty = z.infer<typeof Difficulty>;

// --- Classes -----------------------------------------------------------------

export const SkillEffect = z.object({
  /** Damage multiplier per hit (1 = a normal attack). 0 for pure utility skills. */
  mult: z.number().default(1),
  hits: z.number().int().default(1),
  /** Bonus multiplier when the target is under `executeBelow` health ratio. */
  executeBelow: z.number().optional(),
  executeMult: z.number().optional(),
  /** Heal for this fraction of damage dealt. */
  drain: z.number().optional(),
  /** Status on the target. `power` is the per-turn damage as a fraction of the hit (DoTs). */
  status: z
    .object({
      id: StatusId,
      turns: z.number().int(),
      chance: z.number().default(1),
      power: z.number().default(0),
    })
    .optional(),
  /** Status on the user (buffs). */
  self: z.object({ id: StatusId, turns: z.number().int() }).optional(),
  guaranteedCrit: z.boolean().default(false),
});

export const Skill = z.object({
  id: z.string(),
  name: Text,
  text: Text,
  icon: z.string(),
  cooldown: z.number().int().min(1),
  unlockLevel: z.number().int(),
  classId: ClassId.nullable(),
  effect: SkillEffect,
});
export type Skill = z.infer<typeof Skill>;

export const Talent = z.object({
  id: z.string(),
  name: Text,
  text: Text,
  stat: StatKey,
  perRank: z.number(),
  maxRank: z.number().int(),
});
export type Talent = z.infer<typeof Talent>;

export const HeroClass = z.object({
  id: ClassId,
  name: Text,
  description: Text,
  icon: z.string(),
  passive: StatValues,
  talents: z.array(Talent),
});
export type HeroClass = z.infer<typeof HeroClass>;

// --- World -------------------------------------------------------------------

export const Npc = z.object({ id: z.string(), name: Text, title: Text, icon: z.string() });

export const Objective = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("kill"), target: z.string().optional(), count: z.number().int() }),
  z.object({ kind: z.literal("collect"), itemId: z.string(), count: z.number().int() }),
  z.object({ kind: z.literal("floor"), floor: z.number().int() }),
  z.object({ kind: z.literal("fish"), count: z.number().int() }),
  z.object({ kind: z.literal("identify"), count: z.number().int() }),
  z.object({ kind: z.literal("boss"), bossId: z.string() }),
  z.object({ kind: z.literal("level"), level: z.number().int() }),
  z.object({ kind: z.literal("hunt"), difficulty: DifficultyId, count: z.number().int() }),
]);
export type Objective = z.infer<typeof Objective>;

export const QuestTemplate = z.object({
  id: z.string(),
  type: z.enum(["story", "board", "daily"]),
  title: Text,
  text: Text,
  giver: z.string(),
  minLevel: z.number().int().default(1),
  objective: Objective,
  /** Rewards for board/daily quests are multiplied by the hero level. */
  reward: z.object({
    exp: z.number().int().default(0),
    gold: z.number().int().default(0),
    shards: z.number().int().default(0),
    itemId: z.string().optional(),
    rarity: Rarity.optional(),
  }),
  /** Story chain: the next quest unlocked when this one is turned in. */
  next: z.string().optional(),
  /** Dialog shown when the story quest is completed. */
  outro: Text.optional(),
});
export type QuestTemplate = z.infer<typeof QuestTemplate>;

export const Fish = z.object({
  id: z.string(),
  name: Text,
  icon: z.string(),
  rarity: Rarity,
  weight: z.number().positive(),
  /** Calendar months (1-12) where it can bite. Empty = all year. */
  months: z.array(z.number().int().min(1).max(12)).default([]),
  /** What the fish tends to do while hooked: the right reaction lands it. */
  temper: z.enum(["calm", "wild", "sly"]),
  rounds: z.number().int().min(1),
  price: z.number().int(),
  healPct: z.number().default(0),
  lore: Text,
});
export type Fish = z.infer<typeof Fish>;

export const EventOutcome = z.object({
  weight: z.number().positive(),
  text: Text,
  healPct: z.number().optional(),
  damagePct: z.number().optional(),
  gold: z.number().optional(),
  rarity: Rarity.optional(),
  buff: z.object({ stat: StatKey, value: z.number(), fights: z.number().int() }).optional(),
  energy: z.number().optional(),
  shards: z.number().optional(),
});
export const DungeonEvent = z.object({
  id: z.string(),
  title: Text,
  text: Text,
  choices: z.array(z.object({ label: Text, outcomes: z.array(EventOutcome).min(1) })).min(2),
});
export type DungeonEvent = z.infer<typeof DungeonEvent>;

export const Building = z.object({
  id: z.enum(["forge", "satchel", "market", "alchemist"]),
  name: Text,
  text: Text,
  icon: z.string(),
  levels: z.array(
    z.object({ gold: z.number().int(), shards: z.number().int(), value: z.number() }),
  ),
});
export type Building = z.infer<typeof Building>;

export const COUNTERS = [
  "kills",
  "elitesKilled",
  "bossesKilled",
  "crits",
  "hellWins",
  "closeCalls",
  "legendariesFound",
  "setPiecesFound",
  "itemsIdentified",
  "itemsSalvaged",
  "upgradesDone",
  "fishCaught",
  "deepestFloor",
  "questsCompleted",
  "storyChapter",
  "dailyChallenges",
  "goldEarned",
  "potionsUsed",
  "level",
  "paragon",
  "restStreak",
] as const;
export const Counter = z.enum(COUNTERS);
export type Counter = z.infer<typeof Counter>;

export const Achievement = z.object({
  id: z.string(),
  name: Text,
  text: Text,
  icon: z.string(),
  counter: Counter,
  gte: z.number(),
  reward: z.object({ gold: z.number().int().default(0), shards: z.number().int().default(0) }),
});
export type Achievement = z.infer<typeof Achievement>;

// --- Procedural generation ---------------------------------------------------

/** A material changes an item's name, its implicit strength, and adds a small trait. */
export const Material = z.object({
  id: z.string(),
  /** EN: an adjective placed before the base ("Steel"). FR: a complement after it ("d'acier"). */
  name: Text,
  families: z.array(Family).min(1),
  minIlvl: z.number().int().min(1),
  weight: z.number().positive().default(10),
  /** Multiplies the base's implicit stats. */
  implicitMult: z.number().positive(),
  /** A small extra stat: base + perLevel × item level. */
  trait: z.object({ stat: StatKey, base: z.number(), perLevel: z.number() }).optional(),
});
export type Material = z.infer<typeof Material>;

const Scaled = z.tuple([z.number(), z.number()]); // [base, perLevel]

/**
 * Sigils are procedural sets: any magic or better item can bear one, and wearing several
 * items of the same sigil grants bonuses that scale with the lowest item level among them.
 */
export const Sigil = z.object({
  id: z.string(),
  name: Text,
  title: Text,
  icon: z.string(),
  /** Hex color used for the sigil's badge. */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  minIlvl: z.number().int().min(1),
  lore: Text,
  bonuses: z
    .array(
      z.object({
        pieces: z.number().int().min(2).max(7),
        stats: z.partialRecord(StatKey, Scaled).optional(),
        proc: z
          .object({
            template: ProcTemplate,
            chance: z.number().min(0).max(1).default(1),
            value: Scaled,
            turns: z.number().int().optional(),
            every: z.number().int().optional(),
          })
          .optional(),
      }),
    )
    .min(2),
});
export type Sigil = z.infer<typeof Sigil>;

/** Word lists for procedurally named legendaries: "Vharak's Lament" / "Complainte de Vharak". */
export const LegendNames = z.object({
  nouns: z.array(z.object({ en: z.string(), fr: z.string() })).min(20),
  lore: z.array(z.object({ en: z.string(), fr: z.string() })).min(8),
});
export type LegendNames = z.infer<typeof LegendNames>;
