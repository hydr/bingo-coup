/**
 * Deterministic random numbers.
 *
 * Reproducibility is a requirement here, not a convenience: if the printout
 * gets lost, the same seed has to return exactly the same cards and the same
 * draw order.
 */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number
  /** Integer in [0, max). */
  int(max: number): number
  /** A random element. Throws on an empty list. */
  pick<T>(items: readonly T[]): T
  /** A copy of the list in random order (Fisher-Yates). */
  shuffled<T>(items: readonly T[]): T[]
}

/** mulberry32 — small, fast, and uniform enough for what we do with it. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (max: number): number => Math.floor(next() * max)

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick() on an empty list')
      return items[int(items.length)]!
    },
    shuffled<T>(items: readonly T[]): T[] {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(i + 1)
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
      }
      return copy
    },
  }
}

/** A random seed, for when the user does not supply one. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
