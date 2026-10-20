/**
 * Deterministic pseudo-randomness for the engine.
 *
 * `@clinicalcraft/core` never calls `Math.random()`: every "random" value is
 * derived from a seed so replays, tests and multiplayer views agree exactly.
 */

/**
 * Seeded PRNG — the V4 linear congruential generator
 * (`k = k * 1664525 + 1013904223 >>> 0`, value `k / 2^32`).
 *
 * Returns a function yielding numbers in `[0, 1)`. The multiplication stays
 * below 2^53 so it is exact in IEEE-754 doubles.
 */
export function createRng(seed: number): () => number {
  let k = Math.trunc(seed) >>> 0;
  return () => {
    k = (k * 1664525 + 1013904223) >>> 0;
    return k / 4294967296;
  };
}

/**
 * 32-bit FNV-1a hash of a string (UTF-16 code units). Stable across
 * platforms; used to derive seeds from ids.
 */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Seed derived from several parts (joined with `|`). */
export function seedFrom(...parts: (string | number)[]): number {
  return hashString(parts.map(String).join("|"));
}
