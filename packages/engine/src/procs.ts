/**
 * Procedural powers ("procs"): a small grammar of trigger × effect × magnitude. Generated
 * legendaries, mythic rares, enchantments, sigil bonuses and cube slots all produce Proc
 * instances; combat.ts calls the hooks below at the right moments.
 *
 * `value` is a percentage whose meaning depends on the template:
 *   hit_burn/poison/bleed → damage per turn, % of the hit     hit_lifesteal → % of damage healed
 *   crit_damage           → extra % damage on crits           crit_heal     → % of max health
 *   kill_heal / low_heal  → % of max health                   start_strike / turn_strike /
 *   struck_retaliate      → % of a normal hit
 */
import { PROC_TEMPLATES, type ProcTemplate } from "@textrpg/content";

import type { Rng } from "./rng";
import type { Proc } from "./types";

interface Range {
  chance: [number, number];
  value: [number, number];
  perLevel: number;
  turns?: number;
  every?: [number, number];
}

export const PROC_RANGES: Record<ProcTemplate, Range> = {
  hit_burn: { chance: [0.15, 0.3], value: [20, 35], perLevel: 0.6, turns: 3 },
  hit_poison: { chance: [0.15, 0.3], value: [20, 35], perLevel: 0.6, turns: 3 },
  hit_bleed: { chance: [0.15, 0.3], value: [20, 35], perLevel: 0.6, turns: 3 },
  hit_chill: { chance: [0.15, 0.25], value: [0, 0], perLevel: 0, turns: 2 },
  hit_weaken: { chance: [0.15, 0.25], value: [0, 0], perLevel: 0, turns: 2 },
  hit_stun: { chance: [0.06, 0.12], value: [0, 0], perLevel: 0, turns: 1 },
  hit_lifesteal: { chance: [1, 1], value: [4, 8], perLevel: 0.25 },
  crit_damage: { chance: [1, 1], value: [30, 60], perLevel: 2 },
  crit_heal: { chance: [1, 1], value: [2, 4], perLevel: 0.12 },
  dodge_empower: { chance: [1, 1], value: [0, 0], perLevel: 0, turns: 2 },
  kill_heal: { chance: [1, 1], value: [6, 12], perLevel: 0.35 },
  start_evasive: { chance: [1, 1], value: [0, 0], perLevel: 0, turns: 2 },
  start_strike: { chance: [1, 1], value: [60, 110], perLevel: 3 },
  turn_strike: { chance: [1, 1], value: [45, 80], perLevel: 2.5, every: [3, 4] },
  struck_retaliate: { chance: [0.2, 0.35], value: [35, 60], perLevel: 2 },
  low_empower: { chance: [1, 1], value: [0, 0], perLevel: 0, turns: 3 },
  low_heal: { chance: [1, 1], value: [12, 22], perLevel: 0.5 },
};

/** One-shot procs fire at most once per fight. */
export const ONCE_PER_FIGHT: ProcTemplate[] = ["low_empower", "low_heal"];

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Roll a proc. `strength` scales it (0.6 for enchantments, 1 for legendaries); `max` rolls
 * the top of every range (ancestral items).
 */
export function rollProc(
  rng: Rng,
  ilvl: number,
  opts: { template?: ProcTemplate; strength?: number; max?: boolean } = {},
): Proc {
  const t = opts.template ?? rng.pick(PROC_TEMPLATES);
  const range = PROC_RANGES[t];
  const strength = opts.strength ?? 1;
  const pick = ([low, high]: [number, number]) => (opts.max ? high : rng.float(low, high));
  const proc: Proc = {
    t,
    chance:
      round1(
        Math.min(1, pick(range.chance) * (range.chance[0] < 1 ? Math.max(0.8, strength) : 1)) * 100,
      ) / 100,
    value:
      range.value[1] === 0 ? 0 : round1((pick(range.value) + range.perLevel * ilvl) * strength),
  };
  if (range.turns) proc.turns = range.turns;
  if (range.every) proc.every = opts.max ? range.every[0] : rng.int(...range.every);
  return proc;
}

/** Stable identity of a proc inside a fight, for one-shot tracking. */
export function procKey(proc: Proc, index: number): string {
  return `${proc.t}:${index}`;
}
