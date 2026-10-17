/**
 * Engine benchmark: cost of one action and size of a save, early and late in the game.
 * Usage: pnpm simulate:bench [iterations]
 * The server spends this per request on top of one DB read and one write (docs/SCALABILITY.md).
 */
import { getContent } from "@textrpg/content";
import { type Action, apply, type GameState } from "@textrpg/engine";

import { Bot, PROFILES } from "./bot";

const iterations = Number(process.argv[2] ?? 2000);
const content = getContent();

function veteran(days: number): { state: GameState; now: number } {
  const bot = new Bot(PROFILES[1]!, content, `bench-${days}`);
  bot.play(days);
  return { state: bot.state, now: bot.now };
}

function measure(label: string, state: GameState, now: number, action: Action): void {
  // Warm up the JIT first.
  for (let i = 0; i < 50; i++) apply(state, action, { now, content });
  const started = performance.now();
  for (let i = 0; i < iterations; i++) apply(state, action, { now, content });
  const perCall = (performance.now() - started) / iterations;
  console.log(
    `${label.padEnd(36)} ${perCall.toFixed(3).padStart(7)} ms   ${Math.round(1000 / perCall)} actions/s per core`,
  );
}

console.log(`Engine benchmark — ${iterations} iterations per row\n`);
for (const days of [0, 7, 30]) {
  const { state, now } =
    days === 0
      ? { state: new Bot(PROFILES[1]!, content, "bench-0").state, now: Date.UTC(2026, 0, 5, 9) }
      : veteran(days);
  const bytes = Buffer.byteLength(JSON.stringify(state));
  console.log(
    `day ${days}: level ${state.hero.level}, ${state.hero.bag.length} bag items, save ${(bytes / 1024).toFixed(1)} KiB`,
  );
  measure("  sync", state, now, { type: "sync" });
  const ready = { ...state, hero: { ...state.hero, energy: 50, health: 9999 } };
  measure("  hunt.start", ready, now, { type: "hunt.start", difficulty: "normal" });
  const fighting = apply(
    ready,
    { type: "hunt.start", difficulty: "normal" },
    { now, content },
  ).state;
  measure("  combat.auto (whole fight)", fighting, now, { type: "combat.auto" });
  console.log();
}
