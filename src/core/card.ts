import { cellCount, fitsColumn, freeIndex, lines } from './rules.js'
import type { Card, Item, Ruleset } from './types.js'

/** Nachschlagetabelle: Element-Id -> Position in der Ziehungsreihenfolge. */
export type DrawPositions = ReadonlyMap<number, number>

export function drawPositions(drawOrder: readonly Item[]): DrawPositions {
  return new Map(drawOrder.map((item, index) => [item.id, index]))
}

/** Nie gezogene Elemente liegen jenseits jeder Ziehung. */
const NEVER = Number.POSITIVE_INFINITY

function positionOf(cell: Item | null, positions: DrawPositions): number {
  // Das freie Mittelfeld gilt von der ersten Sekunde an als getroffen.
  if (cell === null) return -1
  return positions.get(cell.id) ?? NEVER
}

/**
 * Ziehungsindex, bei dem diese Linie vollstaendig wird — also die spaeteste
 * ihrer Zellen. `Infinity`, wenn sie nie vollstaendig wird.
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
 * Der Ziehungsindex, bei dem die Karte Bingo hat — die frueheste vollstaendige
 * Linie. Das ist die zentrale Groesse des ganzen Projekts: Alle Karten eines
 * Plans muessen hier denselben Wert liefern.
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

/** Trefferbild nach `drawn` Ziehungen — fuer Vorschau und Tests. */
export function hitsAfter(
  card: Card,
  positions: DrawPositions,
  drawn: number,
): boolean[] {
  return card.cells.map((cell) => positionOf(cell ?? null, positions) < drawn)
}

/** Anzahl Treffer nach `drawn` Ziehungen, das freie Feld eingerechnet. */
export function hitCountAfter(
  card: Card,
  positions: DrawPositions,
  drawn: number,
): number {
  return hitsAfter(card, positions, drawn).filter(Boolean).length
}

/** Signatur zum Erkennen doppelter Karten. */
export function signatureOf(card: Card): string {
  return card.cells.map((cell) => (cell === null ? 'F' : cell.id)).join(',')
}

/**
 * Prueft die strukturellen Invarianten einer Karte. Wirft mit klarer Meldung,
 * damit ein Generatorfehler nicht erst auf dem gedruckten Papier auffaellt.
 */
export function assertCardValid(card: Card, ruleset: Ruleset): void {
  const expected = cellCount(ruleset)
  if (card.cells.length !== expected) {
    throw new Error(`Karte ${card.id}: ${card.cells.length} statt ${expected} Felder.`)
  }

  const free = freeIndex(ruleset)
  const seen = new Set<number>()

  for (let i = 0; i < card.cells.length; i++) {
    const cell = card.cells[i]!

    if (i === free) {
      if (cell !== null) throw new Error(`Karte ${card.id}: Mittelfeld ist nicht frei.`)
      continue
    }
    if (cell === null) {
      throw new Error(`Karte ${card.id}: Feld ${i} ist leer, obwohl es kein freies Feld ist.`)
    }
    if (seen.has(cell.id)) {
      throw new Error(`Karte ${card.id}: Element ${cell.label} kommt mehrfach vor.`)
    }
    seen.add(cell.id)

    const col = i % ruleset.cols
    if (!fitsColumn(ruleset, cell, col)) {
      throw new Error(
        `Karte ${card.id}: ${cell.label} steht in Spalte ${col}, gehoert dort aber nicht hin.`,
      )
    }
  }
}
