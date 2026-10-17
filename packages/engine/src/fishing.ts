/**
 * Fishing: read the line and answer with the right move. The fish tells you what it is doing
 * (sly fish sometimes lie): thrashing → give slack, circling → hold steady, tiring → pull.
 */
import type { Fish } from "@textrpg/content";

import type { Ctx } from "./ctx";
import { assertIdle, spendEnergy } from "./encounters";
import { addToBag, countInBag, removeByBase, simpleItem } from "./items";
import { onFish } from "./quests";
import { computeStats } from "./stats";
import { localMonth } from "./time";
import type { Reel } from "./types";

export const FISH_ENERGY = 1;
const MOVES: Reel[] = ["pull", "steady", "slack"];
const ESCAPE: Record<Fish["temper"], number> = { calm: 0.25, wild: 0.45, sly: 0.35 };

function nextHint(ctx: Ctx, fish: Fish): { hint: Reel; answer: Reel } {
  const answer = ctx.rng.pick(MOVES);
  if (fish.temper === "sly" && ctx.rng.chance(0.3)) {
    return { answer, hint: ctx.rng.pick(MOVES.filter((m) => m !== answer)) };
  }
  return { answer, hint: answer };
}

export function canFish(ctx: { state: Ctx["state"] }): boolean {
  return ctx.state.hero.equipment.tool?.baseId === "fishing_rod";
}

export function cast(ctx: Ctx): void {
  assertIdle(ctx);
  if (!canFish(ctx)) ctx.fail("noRod");
  if (countInBag(ctx.state, "fish_bait") < 1) ctx.fail("noBait");
  spendEnergy(ctx, FISH_ENERGY);
  removeByBase(ctx.state, "fish_bait", 1);

  const month = localMonth(ctx.now, ctx.state.time.tzOffset);
  const luck = computeStats(ctx.state, ctx.content).luck;
  const pool = ctx.content.fish.filter((f) => f.months.length === 0 || f.months.includes(month));
  const fish = ctx.rng.weighted(pool, (f) =>
    f.rarity === "common" ? f.weight : f.weight * (1 + luck / 50),
  );
  ctx.state.fishing = {
    fishId: fish.id,
    round: 0,
    rounds: fish.rounds,
    slips: 0,
    ...nextHint(ctx, fish),
  };
  ctx.emit({ type: "fishBite", hint: ctx.state.fishing.hint });
}

export function reel(ctx: Ctx, move: Reel): void {
  const fishing = ctx.state.fishing;
  if (!fishing) ctx.fail("notFishing");
  const fish = ctx.content.fish.find((f) => f.id === fishing.fishId)!;

  if (move === fishing.answer) {
    fishing.round += 1;
    if (fishing.round >= fishing.rounds) {
      ctx.state.fishing = null;
      const item = simpleItem(ctx, fish.id);
      ctx.emit({ type: "fishCaught", fishId: fish.id });
      ctx.emit(addToBag(ctx, item) ? { type: "loot", item } : { type: "loot", item, lost: true });
      ctx.state.counters.fishCaught += 1;
      if (!ctx.state.codex.fish.includes(fish.id)) ctx.state.codex.fish.push(fish.id);
      onFish(ctx);
      return;
    }
    Object.assign(fishing, nextHint(ctx, fish));
    ctx.emit({ type: "fishBite", hint: fishing.hint });
    return;
  }

  fishing.slips += 1;
  if (ctx.rng.chance(ESCAPE[fish.temper] + 0.15 * (fishing.slips - 1))) {
    ctx.state.fishing = null;
    ctx.emit({ type: "fishEscaped", fishId: fish.id });
    return;
  }
  Object.assign(fishing, nextHint(ctx, fish));
  ctx.emit({ type: "fishSlip", hint: fishing.hint });
}
