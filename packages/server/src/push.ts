/** Who should get an "energy full" notification right now (at most one per 20 hours). */
import { getContent } from "@textrpg/content";
import { type Db, pushTargets } from "@textrpg/db";
import { apply, computeStats, type GameState, migrate } from "@textrpg/engine";

const content = getContent();
const COOLDOWN = 20 * 3_600_000;

export async function energyFullTargets(db: Db, now = Date.now()) {
  const targets = await pushTargets(db);
  return targets.filter((t) => {
    if (t.lastNotifiedAt && now - t.lastNotifiedAt.getTime() < COOLDOWN) return false;
    const state = apply(migrate(t.state as GameState), { type: "sync" }, { now, content }).state;
    return state.hero.energy >= computeStats(state, content).maxEnergy && !state.combat;
  });
}
