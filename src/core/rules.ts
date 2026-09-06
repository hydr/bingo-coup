import type { Item, Ruleset } from './types.js'

/** Flacher Index einer Zelle. */
export function cellIndex(ruleset: Ruleset, row: number, col: number): number {
  return row * ruleset.cols + col
}

export function cellCount(ruleset: Ruleset): number {
  return ruleset.rows * ruleset.cols
}

/** Index des freien Mittelfelds, oder -1. */
export function freeIndex(ruleset: Ruleset): number {
  if (!ruleset.freeCenter) return -1
  if (ruleset.rows % 2 === 0 || ruleset.cols % 2 === 0) return -1
  return cellIndex(ruleset, (ruleset.rows - 1) / 2, (ruleset.cols - 1) / 2)
}

/**
 * Alle Gewinnlinien als flache Zellindizes: Zeilen, Spalten und — bei
 * quadratischem Feld — beide Diagonalen.
 *
 * Achtung fuer alles Weitere: Linien durch das freie Mittelfeld brauchen eine
 * echte Zelle weniger und werden dadurch leichter komplett. Genau das ist die
 * Stelle, an der ungewollt verfruehte Bingos entstehen.
 */
const lineCache = new WeakMap<Ruleset, readonly (readonly number[])[]>()

export function lines(ruleset: Ruleset): readonly (readonly number[])[] {
  const cached = lineCache.get(ruleset)
  if (cached) return cached

  const { rows, cols } = ruleset
  const result: number[][] = []

  for (let r = 0; r < rows; r++) {
    result.push(Array.from({ length: cols }, (_, c) => cellIndex(ruleset, r, c)))
  }
  for (let c = 0; c < cols; c++) {
    result.push(Array.from({ length: rows }, (_, r) => cellIndex(ruleset, r, c)))
  }
  if (rows === cols) {
    result.push(Array.from({ length: rows }, (_, i) => cellIndex(ruleset, i, i)))
    result.push(Array.from({ length: rows }, (_, i) => cellIndex(ruleset, i, cols - 1 - i)))
  }

  lineCache.set(ruleset, result)
  return result
}

/** Spalte, zu der ein flacher Zellindex gehoert. */
export function columnOf(ruleset: Ruleset, index: number): number {
  return index % ruleset.cols
}

/**
 * Erlaubter Zahlenbereich einer Spalte, als [von, bis] inklusive und 1-basiert.
 * Ohne Spaltenbindung ist das immer der gesamte Pool.
 */
export function columnRange(ruleset: Ruleset, col: number): [number, number] {
  if (!ruleset.columnRanges) return [1, ruleset.poolSize]
  const size = Math.floor(ruleset.poolSize / ruleset.cols)
  const from = col * size + 1
  const to = col === ruleset.cols - 1 ? ruleset.poolSize : (col + 1) * size
  return [from, to]
}

/** Die Standard-Elemente eines Regelsatzes: die Zahlen 1..poolSize. */
export function numberItems(ruleset: Ruleset): Item[] {
  return Array.from({ length: ruleset.poolSize }, (_, i) => ({
    id: i + 1,
    label: String(i + 1),
  }))
}

/**
 * Elemente aus Begriffen — fuer Begriffe-Bingo. Die Reihenfolge der Begriffe
 * ist die Reihenfolge, in der sie spaeter "gezogen" werden koennen; die
 * Gewinnlogik behandelt sie exakt wie Zahlen.
 */
export function labelItems(labels: readonly string[]): Item[] {
  return labels.map((label, i) => ({ id: i + 1, label }))
}

/** Darf `item` in Spalte `col` stehen? */
export function fitsColumn(ruleset: Ruleset, item: Item, col: number): boolean {
  if (!ruleset.columnRanges) return true
  const [from, to] = columnRange(ruleset, col)
  return item.id >= from && item.id <= to
}

/** Prueft, ob ein Regelsatz ueberhaupt spielbar ist. */
export function validateRuleset(ruleset: Ruleset): void {
  const needed = cellCount(ruleset) - (freeIndex(ruleset) >= 0 ? 1 : 0)
  if (ruleset.poolSize < needed) {
    throw new Error(
      `Zahlenraum zu klein: ${ruleset.poolSize} Elemente fuer ${needed} Felder.`,
    )
  }
  if (ruleset.columnRanges) {
    const perColumn = Math.floor(ruleset.poolSize / ruleset.cols)
    if (perColumn < ruleset.rows) {
      throw new Error(
        `Spaltenbindung unmoeglich: nur ${perColumn} Zahlen je Spalte ` +
          `fuer ${ruleset.rows} Felder.`,
      )
    }
  }
  if (ruleset.freeCenter && freeIndex(ruleset) < 0) {
    throw new Error('Freies Mittelfeld braucht eine ungerade Kantenlaenge.')
  }
  if (ruleset.columnLabels && ruleset.columnLabels.length !== ruleset.cols) {
    throw new Error('Anzahl Spaltenueberschriften passt nicht zur Spaltenzahl.')
  }
}
