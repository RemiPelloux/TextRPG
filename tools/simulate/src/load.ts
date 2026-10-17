/**
 * Load test of the real service path (validation → load → engine → optimistic save → action log)
 * against Postgres. Usage: DATABASE_URL=… pnpm simulate:load [heroes] [actionsPerHero] [concurrency]
 * Uses throwaway guest accounts; run it against a test database, never production.
 */
import { createDb } from "@textrpg/db";
import { act, createHero, startGuestSession } from "@textrpg/server";

const [heroes = 400, perHero = 10, concurrency = 20] = process.argv.slice(2).map(Number);
const url = process.env.DATABASE_URL ?? "postgres://textrpg:textrpg@localhost:5432/textrpg_test";
if (/prod/i.test(url))
  throw new Error("refusing to load-test something that looks like production");
const { db, close } = createDb(url);

const players = await Promise.all(
  Array.from({ length: heroes }, async (_, i) => {
    const { userId } = await startGuestSession(db);
    const heroId = await createHero(db, userId, { name: `Load${i}`, tzOffset: 0 });
    return { userId, heroId };
  }),
);

const latencies: number[] = [];
let errors = 0;
const seen = new Set<string>();
const EXPECTED = new Set(["notEnoughEnergy", "alreadyRested", "inCombat"]);
// Round-robin over heroes, so each player stays under the per-user rate limit (6 actions/s).
const queue = Array.from({ length: perHero }, () => players).flat();
const busy = new Set<string>();
const started = performance.now();
// Each worker plays whole fights for a hero: start, then auto until the fight ends.
async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    if (busy.has(job.heroId)) {
      queue.push(job);
      await new Promise((r) => setTimeout(r, 1));
      continue;
    }
    busy.add(job.heroId);
    const t0 = performance.now();
    const result = await act(db, job.userId, job.heroId, {
      type: "hunt.start",
      difficulty: "easy",
    });
    if (result.ok && result.view.combat)
      await act(db, job.userId, job.heroId, { type: "combat.auto" });
    // Auto-combat hands control back when health runs low: finish the fight by hand.
    else if (!result.ok && result.error === "inCombat")
      await act(db, job.userId, job.heroId, { type: "combat.flee" });
    else if (!result.ok) await act(db, job.userId, job.heroId, { type: "rest" });
    latencies.push(performance.now() - t0);
    busy.delete(job.heroId);
    if (!result.ok && !EXPECTED.has(result.error)) {
      errors += 1;
      seen.add(result.error);
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
const seconds = (performance.now() - started) / 1000;
latencies.sort((a, b) => a - b);
const p = (q: number) => latencies[Math.floor(q * (latencies.length - 1))]!.toFixed(1);
console.log(
  `${heroes} heroes × ${perHero} fights, concurrency ${concurrency}: ` +
    `${((latencies.length * 2) / seconds).toFixed(0)} requests/s, fight round-trip p50 ${p(0.5)} ms, p95 ${p(0.95)} ms, p99 ${p(0.99)} ms, unexpected errors ${errors} ${[...seen].join(" ")}`,
);
await close();
