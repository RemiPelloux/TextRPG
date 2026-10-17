/**
 * A tiny time-based memo, per server instance. Leaderboards are read far more often than they
 * change and a few seconds of staleness is invisible, so one query serves everyone meanwhile.
 * Concurrent misses share the same pending promise.
 */
export class TtlCache {
  private entries = new Map<string, { at: number; value: Promise<unknown> }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
  ) {}

  get<T>(key: string, load: () => Promise<T>, now = Date.now()): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && now - hit.at < this.ttlMs) return hit.value as Promise<T>;
    if (this.entries.size >= this.maxEntries) this.entries.clear();
    const value = load();
    this.entries.set(key, { at: now, value });
    // A failed load must not stay cached.
    value.catch(() => this.entries.delete(key));
    return value;
  }
}

/** Shared by the leaderboard pages. */
export const boardCache = new TtlCache(30_000);
