/**
 * Turn-based combat. Pure rules: the UI only animates the events emitted here.
 *
 *   initiative : the faster side acts first; twice the opponent's speed → an extra attack
 *   damage     : (6 + strength × 1.6) × variance × multipliers × (1 − mitigation)
 *   mitigation : defense / (defense + 20 + 5 × attacker level)
 *   crit       : luck × 0.75 + critChance (max 60%), × (1.5 + critDamage)
 *   dodge      : (defender speed − attacker speed) × 1.5% + dodge (max 35%, 75% with Vanish)
 */
import type { PowerId, Skill, StatusId } from "@textrpg/content";

import type { Ctx } from "./ctx";
import type { SpawnedEnemy } from "./enemies";
import { baseOf, removeFromBag } from "./items";
import { activePowers, computeStats, critChanceOf } from "./stats";
import { isNight } from "./time";
import type { Attribute, Combat, CombatContext, Side, Stats, Status, Who } from "./types";

export type CombatOutcome = "ongoing" | "victory" | "defeat" | "fled";

const DOT_STATUSES: StatusId[] = ["poison", "burn", "bleed"];
const HEAVY_BLOW = 2.5;
const GUARD_FACTOR = 0.4;
const GUARD_HEAVY_FACTOR = 0.2;

export interface HeroSnapshot {
  stats: Stats;
  hp: number;
  powers: PowerId[];
  level: number;
}

export function heroSnapshot(ctx: Ctx): HeroSnapshot {
  const stats = computeStats(ctx.state, ctx.content);
  return {
    stats,
    hp: Math.min(ctx.hero.health, stats.maxHealth),
    powers: activePowers(ctx.state, ctx.content),
    level: ctx.hero.level,
  };
}

export function startCombat(
  ctx: Ctx,
  enemy: SpawnedEnemy,
  context: CombatContext,
  hero: HeroSnapshot = heroSnapshot(ctx),
): Combat {
  const stats = { ...hero.stats };
  const combat: Combat = {
    context,
    enemy: {
      stats: enemy.stats,
      hp: enemy.stats.maxHealth,
      maxHp: enemy.stats.maxHealth,
      statuses: [],
      info: enemy.info,
      windup: false,
      enraged: false,
    },
    hero: { stats, hp: hero.hp, maxHp: stats.maxHealth, statuses: [], powers: hero.powers, level: hero.level },
    turn: 0,
    cooldowns: {},
    guarding: false,
    bastionUsed: false,
    attacksMade: 0,
    nextCrit: false,
    night: isNight(ctx.now, ctx.state.time.tzOffset),
  };
  if (hero.powers.includes("mystery_ring")) {
    const attribute = ctx.rng.pick<Attribute>(["strength", "defense", "speed", "luck"]);
    stats[attribute] *= 2;
    combat.mysteryAttribute = attribute;
  }
  if (hero.powers.includes("orc_trophy")) {
    stats.damagePct += Math.min(50, 5 * ctx.state.time.orcsToday);
  }
  ctx.state.combat = combat;
  ctx.emit({ type: "combatStart", enemy: enemy.info, hp: combat.enemy.hp, context: context.type });
  if (combat.mysteryAttribute) ctx.emit({ type: "mystery", attribute: combat.mysteryAttribute });
  return combat;
}

// --- Helpers -----------------------------------------------------------------

function sideOf(combat: Combat, who: Who): Side {
  return who === "hero" ? combat.hero : combat.enemy;
}

function other(who: Who): Who {
  return who === "hero" ? "enemy" : "hero";
}

function has(side: Side, status: StatusId): boolean {
  return side.statuses.some((s) => s.id === status);
}

function speedOf(side: Side): number {
  return side.stats.speed * (has(side, "chill") ? 0.7 : 1);
}

function applyStatus(ctx: Ctx, combat: Combat, target: Who, id: StatusId, turns: number, value = 0): void {
  const side = sideOf(combat, target);
  const existing = side.statuses.find((s) => s.id === id);
  if (existing) {
    existing.turns = Math.max(existing.turns, turns);
    existing.value = Math.max(existing.value, value);
  } else {
    side.statuses.push({ id, turns, value });
  }
  ctx.emit({ type: "statusApplied", target, status: id, turns });
}

function heal(ctx: Ctx, combat: Combat, who: Who, amount: number, source: string): void {
  const side = sideOf(combat, who);
  const healed = Math.min(side.maxHp - side.hp, Math.round(amount));
  if (healed <= 0) return;
  side.hp += healed;
  ctx.emit({ type: "heal", target: who, amount: healed, source });
}

function isDragonbaneTarget(combat: Combat): boolean {
  return combat.hero.powers.includes("dragonbane") && ["dragon", "demon"].includes(combat.enemy.info.kindId);
}

