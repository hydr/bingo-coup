/**
 * Data model.
 *
 * The central decision: a cell carries an `Item` with a label rather than a
 * number. That keeps display and win logic apart — the logic works purely on
 * positions and draw indices and never looks at `label`. It is what lets the
 * same code serve numbers, the 3x3 kids grid and the open ruleset.
 */

/** Something that can be drawn. `id` is the identity, `label` only display. */
export interface Item {
  readonly id: number
  readonly label: string
}

/** Cell content. `null` is the free centre and always counts as hit. */
export type Cell = Item | null

/**
 * The rules of the game. Everything here is configuration so that a ruleset
 * that turns out too tight can be switched rather than rebuilt.
 */
export interface Ruleset {
  readonly rows: number
  readonly cols: number
  /** How many items can be drawn in total. */
  readonly poolSize: number
  /** B-I-N-G-O: every column has its own range of numbers. */
  readonly columnRanges: boolean
  /** Free centre square (only meaningful with an odd edge length). */
  readonly freeCenter: boolean
  /** Column headings, e.g. B I N G O. */
  readonly columnLabels: readonly string[] | null
}

export interface Card {
  readonly id: number
  /** Row by row, length rows * cols. */
  readonly cells: readonly Cell[]
  /** Which line (index into `lines(ruleset)`) wins. */
  readonly winningLine: number
}

/** A complete plan — everything an evening needs. */
export interface Plan {
  readonly ruleset: Ruleset
  readonly seed: number
  /** The fixed, predetermined draw order. Without it, no simultaneity. */
  readonly drawOrder: readonly Item[]
  readonly cards: readonly Card[]
  /** Index into `drawOrder` at which every card wins (zero-based). */
  readonly winAt: number
  /** The item that sets off the room. Follows from `winAt`. */
  readonly winningItem: Item
}

/** Classic bingo: 5x5, 1-75, B-I-N-G-O columns, free centre. */
export const CLASSIC: Ruleset = {
  rows: 5,
  cols: 5,
  poolSize: 75,
  columnRanges: true,
  freeCenter: true,
  columnLabels: ['B', 'I', 'N', 'G', 'O'],
}

/**
 * Like the original prototype: 5x5, 1-80, no column ranges, no free centre.
 * Kept as a fallback in case CLASSIC ever leaves too little room.
 */
export const OPEN_80: Ruleset = {
  rows: 5,
  cols: 5,
  poolSize: 80,
  columnRanges: false,
  freeCenter: false,
  columnLabels: null,
}

/** A small grid for children. */
export const KIDS_3X3: Ruleset = {
  rows: 3,
  cols: 3,
  poolSize: 30,
  columnRanges: false,
  freeCenter: true,
  columnLabels: null,
}
