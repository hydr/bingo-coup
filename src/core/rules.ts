import type { Item, Ruleset } from './types.js'

/** Flat index of a cell. */
export function cellIndex(ruleset: Ruleset, row: number, col: number): number {
  return row * ruleset.cols + col
}

export function cellCount(ruleset: Ruleset): number {
  return ruleset.rows * ruleset.cols
}

/** Index of the free centre square, or -1. */
export function freeIndex(ruleset: Ruleset): number {
  if (!ruleset.freeCenter) return -1
  if (ruleset.rows % 2 === 0 || ruleset.cols % 2 === 0) return -1
  return cellIndex(ruleset, (ruleset.rows - 1) / 2, (ruleset.cols - 1) / 2)
}

const lineCache = new WeakMap<Ruleset, readonly (readonly number[])[]>()

/**
 * Every winning line as flat cell indices: rows, columns and — on a square
 * grid — both diagonals.
 *
 * Worth keeping in mind downstream: lines through the free centre need one real
 * square less and therefore complete more easily. That is exactly where
 * unwanted early bingos come from.
 */
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

/** The column a flat cell index belongs to. */
export function columnOf(ruleset: Ruleset, index: number): number {
  return index % ruleset.cols
}

/**
 * The range of numbers allowed in a column, as [from, to] inclusive and
 * one-based. Without column ranges that is always the whole pool.
 */
export function columnRange(ruleset: Ruleset, col: number): [number, number] {
  if (!ruleset.columnRanges) return [1, ruleset.poolSize]
  const size = Math.floor(ruleset.poolSize / ruleset.cols)
  const from = col * size + 1
  const to = col === ruleset.cols - 1 ? ruleset.poolSize : (col + 1) * size
  return [from, to]
}

/** The default items of a ruleset: the numbers 1..poolSize. */
export function numberItems(ruleset: Ruleset): Item[] {
  return Array.from({ length: ruleset.poolSize }, (_, i) => ({
    id: i + 1,
    label: String(i + 1),
  }))
}

/**
 * Items from arbitrary labels. Not a product feature — the interface only ever
 * offers numbers — but it keeps the promise that the win logic never reads
 * `label`, and the tests lean on it.
 */
export function labelItems(labels: readonly string[]): Item[] {
  return labels.map((label, i) => ({ id: i + 1, label }))
}

/** May `item` sit in column `col`? */
export function fitsColumn(ruleset: Ruleset, item: Item, col: number): boolean {
  if (!ruleset.columnRanges) return true
  const [from, to] = columnRange(ruleset, col)
  return item.id >= from && item.id <= to
}

/** Checks whether a ruleset can be played at all. */
export function validateRuleset(ruleset: Ruleset): void {
  const needed = cellCount(ruleset) - (freeIndex(ruleset) >= 0 ? 1 : 0)
  if (ruleset.poolSize < needed) {
    throw new Error(
      `Pool too small: ${ruleset.poolSize} items for ${needed} squares.`,
    )
  }
  if (ruleset.columnRanges) {
    const perColumn = Math.floor(ruleset.poolSize / ruleset.cols)
    if (perColumn < ruleset.rows) {
      throw new Error(
        `Column ranges impossible: only ${perColumn} numbers per column ` +
          `for ${ruleset.rows} squares.`,
      )
    }
  }
  if (ruleset.freeCenter && freeIndex(ruleset) < 0) {
    throw new Error('A free centre square needs an odd edge length.')
  }
  if (ruleset.columnLabels && ruleset.columnLabels.length !== ruleset.cols) {
    throw new Error('The number of column headings does not match the column count.')
  }
}
