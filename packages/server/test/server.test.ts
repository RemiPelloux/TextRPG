import {
  createDb,
  dailyLeaderboard,
  getHero,
  listHeroes,
  saveHero,
  schema,
  sql,
  topHeroes,
} from "@textrpg/db";
import { runMigrations } from "@textrpg/db/migrate";
import type { GameState } from "@textrpg/engine";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  act,
  AuthError,
  claimAccount,
  columnsOf,
  createHero,
  getView,
  login,
  logout,
  parseAction,
  RateLimiter,
  resolveSession,
  ServiceError,
  startGuestSession,
} from "../src";

const URL =
  process.env.TEST_DATABASE_URL ?? "postgres://textrpg:textrpg@localhost:5432/textrpg_test";
const { db, close } = createDb(URL);
const NOW = Date.UTC(2026, 9, 16, 12);

beforeAll(async () => {
  await runMigrations(URL);
});
beforeEach(async () => {
  await db.execute(
    sql`truncate ${schema.users}, ${schema.heroes}, ${schema.sessions}, ${schema.dailyRuns}, ${schema.actionLog}, ${schema.pushSubscriptions} cascade`,
  );
});
afterAll(async () => {
  await close();
});

describe("auth", () => {
  it("creates guest sessions that resolve, and logs out", async () => {
    const session = await startGuestSession(db);
    expect(await resolveSession(db, session.token)).toMatchObject({
      userId: session.userId,
      guest: true,
    });
    expect(await resolveSession(db, "forged")).toBeUndefined();
    await logout(db, session.token);
    expect(await resolveSession(db, session.token)).toBeUndefined();
  });

  it("claims a guest account, then logs in from another device keeping guest heroes", async () => {
    const first = await startGuestSession(db);
    await createHero(db, first.userId, { name: "Aria", tzOffset: 0 }, NOW);
    await claimAccount(db, first.userId, { email: "Hero@Example.com", password: "moonstone!" });
    expect((await resolveSession(db, first.token))?.guest).toBe(false);

    const second = await startGuestSession(db);
    await createHero(db, second.userId, { name: "Bram", tzOffset: 0 }, NOW);
    const session = await login(db, second.userId, {
      email: "hero@example.com",
      password: "moonstone!",
    });
    expect(session.userId).toBe(first.userId);
    expect((await listHeroes(db, first.userId)).map((h) => h.name).sort()).toEqual([
      "Aria",
      "Bram",
    ]);
  });

  it("rejects bad credentials, weak passwords and duplicate emails", async () => {
    const a = await startGuestSession(db);
    await expect(
      claimAccount(db, a.userId, { email: "nope", password: "longenough" }),
    ).rejects.toThrow("invalidEmail");
    await expect(
      claimAccount(db, a.userId, { email: "a@b.co", password: "short" }),
    ).rejects.toThrow("weakPassword");
    await claimAccount(db, a.userId, { email: "a@b.co", password: "longenough" });
    const b = await startGuestSession(db);
    await expect(
      claimAccount(db, b.userId, { email: "A@B.co", password: "longenough" }),
    ).rejects.toThrow("emailTaken");
    await expect(
      login(db, b.userId, { email: "a@b.co", password: "wrongpassword" }),
    ).rejects.toBeInstanceOf(AuthError);
  });
});

describe("game service", () => {
  async function hero() {
    const { userId } = await startGuestSession(db);
    const heroId = await createHero(db, userId, { name: "Aria", tzOffset: -120 }, NOW);
    return { userId, heroId };
  }

  it("limits heroes per account and validates names", async () => {
    const { userId } = await startGuestSession(db);
    await expect(createHero(db, userId, { name: "<>", tzOffset: 0 })).rejects.toBeInstanceOf(
      ServiceError,
    );
    for (const name of ["One", "Two", "Three"]) await createHero(db, userId, { name, tzOffset: 0 });
    await expect(createHero(db, userId, { name: "Four", tzOffset: 0 })).rejects.toThrow(
      "tooManyHeroes",
    );
  });

  it("runs actions authoritatively and persists them", async () => {
    const { userId, heroId } = await hero();
    const result = await act(db, userId, heroId, { type: "hunt.start", difficulty: "easy" }, NOW);
    expect(result.ok).toBe(true);
    const row = await getHero(db, userId, heroId);
    expect(row!.version).toBe(1);
    expect((row!.state as GameState).combat).not.toBeNull();
    const view = await getView(db, userId, heroId, NOW);
    expect(view.combat).not.toBeNull();
    expect(JSON.stringify(view)).not.toContain('"rng"');
  });

  it("returns game errors without saving", async () => {
    const { userId, heroId } = await hero();
    const result = await act(db, userId, heroId, { type: "combat.attack" }, NOW);
    expect(result).toMatchObject({ ok: false, error: "noCombat" });
    expect((await getHero(db, userId, heroId))!.version).toBe(0);
  });

  it("rejects malformed and foreign actions", async () => {
    const { userId, heroId } = await hero();
    expect(
      await act(db, userId, heroId, { type: "item.sell", uid: { $gt: "" } }, NOW),
    ).toMatchObject({ error: "invalidAction" });
    expect(parseAction({ type: "hunt.start", difficulty: "nightmare" })).toBeUndefined();
    const stranger = await startGuestSession(db);
    await expect(act(db, stranger.userId, heroId, { type: "rest" }, NOW)).rejects.toThrow(
      "notFound",
    );
  });

  it("uses an optimistic lock: a stale version never overwrites", async () => {
    const { userId, heroId } = await hero();
    const row = (await getHero(db, userId, heroId))!;
    const state = row.state as GameState;
    expect(await saveHero(db, heroId, row.version, columnsOf(state), state)).toBe(true);
    expect(await saveHero(db, heroId, row.version, columnsOf(state), state)).toBe(false);
    // The service reloads and replays on conflict.
    expect((await act(db, userId, heroId, { type: "rest" }, NOW)).ok).toBe(true);
  });

  it("records finished daily challenges on the leaderboard", async () => {
    const { userId, heroId } = await hero();
    let result = await act(db, userId, heroId, { type: "challenge.start" }, NOW);
    for (let i = 0; i < 400 && result.ok && !result.view.challenge?.finished; i++) {
      const action = result.view.combat ? { type: "combat.attack" } : { type: "challenge.next" };
      result = await act(db, userId, heroId, action, NOW + i * 1000);
    }
    expect(result.ok && result.view.challenge?.finished).toBe(true);
    const board = await dailyLeaderboard(db, result.ok ? result.view.challenge!.day : 0);
    expect(board).toHaveLength(1);
    expect((await topHeroes(db))[0]!.name).toBe("Aria");
  });
});

describe("rate limiter", () => {
  it("allows bursts then refills", () => {
    const limiter = new RateLimiter({ capacity: 3, refillPerSecond: 1 });
    expect([1, 2, 3, 4].map(() => limiter.take("u", 0))).toEqual([true, true, true, false]);
    expect(limiter.take("u", 1000)).toBe(true);
  });
});
