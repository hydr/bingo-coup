/**
 * Deterministischer Zufallsgenerator.
 *
 * Reproduzierbarkeit ist hier kein Komfort, sondern Anforderung: Geht das
 * gedruckte PDF verloren, muss derselbe Seed exakt dieselben Karten und
 * dieselbe Ziehungsreihenfolge liefern.
 */
export interface Rng {
  /** Gleichverteilt in [0, 1). */
  next(): number
  /** Ganzzahl in [0, max). */
  int(max: number): number
  /** Ein zufälliges Element. Wirft bei leerer Liste. */
  pick<T>(items: readonly T[]): T
  /** Kopie der Liste in zufälliger Reihenfolge (Fisher-Yates). */
  shuffled<T>(items: readonly T[]): T[]
}

/** mulberry32 — klein, schnell, für unsere Zwecke ausreichend gleichverteilt. */
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
      if (items.length === 0) throw new Error('pick() auf leerer Liste')
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

/** Zufälliger Seed für den Fall, dass der Nutzer keinen vorgibt. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
