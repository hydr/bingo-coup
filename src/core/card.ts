import { cellCount, fitsColumn, freeIndex, lines } from './rules.js'
import type { Card, Item, Ruleset } from './types.js'

/** Lookup table: item id -> position in the draw order. */
export type DrawPositions = ReadonlyMap<number, number>

export function drawPositions(drawOrder: readonly Item[]): DrawPositions {
  return new Map(drawOrder.map((item, index) => [item.id, index]))
}

/** Items that are never drawn lie beyond every draw. */
const NEVER = Number.POSITIVE_INFINITY

function positionOf(cell: Item | null, positions: DrawPositions): number {
  // The free centre counts as hit from the very first second.
  if (cell === null) return -1
  return positions.get(cell.id) ?? NEVER
}

/**
 * The draw index at which this line becomes complete — that is, its latest
 * cell. `Infinity` if it never completes.
 */
export function lineCompletesAt(
  card: Card,
  ruleset: Ruleset,
  lineIdx: number,
  positions: DrawPositions,
): number {
  const line = lines(ruleset)[lineIdx]!
  let latest = -1
  for (const idx of line) {
    const at = positionOf(card.cells[idx] ?? null, positions)
    if (at === NEVER) return NEVER
    if (at > latest) latest = at
  }
  return latest
}

/**
 * The draw index at which the card has bingo — its earliest complete line.
 * This is the central quantity of the whole project: every card in a plan has
 * to return the same value here.
 */
export function winIndexOf(
  card: Card,
  ruleset: Ruleset,
  positions: DrawPositions,
): number {
  let earliest = NEVER
  const all = lines(ruleset)
  for (let i = 0; i < all.length; i++) {
    const at = lineCompletesAt(card, ruleset, i, positions)
    if (at < earliest) earliest = at
  }
  return earliest
}

/** Which squares are marked after `drawn` draws — for preview and tests. */
export function hitsAfter(
  card: Card,
  positions: DrawPositions,
  drawn: number,
): boolean[] {
  return card.cells.map((cell) => positionOf(cell ?? null, positions) < drawn)
}

/** How many squares are marked after `drawn` draws, free centre included. */
export function hitCountAfter(
  card: Card,
  positions: DrawPositions,
  drawn: number,
): number {
  return hitsAfter(card, positions, drawn).filter(Boolean).length
}

/** Signature for spotting duplicate cards. */
export function signatureOf(card: Card): string {
  return card.cells.map((cell) => (cell === null ? 'F' : cell.id)).join(',')
}

/**
 * Checks the structural invariants of a card. Throws with a clear message so
 * that a generator bug does not first show up on printed paper.
 */
export function assertCardValid(card: Card, ruleset: Ruleset): void {
  const expected = cellCount(ruleset)
  if (card.cells.length !== expected) {
    throw new Error(`Card ${card.id}: ${card.cells.length} squares instead of ${expected}.`)
  }

  const free = freeIndex(ruleset)
  const seen = new Set<number>()

  for (let i = 0; i < card.cells.length; i++) {
    const cell = card.cells[i]!

    if (i === free) {
      if (cell !== null) throw new Error(`Card ${card.id}: the centre is not free.`)
      continue
    }
    if (cell === null) {
      throw new Error(`Card ${card.id}: square ${i} is empty but is not the free centre.`)
    }
    if (seen.has(cell.id)) {
      throw new Error(`Card ${card.id}: item ${cell.label} appears more than once.`)
    }
    seen.add(cell.id)

    const col = i % ruleset.cols
    if (!fitsColumn(ruleset, cell, col)) {
      throw new Error(
        `Card ${card.id}: ${cell.label} sits in column ${col}, where it does not belong.`,
      )
    }
  }
}
