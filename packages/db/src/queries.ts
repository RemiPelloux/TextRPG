import { and, desc, eq, gt, lt, sql } from "drizzle-orm";

import type { Db } from "./client";
import { actionLog, dailyRuns, heroes, pushSubscriptions, sessions, users } from "./schema";

export type HeroRow = typeof heroes.$inferSelect;

// --- Users & sessions --------------------------------------------------------

export async function createUser(db: Db): Promise<string> {
  const [row] = await db.insert(users).values({}).returning({ id: users.id });
  return row!.id;
}

export async function findUserByEmail(db: Db, email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return row;
}

export async function getUser(db: Db, id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function setCredentials(db: Db, userId: string, email: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ email, passwordHash }).where(eq(users.id, userId));
}

export async function createSession(db: Db, userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await db.insert(sessions).values({ tokenHash, userId, expiresAt });
}

export async function getSessionUser(db: Db, tokenHash: string) {
  const [row] = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row;
}

export async function deleteSession(db: Db, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function touchUser(db: Db, userId: string): Promise<void> {
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
}

/** Move every hero of a guest account to another account, then delete the guest. */
export async function mergeGuestInto(db: Db, guestId: string, userId: string): Promise<void> {
  if (guestId === userId) return;
  await db.transaction(async (tx) => {
    await tx.update(heroes).set({ userId }).where(eq(heroes.userId, guestId));
    await tx.delete(users).where(and(eq(users.id, guestId), sql`${users.email} is null`));
  });
}

// --- Heroes ------------------------------------------------------------------

export interface HeroColumns {
  name: string;
  level: number;
  paragon: number;
  power: number;
  deepestFloor: number;
  classId: string | null;
  schemaVersion: number;
}

export async function listHeroes(db: Db, userId: string) {
  return db
    .select({
      id: heroes.id,
      name: heroes.name,
      level: heroes.level,
      paragon: heroes.paragon,
      classId: heroes.classId,
      power: heroes.power,
      updatedAt: heroes.updatedAt,
    })
    .from(heroes)
    .where(eq(heroes.userId, userId))
    .orderBy(desc(heroes.updatedAt));
}

export async function countHeroes(db: Db, userId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(heroes).where(eq(heroes.userId, userId));
  return row?.n ?? 0;
}

export async function insertHero(db: Db, userId: string, columns: HeroColumns, state: unknown): Promise<string> {
  const [row] = await db
    .insert(heroes)
    .values({ userId, ...columns, state })
    .returning({ id: heroes.id });
  return row!.id;
}

export async function getHero(db: Db, userId: string, heroId: string): Promise<HeroRow | undefined> {
  const [row] = await db
    .select()
    .from(heroes)
    .where(and(eq(heroes.id, heroId), eq(heroes.userId, userId)))
    .limit(1);
  return row;
}

/**
 * Write a new state only if nobody else wrote since we read `version` (double click, two tabs).
 * Returns false on conflict; the caller reloads and retries or reports it.
 */
export async function saveHero(
  db: Db,
  heroId: string,
  version: number,
  columns: HeroColumns,
  state: unknown,
  action?: unknown,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(heroes)
      .set({ ...columns, state, version: version + 1, updatedAt: new Date() })
      .where(and(eq(heroes.id, heroId), eq(heroes.version, version)))
      .returning({ id: heroes.id });
    if (updated.length === 0) return false;
    if (action !== undefined) await tx.insert(actionLog).values({ heroId, action, version: version + 1 });
    return true;
  });
}

export async function deleteHero(db: Db, userId: string, heroId: string): Promise<void> {
  await db.delete(heroes).where(and(eq(heroes.id, heroId), eq(heroes.userId, userId)));
}

export async function pruneActionLog(db: Db, olderThan: Date): Promise<void> {
  await db.delete(actionLog).where(lt(actionLog.createdAt, olderThan));
}

// --- Leaderboards ------------------------------------------------------------

export async function topHeroes(db: Db, limit = 50) {
  return db
    .select({ id: heroes.id, name: heroes.name, level: heroes.level, paragon: heroes.paragon, power: heroes.power, classId: heroes.classId })
    .from(heroes)
    .orderBy(desc(heroes.paragon), desc(heroes.level), desc(heroes.power))
    .limit(limit);
}

export async function deepestHeroes(db: Db, limit = 50) {
  return db
    .select({ id: heroes.id, name: heroes.name, level: heroes.level, deepestFloor: heroes.deepestFloor, classId: heroes.classId })
    .from(heroes)
    .where(gt(heroes.deepestFloor, 0))
    .orderBy(desc(heroes.deepestFloor), desc(heroes.level))
    .limit(limit);
}

export async function recordDailyRun(db: Db, day: number, heroId: string, heroName: string, score: number): Promise<void> {
  await db.insert(dailyRuns).values({ day, heroId, heroName, score }).onConflictDoNothing();
}

export async function dailyLeaderboard(db: Db, day: number, limit = 50) {
  return db
    .select({ heroId: dailyRuns.heroId, heroName: dailyRuns.heroName, score: dailyRuns.score })
    .from(dailyRuns)
    .where(eq(dailyRuns.day, day))
    .orderBy(desc(dailyRuns.score), dailyRuns.createdAt)
    .limit(limit);
}

// --- Push --------------------------------------------------------------------

export async function savePushSubscription(
  db: Db,
  userId: string,
  heroId: string | null,
  endpoint: string,
  keys: { p256dh: string; auth: string },
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({ endpoint, userId, heroId, keys })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, heroId, keys } });
}

export async function deletePushSubscription(db: Db, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function pushTargets(db: Db) {
  return db
    .select({
      endpoint: pushSubscriptions.endpoint,
      keys: pushSubscriptions.keys,
      lastNotifiedAt: pushSubscriptions.lastNotifiedAt,
      heroId: pushSubscriptions.heroId,
      state: heroes.state,
    })
    .from(pushSubscriptions)
    .innerJoin(heroes, eq(heroes.id, pushSubscriptions.heroId));
}

export async function markNotified(db: Db, endpoint: string): Promise<void> {
  await db.update(pushSubscriptions).set({ lastNotifiedAt: new Date() }).where(eq(pushSubscriptions.endpoint, endpoint));
}
