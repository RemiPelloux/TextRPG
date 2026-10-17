/**
 * Balance report: win rate, fight length and health left per level and difficulty, for a hero
 * wearing magic gear of their level. Usage: pnpm simulate [fightsPerCell] [classId]
 */
import { type ClassId, DIFFICULTY_IDS, getContent } from "@textrpg/content";
import { computeStats } from "@textrpg/engine";
import { enemyStats } from "@textrpg/engine/enemies";
import { measureHunts, typicalHero } from "@textrpg/engine/sim";

const content = getContent();
const fights = Number(process.argv[2] ?? 200);
const classId = (process.argv[3] ?? "warrior") as ClassId;
const now = Date.UTC(2026, 9, 16, 12);
const levels = [1, 2, 3, 5, 8, 10, 12, 15, 18, 20];

const pct = (v: number) => `${Math.round(v * 100)}%`.padStart(5);
console.log(`Balance report — ${fights} fights per cell, class ${classId}, magic gear\n`);
console.log(`level | ${DIFFICULTY_IDS.map((d) => d.padEnd(22)).join(" | ")}`);
console.log(`      | ${DIFFICULTY_IDS.map(() => "win  turns  hp left".padEnd(22)).join(" | ")}`);
for (const level of levels) {
  // Average several heroes: level-up and gear rolls vary a lot between two players.
  const heroes = [0, 1, 2, 3, 4].map((i) => typicalHero({ level, classId, seed: `sim-${level}-${i}`, content, now }));
  const hero = heroes[0]!;
  const cells = DIFFICULTY_IDS.map((difficulty) => {
    const reports = heroes.map((h) => measureHunts(h, difficulty, Math.ceil(fights / heroes.length), content, now));
    const avg = (key: keyof (typeof reports)[number]) => reports.reduce((sum, r) => sum + r[key], 0) / reports.length;
    const r = { winRate: avg("winRate"), avgTurns: avg("avgTurns"), avgHealthLeft: avg("avgHealthLeft") };
    return `${pct(r.winRate)} ${r.avgTurns.toFixed(1).padStart(5)}  ${pct(r.avgHealthLeft)}`.padEnd(22);
  });
  console.log(`${String(level).padStart(5)} | ${cells.join(" | ")}`);
  if (process.env.VERBOSE) {
    const h = computeStats(hero, content);
    const e = enemyStats(level, { hp: 1, atk: 1, def: 1, spd: 1 });
    console.log(`        hero hp ${h.maxHealth} str ${h.strength} def ${h.defense} spd ${h.speed} luck ${h.luck} dmg% ${h.damagePct} | enemy hp ${e.maxHealth} str ${e.strength} def ${e.defense} spd ${e.speed}`);
  }
}
console.log("\nTargets: easy ≈ 95%, normal ≈ 85%, hard ≈ 55%, hell ≈ 20%; 3-8 turns per fight.");
