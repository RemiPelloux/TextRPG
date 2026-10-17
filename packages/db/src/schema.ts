import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** A player. Guests have no email: they can claim the account later without losing anything. */
export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text(),
    passwordHash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

/** Sessions are stored as the SHA-256 of the cookie token, never the token itself. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/**
 * A hero is a document: the full GameState as versioned JSONB, plus a few columns copied out of
 * it for leaderboards. `version` is an optimistic lock bumped on every write.
 */
export const heroes = pgTable(
  "heroes",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    level: integer().notNull().default(1),
    paragon: integer().notNull().default(0),
    power: integer().notNull().default(0),
    deepestFloor: integer().notNull().default(0),
    classId: text(),
    state: jsonb().notNull(),
    schemaVersion: integer().notNull(),
    version: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("heroes_user_idx").on(t.userId),
    index("heroes_power_idx").on(t.paragon, t.level, t.power),
    index("heroes_depth_idx").on(t.deepestFloor),
  ],
);

/** Recent actions per hero: support, replays and abuse detection. Pruned after 30 days. */
export const actionLog = pgTable(
  "action_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    heroId: uuid()
      .notNull()
      .references(() => heroes.id, { onDelete: "cascade" }),
    action: jsonb().notNull(),
    version: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("action_log_hero_idx").on(t.heroId, t.createdAt)],
);

/** One daily challenge result per hero and day. */
export const dailyRuns = pgTable(
  "daily_runs",
  {
    day: integer().notNull(),
    heroId: uuid()
      .notNull()
      .references(() => heroes.id, { onDelete: "cascade" }),
    heroName: text().notNull(),
    score: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.day, t.heroId] }), index("daily_runs_score_idx").on(t.day, t.score)],
);

/** Web Push subscriptions (opt-in). */
export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keys: jsonb().$type<{ p256dh: string; auth: string }>().notNull(),
  heroId: uuid().references(() => heroes.id, { onDelete: "cascade" }),
  lastNotifiedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