/** Damage to a side, with Last Bastion. Returns true if the side died. */
function hurt(ctx: Ctx, combat: Combat, who: Who, damage: number): boolean {
  const side = sideOf(combat, who);
  side.hp -= damage;
  if (side.hp <= 0 && who === "hero" && combat.hero.powers.includes("last_bastion") && !combat.bastionUsed) {
    side.hp = 1;
    combat.bastionUsed = true;
    ctx.emit({ type: "bastion" });
  }
  side.hp = Math.max(0, side.hp);
  return side.hp <= 0;
}

interface StrikeOptions {
  mult: number;
  skill?: Skill;
  heavy?: boolean;
  counter?: boolean;
  extra?: boolean;
}

/** One hit from `by` to the other side. Returns true if the target died. */
function strike(ctx: Ctx, combat: Combat, by: Who, opts: StrikeOptions): boolean {
  const rng = ctx.rng;
  const attacker = sideOf(combat, by);
  const target = other(by);
  const defender = sideOf(combat, target);
  const a = attacker.stats;
  const d = defender.stats;
  const heroAttacking = by === "hero";

  // Dodge
  const evasive = has(defender, "evasive") ? 40 : 0;
  const dodgeChance = Math.min(evasive ? 75 : 35, Math.max(0, (speedOf(defender) - speedOf(attacker)) * 1.5) + d.dodge + evasive);
  if (!opts.heavy && rng.chance(dodgeChance / 100)) {
    ctx.emit({ type: "dodge", by: target });
    if (target === "hero" && combat.hero.powers.includes("counter_dodge") && !opts.counter) {
      ctx.emit({ type: "counter" });
      return strike(ctx, combat, "hero", { mult: 0.6, counter: true });
    }
    return false;
  }

  // Critical
  let crit = false;
  if (heroAttacking) {
    combat.attacksMade += 1;
    const firstStrike = combat.attacksMade === 1 && combat.hero.powers.includes("shadow_first");
    const eclipse = combat.hero.powers.includes("eclipse") && (combat.turn + 1) % 5 === 0;
    if (combat.nextCrit || firstStrike || eclipse) {
      crit = true;
      combat.nextCrit = false;
    }
  }
  if (!crit) crit = rng.chance(critChanceOf(a) / 100);

  let raw = (6 + a.strength * 1.6) * rng.float(0.85, 1.15) * opts.mult * (1 + a.damagePct / 100);
  if (has(attacker, "empower")) raw *= 1.3;
  if (has(attacker, "weaken")) raw *= 0.7;
  if (has(attacker, "chill")) raw *= 0.9;
  if (heroAttacking) {
    if (combat.hero.powers.includes("blood_frenzy") && attacker.hp < attacker.maxHp * 0.5) raw *= 1.4;
    if (isDragonbaneTarget(combat)) raw *= 1.3;
    const skill = opts.skill;
    if (skill?.effect.executeBelow !== undefined && defender.hp < defender.maxHp * skill.effect.executeBelow) {
      raw *= (skill.effect.executeMult ?? 1) / skill.effect.mult;
    }
  } else {
    if (combat.enemy.enraged) raw *= 1.3;
    if (isDragonbaneTarget(combat)) raw *= 0.7;
  }
  if (crit) {
    const moon = heroAttacking && combat.night && combat.hero.powers.includes("moonblade") ? 1 : 0;
    raw *= 1.5 + a.critDamage / 100 + moon;
  }
  const attackerLevel = heroAttacking ? combat.hero.level : combat.enemy.info.level;
  const mitigation = d.defense / (d.defense + 20 + 5 * attackerLevel);
  let damage = raw * (1 - mitigation);
  if (target === "hero" && combat.guarding) damage *= opts.heavy ? GUARD_HEAVY_FACTOR : GUARD_FACTOR;
  damage = Math.max(1, Math.round(damage));

  const died = hurt(ctx, combat, target, damage);
  ctx.emit({
    type: "hit",
    by,
    damage,
    crit,
    ...(opts.skill ? { skillId: opts.skill.id } : {}),
    ...(opts.extra ? { extra: true } : {}),
  });
  if (heroAttacking && crit) ctx.state.counters.crits += 1;

  // Life steal and drain
  const steal = a.lifeSteal / 100 + (opts.skill?.effect.drain ?? 0);
  if (steal > 0) heal(ctx, combat, by, damage * steal, opts.skill?.effect.drain ? "drain" : "lifeSteal");

  // Thorns
  if (d.thorns > 0 && !died) {
    const reflected = Math.max(1, Math.round(damage * (d.thorns / 100)));
    ctx.emit({ type: "thorns", target: by, damage: reflected });
    if (hurt(ctx, combat, by, reflected)) return died;
  }
  if (died) return true;

  // On-hit effects
  if (heroAttacking) {
    const status = opts.skill?.effect.status;
    if (status && rng.chance(status.chance)) {
      applyStatus(ctx, combat, "enemy", status.id, status.turns, Math.max(1, Math.round(damage * status.power)));
    }
    const powers = combat.hero.powers;
    if (powers.includes("thunderstep") && rng.chance(0.2)) applyStatus(ctx, combat, "enemy", "stun", 1);
    if (powers.includes("ember_heart") && rng.chance(0.3)) {
      applyStatus(ctx, combat, "enemy", "burn", 3, Math.max(1, Math.round(damage * 0.3)));
    }
    if (powers.includes("frost_core") && rng.chance(0.3)) applyStatus(ctx, combat, "enemy", "chill", 2);
  } else {
    const onHit = combat.enemy.info.onHit;
    if (onHit && rng.chance(onHit.chance)) {
      const dot = DOT_STATUSES.includes(onHit.status) ? Math.max(1, Math.round(damage * 0.3)) : 0;
      applyStatus(ctx, combat, "hero", onHit.status, onHit.turns, dot);
    }
  }
  return false;
}

