/**
 * Progression report: bots play for weeks and we measure how long things take.
 * Usage: pnpm simulate:progression [days] [seedsPerProfile] [--check] [--json]
 * With --check, exits 1 when a median misses its target in docs/BALANCE.md.
 */
import { getContent } from "@textrpg/content";

import { Bot, type Milestones, PROFILES } from "./bot";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [daysArg, seedsArg] = args.filter((a) => !a.startsWith("--"));
const days = Number(daysArg ?? 30);
const seeds = Number(seedsArg ?? 6);
const content = getContent();

/** Targets, mostly in days of play (medians). Keep in sync with docs/BALANCE.md. */
export const TARGETS: Record<string, Record<string, [number, number]>> = {
  casual: {
    level5: [0.2, 2],
    level20: [14, 30],
    firstSigilBonus: [0, 3],
  },
  regular: {
    level5: [0.3, 1.5],
    level10: [3, 8],
    level20: [10, 21],
    firstCraft: [0, 1.5],
    firstSigilBonus: [0, 2],
    firstSet: [0, 3],
    firstLegendary: [0.5, 6],
    defeatsPer100Fights: [1.5, 10],
  },
  hardcore: {
    level20: [7, 16],
    torment: [2, 10],
    defeatsPer100Fights: [2, 12],
  },
};

function median(values: (number | undefined)[]): number | undefined {
  const sorted = values.filter((v): v is number => v !== undefined).sort((a, b) => a - b);
  if (sorted.length < values.length / 2) return undefined; // most bots never got there
  return sorted[Math.floor(sorted.length / 2)];
}

const fmt = (v: number | undefined) => (v === undefined ? "  —  " : v.toFixed(1).padStart(5));

const results: Record<string, Record<string, number | undefined>> = {};
const started = performance.now();
let actions = 0;
for (const profile of PROFILES) {
  const runs: Milestones[] = [];
  for (let i = 0; i < seeds; i++) {
    const bot = new Bot(profile, content, `progress-${profile.id}-${i}`);
    runs.push(bot.play(days));
    actions += bot.m.fights;
  }
  const at = (level: number) => median(runs.map((r) => r.levels[level]));
  const total = (key: "fights" | "defeats") => runs.reduce((s, r) => s + r[key], 0);
  const share = (d: "easy" | "normal" | "hard" | "hell") =>
    runs.reduce((s, r) => s + r.difficultyShare[d], 0) / total("fights");
  results[profile.id] = {
    level5: at(5),
    level10: at(10),
    level15: at(15),
    level20: at(20),
    firstSigilBonus: median(runs.map((r) => r.firstSigilBonus)),
    firstLegendary: median(runs.map((r) => r.firstLegendary)),
    firstSet: median(runs.map((r) => r.firstSet)),
    firstCraft: median(runs.map((r) => r.firstCraft)),
    firstTorment: median(runs.map((r) => r.firstTorment)),
    fightsPerDay: total("fights") / seeds / days,
    defeatsPer100Fights: (100 * total("defeats")) / total("fights"),
    finalLevel: median(runs.map((r) => r.finalLevel)),
    paragon: median(runs.map((r) => r.paragon)),
    torment: median(runs.map((r) => r.torment)),
    easy: share("easy"),
    normal: share("normal"),
    hard: share("hard"),
    hell: share("hell"),
  };
}
const elapsed = (performance.now() - started) / 1000;

if (flags.has("--json")) {
  console.log(JSON.stringify({ days, seeds, results }, null, 2));
} else {
  console.log(`Progression report — ${seeds} bots per profile, ${days} days, median day reached\n`);
  const rows: [string, string][] = [
    ["level5", "level 5"],
    ["level10", "level 10"],
    ["level15", "level 15"],
    ["level20", "level 20"],
    ["firstCraft", "first craft"],
    ["firstSigilBonus", "first sigil bonus"],
    ["firstLegendary", "first legendary"],
    ["firstSet", "first set item"],
    ["firstTorment", "first torment"],
    ["fightsPerDay", "fights / day"],
    ["defeatsPer100Fights", "defeats / 100 fights"],
    ["finalLevel", "final level"],
    ["paragon", "paragon"],
    ["torment", "torment"],
  ];
  console.log(`${"".padEnd(22)}${PROFILES.map((p) => p.id.padStart(10)).join("")}`);
  for (const [key, label] of rows) {
    console.log(
      `${label.padEnd(22)}${PROFILES.map((p) => fmt(results[p.id]![key]).padStart(10)).join("")}`,
    );
  }
  const pct = (v: number | undefined) => `${Math.round((v ?? 0) * 100)}%`;
  for (const p of PROFILES) {
    const r = results[p.id]!;
    console.log(
      `${p.id.padEnd(10)} plays easy ${pct(r.easy)}, normal ${pct(r.normal)}, hard ${pct(r.hard)}, hell ${pct(r.hell)}`,
    );
  }
  console.log(`\n${actions} fights simulated in ${elapsed.toFixed(1)}s`);
}

if (flags.has("--check")) {
  const misses: string[] = [];
  for (const [profile, targets] of Object.entries(TARGETS)) {
    for (const [key, [low, high]] of Object.entries(targets)) {
      const value = results[profile]?.[key];
      if (value === undefined || value < low || value > high)
        misses.push(`${profile}.${key} = ${value?.toFixed(2) ?? "never"} (target ${low}–${high})`);
    }
  }
  if (misses.length) {
    console.error(`\nBalance targets missed:\n  ${misses.join("\n  ")}`);
    process.exit(1);
  }
  console.log("\nAll balance targets met.");
}
