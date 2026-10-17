/** Daily housekeeping, called by the maintenance cron: keeps the tables that grow forever small. */
import { type Db, pruneActionLog, pruneSessions } from "@textrpg/db";

/** Action log rows are kept this long (support, replays, abuse detection). */
export const ACTION_LOG_DAYS = 30;

export async function runMaintenance(db: Db, now = Date.now()) {
  const actions = await pruneActionLog(db, new Date(now - ACTION_LOG_DAYS * 86_400_000));
  const sessions = await pruneSessions(db, new Date(now));
  return { actions, sessions };
}
