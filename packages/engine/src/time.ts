/**
 * Game time. The engine never reads the system clock: the server passes `now`, and the player's
 * timezone offset decides when a new day starts (midnight local time).
 */
import type { Ctx } from "./ctx";
import { computeStats } from "./stats";
import type { GameState } from "./types";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
/** One point of energy (and 5% health) every 12 minutes. */
export const TICK = 12 * MINUTE;
const HEALTH_PER_TICK = 0.05;

/** `tzOffset` follows `Date#getTimezoneOffset()`: minutes to add to local time to get UTC. */
export function localMs(now: number, tzOffset: number): number {
  return now - tzOffset * MINUTE;
}

export function dayIndex(now: number, tzOffset: number): number {
  return Math.floor(localMs(now, tzOffset) / DAY);
}

/** Monday-based week number (day 0, 1970-01-01, was a Thursday). */
export function weekIndex(day: number): number {
  return Math.floor((day + 3) / 7);
}

export function localHour(now: number, tzOffset: number): number {
  return new Date(localMs(now, tzOffset)).getUTCHours();
}

export function localMonth(now: number, tzOffset: number): number {
  return new Date(localMs(now, tzOffset)).getUTCMonth() + 1;
}

export function isNight(now: number, tzOffset: number): boolean {
  const hour = localHour(now, tzOffset);
  return hour >= 20 || hour < 6;
}

/** Every Saturday the moon bleeds: tougher enemies, double gold and magic find. */
export function isBloodMoon(day: number): boolean {
  return ((day % 7) + 7) % 7 === 2;
}

/** Milliseconds until the next energy point (0 when full). */
export function nextTickIn(state: GameState, now: number, maxEnergy: number): number {
  if (state.hero.energy >= maxEnergy) return 0;
  return Math.max(0, state.time.tickAt + TICK - now);
}

/**
 * Bring the state up to `now`: regenerate energy/health and report whether a new day started.
 * Called at the beginning of every action.
 */
export function syncTime(ctx: Ctx): { newDay: boolean } {
  const { state, now } = ctx;
  const hero = state.hero;
  const stats = computeStats(state, ctx.content);
  const ticks = Math.floor((now - state.time.tickAt) / TICK);
  if (ticks > 0) {
    hero.energy = Math.min(stats.maxEnergy, hero.energy + ticks);
    if (!state.combat) {
      hero.health = Math.min(
        stats.maxHealth,
        hero.health + Math.ceil(ticks * HEALTH_PER_TICK * stats.maxHealth),
      );
    }
    state.time.tickAt += ticks * TICK;
  }
  // Regeneration never banks while full.
  if (hero.energy >= stats.maxEnergy && hero.health >= stats.maxHealth) state.time.tickAt = now;
  hero.energy = Math.min(hero.energy, stats.maxEnergy);
  hero.health = Math.min(hero.health, stats.maxHealth);

  const today = dayIndex(now, state.time.tzOffset);
  if (today > state.time.day) {
    state.time.day = today;
    state.time.orcsToday = 0;
    return { newDay: true };
  }
  return { newDay: false };
}