/** A side's standard attack, plus an extra one when twice as fast. Returns true if the target died. */
function attackWithFollowUp(ctx: Ctx, combat: Combat, by: Who): boolean {
  if (strike(ctx, combat, by, { mult: 1 })) return true;
  const me = sideOf(combat, by);
  const them = sideOf(combat, other(by));
  if (speedOf(me) >= speedOf(them) * 2) return strike(ctx, combat, by, { mult: 0.6, extra: true });
  return false;
}

function enemyTurn(ctx: Ctx, combat: Combat): void {
  const enemy = combat.enemy;
  if (enemy.hp <= 0 || combat.hero.hp <= 0) return;
  const stun = enemy.statuses.find((s) => s.id === "stun");
  if (stun) {
    enemy.statuses = enemy.statuses.filter((s) => s !== stun);
    ctx.emit({ type: "stunned", target: "enemy" });
    return;
  }
  if (enemy.info.bossId && !enemy.enraged && enemy.hp < enemy.maxHp * 0.3) {
    enemy.enraged = true;
    ctx.emit({ type: "enrage" });
  }
  const every = enemy.info.telegraphEvery;
  if (enemy.windup) {
    enemy.windup = false;
    const before = combat.hero.hp;
    strike(ctx, combat, "enemy", { mult: HEAVY_BLOW, heavy: true });
    ctx.emit({ type: "heavyBlow", damage: before - combat.hero.hp, guarded: combat.guarding });
    return;
  }
  if (every && combat.turn > 0 && combat.turn % every === 0) {
    enemy.windup = true;
    ctx.emit({ type: "windup" });
    return;
  }
  attackWithFollowUp(ctx, combat, "enemy");
}

function endRound(ctx: Ctx, combat: Combat): void {
  for (const who of ["hero", "enemy"] as Who[]) {
    const side = sideOf(combat, who);
    if (side.hp <= 0) continue;
    for (const status of side.statuses) {
      if (DOT_STATUSES.includes(status.id) && status.value > 0 && side.hp > 0) {
        ctx.emit({ type: "dot", target: who, status: status.id, damage: status.value });
        hurt(ctx, combat, who, status.value);
      }
    }
    side.statuses = side.statuses
      .map((s): Status => (s.id === "stun" ? s : { ...s, turns: s.turns - 1 }))
      .filter((s) => s.turns > 0);
  }
  for (const id of Object.keys(combat.cooldowns)) {
    combat.cooldowns[id] = Math.max(0, combat.cooldowns[id]! - 1);
  }
  combat.guarding = false;
  combat.turn += 1;
}

export function outcomeOf(combat: Combat): CombatOutcome {
  if (combat.hero.hp <= 0) return "defeat";
  if (combat.enemy.hp <= 0) return "victory";
  return "ongoing";
}

/** Skills usable in a fight. The daily challenge hero has no class: classless skills only. */
export function availableSkills(ctx: Ctx, level: number, challenge = false): Skill[] {
  return [...ctx.content.skills.values()].filter(
    (s) => s.unlockLevel <= level && (s.classId === null || (!challenge && s.classId === ctx.hero.classId)),
  );
}

function skillsIn(ctx: Ctx, combat: Combat): Skill[] {
  return availableSkills(ctx, combat.hero.level, combat.context.type === "challenge");
}

function canFlee(combat: Combat): boolean {
  return !combat.enemy.info.bossId && combat.context.type !== "challenge";
}

// --- Actions -----------------------------------------------------------------

export type CombatMove =
  | { kind: "attack" }
  | { kind: "skill"; skillId: string }
  | { kind: "potion"; uid?: string }
  | { kind: "guard" }
  | { kind: "flee" };

