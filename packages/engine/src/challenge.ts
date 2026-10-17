/**
 * Daily challenge: the same five enemies for every player on a given day, fought with the same
 * pre-made hero. One attempt per day; the score goes to the daily leaderboard.
 */
import { Rng } from "./rng";
import { type CombatOutcome, startCombat } from "./combat";
import { Ctx } from "./ctx";
import { spawnBoss, spawnEnemy } from "./enemies";
import { emptyStats } from "./stats";
import type { Combat } from "./types";

export const CHALLENGE_FIGHTS = 5;
export const CHALLENGE_LEVEL = 10;
export const CHALLENGE_POTIONS = 3;

export function challengeHeroStats() {
  const stats = emptyStats();
  Object.assign(stats, {
    maxHealth: 300,
    strength: 24,
    defense: 18,
    speed: 14,
    luck: 12,
    critChance: 5,
    critDamage: 20,
    damagePct: 10,
    lifeSteal: 3,
  });
  return stats;
}

function spawnFor(ctx: Ctx, day: number, index: number) {
  // Enemies come from the day's seed, not the player's: everyone faces the same lineup.
  const lineup = new Ctx(
    ctx.state,
    ctx.content,
    Rng.fromSeed(`challenge:${day}:${index}`),
    ctx.now,
  );
  const level = CHALLENGE_LEVEL - 1 + index;
  const normal = ctx.content.difficulties.get("normal")!;
  if (index === CHALLENGE_FIGHTS - 1) {
    return spawnBoss(lineup, ctx.content.bosses.get("goblin_king")!, level, normal);
  }
  return spawnEnemy(lineup, level, normal, { elite: index === CHALLENGE_FIGHTS - 2 });
}

function fight(ctx: Ctx): void {
  const challenge = ctx.state.challenge!;
  const stats = challengeHeroStats();
  startCombat(
    ctx,
    spawnFor(ctx, challenge.day, challenge.index),
    { type: "challenge", index: challenge.index },
    {
      stats,
      hp: challenge.hp,
      powers: [],
      procs: [],
      level: CHALLENGE_LEVEL,
    },
  );
}

export function challengeAvailable(ctx: { state: Ctx["state"] }): boolean {
  return ctx.state.challenge?.day !== ctx.state.time.day;
}

export function startChallenge(ctx: Ctx): void {
  if (ctx.state.combat) ctx.fail("inCombat");
  if (!challengeAvailable(ctx)) ctx.fail("challengeDone");
  ctx.state.challenge = {
    day: ctx.state.time.day,
    index: 0,
    score: 0,
    hp: challengeHeroStats().maxHealth,
    potions: CHALLENGE_POTIONS,
    finished: false,
  };
  fight(ctx);
}

export function nextChallengeFight(ctx: Ctx): void {
  const challenge = ctx.state.challenge;
  if (!challenge || challenge.finished || challenge.day !== ctx.state.time.day)
    ctx.fail("noChallenge");
  if (ctx.state.combat) ctx.fail("inCombat");
  fight(ctx);
}

export function onChallengeEnd(ctx: Ctx, combat: Combat, outcome: CombatOutcome): void {
  const challenge = ctx.state.challenge!;
  challenge.hp = combat.hero.hp;
  if (outcome === "victory") {
    const hpRatio = combat.hero.hp / combat.hero.maxHp;
    challenge.score += 100 + Math.round(hpRatio * 50) + Math.max(0, 30 - combat.turn * 2);
    challenge.index += 1;
    if (challenge.index >= CHALLENGE_FIGHTS) {
      challenge.finished = true;
      challenge.score += challenge.potions * 25;
    }
  } else {
    challenge.finished = true;
  }
  if (challenge.finished) ctx.state.counters.dailyChallenges += 1;
  ctx.emit({ type: "challengeScore", score: challenge.score, finished: challenge.finished });
}
