/**
 * Deep copy of plain JSON-like data. Game states are plain data (they are stored as JSON), and
 * this is ~8x faster than structuredClone on a late-game save: cloning was 90% of an action.
 */
export function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clonePlain) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key in value) out[key] = clonePlain((value as Record<string, unknown>)[key]);
    return out as T;
  }
  return value;
}
