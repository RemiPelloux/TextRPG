/** Token bucket per key, in memory. Enough to stop click-bots on a single instance. */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();

  constructor(private readonly opts: { capacity: number; refillPerSecond: number }) {}

  take(key: string, now = Date.now()): boolean {
    const bucket = this.buckets.get(key) ?? { tokens: this.opts.capacity, at: now };
    bucket.tokens = Math.min(
      this.opts.capacity,
      bucket.tokens + ((now - bucket.at) / 1000) * this.opts.refillPerSecond,
    );
    bucket.at = now;
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 50_000) this.buckets.clear();
    return allowed;
  }
}