function bestPotion(ctx: Ctx): string | undefined {
  const potions = ctx.hero.bag
    .filter((i) => {
      const base = baseOf(ctx.content, i.baseId);
      return base.kind === "potion" && base.effect?.healPct;
    })
    .sort((x, y) => (baseOf(ctx.content, x.baseId).effect!.healPct! - baseOf(ctx.content, y.baseId).effect!.healPct!));
  return potions[0]?.uid;
}

function drinkPotion(ctx: Ctx, combat: Combat, uid?: string): void {
  if (combat.context.type === "challenge") {
    const challenge = ctx.state.challenge!;
    if (challenge.potions <= 0) ctx.fail("noPotion");
    challenge.potions -= 1;
    ctx.state.counters.potionsUsed += 1;
    heal(ctx, combat, "hero", combat.hero.maxHp * 0.5, "potion");
    return;
  }
  const potionUid = uid ?? bestPotion(ctx);
  const item = potionUid ? ctx.hero.bag.find((i) => i.uid === potionUid) : undefined;
  const healPct = item ? baseOf(ctx.content, item.baseId).effect?.healPct : undefined;
  if (!item || !healPct) ctx.fail("noPotion");
  removeFromBag(ctx.state, item.uid, 1);
  ctx.state.counters.potionsUsed += 1;
  heal(ctx, combat, "hero", combat.hero.maxHp * healPct, "potion");
}

export function combatMove(ctx: Ctx, move: CombatMove): CombatOutcome {
  const combat = ctx.state.combat;
  if (!combat) ctx.fail("noCombat");
  const heroFirst = speedOf(combat.hero) >= speedOf(combat.enemy);

  switch (move.kind) {
    case "attack":
    case "skill": {
      let heroAct: () => void;
      if (move.kind === "attack") {
        heroAct = () => void attackWithFollowUp(ctx, combat, "hero");
      } else {
        const skill = skillsIn(ctx, combat).find((s) => s.id === move.skillId);
        if (!skill) ctx.fail("unknownSkill");
        if ((combat.cooldowns[skill.id] ?? 0) > 0) ctx.fail("skillCooldown");
        combat.cooldowns[skill.id] = skill.cooldown + 1;
        heroAct = () => {
          if (skill.effect.self) applyStatus(ctx, combat, "hero", skill.effect.self.id, skill.effect.self.turns);
          for (let i = 0; i < skill.effect.hits; i++) {
            if (strike(ctx, combat, "hero", { mult: skill.effect.mult, skill })) break;
          }
          if (skill.effect.guaranteedCrit) combat.nextCrit = true;
        };
      }
      if (heroFirst) {
        heroAct();
        enemyTurn(ctx, combat);
      } else {
        enemyTurn(ctx, combat);
        if (combat.hero.hp > 0) heroAct();
      }
      break;
    }
    case "potion":
      drinkPotion(ctx, combat, move.uid);
      enemyTurn(ctx, combat);
      break;
    case "guard":
      combat.guarding = true;
      ctx.emit({ type: "guard" });
      enemyTurn(ctx, combat);
      break;
    case "flee": {
      if (!canFlee(combat)) ctx.fail("cannotFlee");
      const chance = Math.min(0.9, Math.max(0.1, 0.5 + (speedOf(combat.hero) - speedOf(combat.enemy)) * 0.05));
      const success = ctx.rng.chance(chance);
      ctx.emit({ type: "flee", success });
      if (success) return "fled";
      enemyTurn(ctx, combat);
      break;
    }
  }
  const outcome = outcomeOf(combat);
  if (outcome === "ongoing") endRound(ctx, combat);
  return outcomeOf(combat);
}

/**
 * Let the hero fight on their own: skills when ready, guard against telegraphed blows.
 * Hands control back when health drops below 30% so the player decides about potions.
 */
export function autoFight(ctx: Ctx): CombatOutcome {
  const combat = ctx.state.combat;
  if (!combat) ctx.fail("noCombat");
  for (let round = 0; round < 60; round++) {
    let move: CombatMove = { kind: "attack" };
    if (combat.enemy.windup) {
      move = { kind: "guard" };
    } else {
      const ready = skillsIn(ctx, combat)
        .filter((s) => (combat.cooldowns[s.id] ?? 0) === 0)
        .sort((x, y) => y.effect.mult * y.effect.hits - x.effect.mult * x.effect.hits);
      if (ready[0]) move = { kind: "skill", skillId: ready[0].id };
    }
    const outcome = combatMove(ctx, move);
    if (outcome !== "ongoing") return outcome;
    if (combat.hero.hp < combat.hero.maxHp * 0.3) return "ongoing";
  }
  return "ongoing";
}
