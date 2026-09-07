import { assertCardValid, drawPositions, signatureOf, winIndexOf } from './card.js'
import {
  cellCount,
  columnOf,
  fitsColumn,
  freeIndex,
  lines,
  numberItems,
  validateRuleset,
} from './rules.js'
import { createRng, randomSeed, type Rng } from './rng.js'
import type { Card, Item, Plan, Ruleset } from './types.js'
import { CLASSIC } from './types.js'

/** How a square is to be filled. */
type Slot =
  | 'free' // the free centre
  | 'line' // part of the winning line
  | 'early' // an item drawn before the win (a decoy)
  | 'late' // an item drawn after it (blocks foreign lines)

export interface CardOptions {
  /**
   * Scatters hits outside the winning line so the card is indistinguishable
   * from an honest one.
   *
   * Without it, every card would carry exactly the hits of its winning line at
   * the winning moment and nothing else — which any guest glancing at their
   * neighbour's sheet would notice.
   */
  readonly naturalLook?: boolean
  /** Give up on a single card after this many failed attempts. */
  readonly maxAttempts?: number
}

const DEFAULTS = { naturalLook: true, maxAttempts: 200 } as const

/**
 * Why generation failed. The interface translates these into something a host
 * can read; the message itself stays technical and English.
 */
export type GenerationErrorCode =
  | 'out-of-range' // the win time lies outside the draw
  | 'too-early' // no line can be complete that early
  | 'impossible' // nothing could be built for these settings
  | 'pool-too-small' // not enough items for a card

export class GenerationError extends Error {
  readonly code: GenerationErrorCode
  /** For 'too-early': the earliest win number these rules allow. */
  readonly earliest?: number

  constructor(code: GenerationErrorCode, message: string, earliest?: number) {
    super(message)
    this.name = 'GenerationError'
    this.code = code
    if (earliest !== undefined) this.earliest = earliest
  }
}

/**
 * The shortest winning line, counted in real squares. Lines through the free
 * centre need one less, which is what makes an early win possible at all.
 */
export function shortestLine(ruleset: Ruleset): number {
  const free = freeIndex(ruleset)
  let shortest = Number.POSITIVE_INFINITY
  for (const line of lines(ruleset)) {
    const real = line.filter((idx) => idx !== free).length
    if (real < shortest) shortest = real
  }
  return shortest
}

/**
 * The earliest draw (one-based) at which anyone can win: a line of n real
 * squares needs n numbers, the last of them being the one that sets it off.
 */
export function earliestWinNumber(ruleset: Ruleset): number {
  return shortestLine(ruleset)
}

/**
 * Builds a card that wins on draw `winAt` — and not one draw earlier.
 *
 * Three steps:
 *   1. Pick a winning line and fill it with items drawn early; the item of
 *      `winAt` closes it.
 *   2. For every remaining square, decide whether it holds an item drawn early
 *      or late. Every foreign line needs at least one late square, otherwise
 *      there is a premature bingo.
 *   3. Assign concrete items, respecting columns and without repetition.
 *
 * The result is then verified independently. A card that misses the win time
 * does not leave this function.
 */
export function buildCard(
  ruleset: Ruleset,
  drawOrder: readonly Item[],
  winAt: number,
  rng: Rng,
  cardId: number,
  options: CardOptions = {},
): Card {
  const { naturalLook, maxAttempts } = { ...DEFAULTS, ...options }

  if (winAt < 0 || winAt >= drawOrder.length) {
    throw new GenerationError(
      'out-of-range',
      `Win time ${winAt} lies outside the draw (0..${drawOrder.length - 1}).`,
    )
  }

  const positions = drawPositions(drawOrder)
  const winningItem = drawOrder[winAt]!
  const early = drawOrder.slice(0, winAt)
  const late = drawOrder.slice(winAt + 1)
  const allLines = lines(ruleset)
  const free = freeIndex(ruleset)
  const total = cellCount(ruleset)

  // Only lines that can hold the triggering item at all. With B-I-N-G-O
  // columns that rules out most vertical lines: they are in the wrong range.
  const candidates: number[] = []
  for (let i = 0; i < allLines.length; i++) {
    const usable = allLines[i]!.some(
      (idx) => idx !== free && fitsColumn(ruleset, winningItem, columnOf(ruleset, idx)),
    )
    if (usable) candidates.push(i)
  }
  if (candidates.length === 0) {
    throw new GenerationError(
      'impossible',
      `No square can hold ${winningItem.label} — ruleset and draw do not match.`,
    )
  }

  let lastReason = 'unknown'

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = tryBuild()
    if (typeof result === 'string') {
      lastReason = result
      continue
    }
    return result
  }

  throw new GenerationError(
    'impossible',
    `Card ${cardId} could not be built in ${maxAttempts} attempts (${lastReason}). ` +
      `Win time ${winAt} is probably too early or too late for this ruleset.`,
  )

  function tryBuild(): Card | string {
    const lineIdx = rng.pick(candidates)
    const line = allLines[lineIdx]!
    const inLine = new Set(line)

    // --- Step 1: the winning line ----------------------------------------
    const cells: (Item | null)[] = new Array<Item | null>(total).fill(null)
    const used = new Set<number>()

    const slotsForWinner = line.filter(
      (idx) => idx !== free && fitsColumn(ruleset, winningItem, columnOf(ruleset, idx)),
    )
    const winCell = rng.pick(slotsForWinner)
    cells[winCell] = winningItem
    used.add(winningItem.id)

    for (const idx of line) {
      if (idx === free || idx === winCell) continue
      const col = columnOf(ruleset, idx)
      const pool = early.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col))
      if (pool.length === 0) return 'too few early items for the winning line'
      const chosen = rng.pick(pool)
      cells[idx] = chosen
      used.add(chosen.id)
    }

    // --- Step 2: early or late for every remaining square -----------------
    const slots: Slot[] = new Array<Slot>(total)
    for (let i = 0; i < total; i++) {
      if (i === free) slots[i] = 'free'
      else if (inLine.has(i)) slots[i] = 'line'
      else slots[i] = 'late'
    }

    if (naturalLook) {
      // How dense hits are on an honest card: each square is hit with p.
      const p = winAt / drawOrder.length
      for (let i = 0; i < total; i++) {
        if (slots[i] === 'late' && rng.next() < p) slots[i] = 'early'
      }
    }

    const repaired = repairSlots(slots, winCell)
    if (repaired !== null) return repaired

    const balanced = balanceAgainstSupply(slots, used, winCell)
    if (balanced !== null) return balanced

    // --- Step 3: assign items --------------------------------------------
    for (let col = 0; col < ruleset.cols; col++) {
      const earlyPool = rng.shuffled(
        early.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col)),
      )
      const latePool = rng.shuffled(
        late.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col)),
      )

      for (let row = 0; row < ruleset.rows; row++) {
        const idx = row * ruleset.cols + col
        const slot = slots[idx]!
        if (slot === 'free' || slot === 'line') continue

        const chosen = slot === 'early' ? earlyPool.pop() : latePool.pop()
        if (chosen === undefined) {
          return slot === 'early'
            ? 'too few early items for the filler squares'
            : 'too few late items for the filler squares'
        }
        cells[idx] = chosen
        used.add(chosen.id)
      }
    }

    // --- The safety belt: verify independently ---------------------------
    const card: Card = { id: cardId, cells, winningLine: lineIdx }
    try {
      assertCardValid(card, ruleset)
    } catch (error) {
      return `invalid card (${(error as Error).message})`
    }
    const actual = winIndexOf(card, ruleset, positions)
    if (actual !== winAt) return `wins on draw ${actual} instead of ${winAt}`

    return card
  }

  /**
   * Makes sure every foreign line holds at least one late square. Lines that
   * carry the triggering item are harmless: they complete at the win time at
   * the earliest, never before. That includes the winning line itself.
   *
   * Returns `null` on success, otherwise why it failed.
   */
  function repairSlots(slots: Slot[], winCell: number): string | null {
    for (let pass = 0; pass < total * 2; pass++) {
      let dangerous = -1

      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i]!
        if (line.includes(winCell)) continue
        if (line.some((idx) => slots[idx] === 'late')) continue
        dangerous = i
        break
      }
      if (dangerous === -1) return null

      const fixable = allLines[dangerous]!.filter((idx) => slots[idx] === 'early')
      if (fixable.length === 0) return 'a foreign line cannot be defused'
      slots[rng.pick(fixable)] = 'late'
    }
    return 'defusing the lines does not converge'
  }

  /**
   * Reconciles the plan with what is actually left per column. Too few late
   * items means squares have to switch to early — and then the line check is
   * due again.
   */
  function balanceAgainstSupply(
    slots: Slot[],
    used: ReadonlySet<number>,
    winCell: number,
  ): string | null {
    for (let round = 0; round < 8; round++) {
      let changed = false

      for (let col = 0; col < ruleset.cols; col++) {
        const earlySupply = early.filter(
          (it) => !used.has(it.id) && fitsColumn(ruleset, it, col),
        ).length
        const lateSupply = late.filter(
          (it) => !used.has(it.id) && fitsColumn(ruleset, it, col),
        ).length

        const earlyCells: number[] = []
        const lateCells: number[] = []
        for (let row = 0; row < ruleset.rows; row++) {
          const idx = row * ruleset.cols + col
          if (slots[idx] === 'early') earlyCells.push(idx)
          else if (slots[idx] === 'late') lateCells.push(idx)
        }

        if (earlyCells.length + lateCells.length > earlySupply + lateSupply) {
          return `column ${col} has too few items left`
        }

        // Too many planned as early: harmless, late is always safe.
        for (let i = earlySupply; i < earlyCells.length; i++) {
          slots[earlyCells[i]!] = 'late'
          changed = true
        }
        // Too many planned as late: repurpose, then check again.
        for (let i = lateSupply; i < lateCells.length; i++) {
          slots[lateCells[i]!] = 'early'
          changed = true
        }
      }

      if (!changed) return null

      const repaired = repairSlots(slots, winCell)
      if (repaired !== null) return repaired
    }
    return 'reconciling with the item supply does not converge'
  }
}

export interface PlanOptions extends CardOptions {
  readonly ruleset?: Ruleset
  /** How many cards — that is, guests. */
  readonly cardCount: number
  /** The draw index that wins (zero-based). */
  readonly winAt: number
  readonly seed?: number
  /** Custom items. Defaults to the numbers 1..poolSize. */
  readonly items?: readonly Item[]
  /**
   * A different win time per card — for the wave across tables, or two groups.
   * Without it, everybody wins together.
   */
  readonly winAtFor?: (cardIndex: number) => number
}

/**
 * Builds a complete plan: a fixed draw order plus cards that all win on the
 * same draw.
 *
 * A by-product of the construction, originally planned as a separate feature:
 * a card only wins on `winAt` if the item of `winAt` sits on it. So every card
 * necessarily shares the same triggering number and has all the other squares
 * of its winning line already marked. The strongest version dramatically is
 * the normal case, not an addition.
 */
export function generatePlan(options: PlanOptions): Plan {
  const ruleset = options.ruleset ?? CLASSIC
  validateRuleset(ruleset)

  // Check the two numbers before computing with them. Without this, a card
  // count of zero skipped the card loop and returned a plan whose
  // `winningItem` was `undefined` despite the type promising an `Item`, and a
  // fractional win time failed with a `TypeError` deep in the column check
  // instead of a `GenerationError` the interface can translate.
  if (!Number.isInteger(options.cardCount) || options.cardCount < 1) {
    throw new GenerationError(
      'out-of-range',
      `Card count has to be a whole number of at least 1, not ${options.cardCount}.`,
    )
  }
  if (!Number.isInteger(options.winAt) || options.winAt < 0) {
    throw new GenerationError(
      'out-of-range',
      `Win time has to be a whole number of at least 0, not ${options.winAt}.`,
    )
  }

  const earliest = earliestWinNumber(ruleset)
  if (options.winAt + 1 < earliest) {
    // Answer this from the rules rather than by failing 25 shuffles in a row:
    // the interface can then say what would work.
    throw new GenerationError(
      'too-early',
      `A winning line needs at least ${earliest} numbers, so draw ` +
        `${options.winAt + 1} cannot win.`,
      earliest,
    )
  }

  const seed = options.seed ?? randomSeed()
  const rng = createRng(seed)

  const items = options.items ?? numberItems(ruleset)
  if (items.length < ruleset.poolSize) {
    throw new GenerationError(
      'pool-too-small',
      `Too few items: ${items.length} for a pool of ${ruleset.poolSize}.`,
    )
  }
  if (options.winAt >= items.length) {
    throw new GenerationError(
      'out-of-range',
      `Win time ${options.winAt} lies outside the draw (0..${items.length - 1}).`,
    )
  }

  const winAtFor = options.winAtFor ?? (() => options.winAt)

  // Not every draw order carries every win time. With early win times a whole
  // B-I-N-G-O column can go unseen in the first draws, leaving no winning line
  // to fill. Since we set the order ourselves, that is no reason to give up:
  // we reshuffle. The seed still decides, so the result stays reproducible.
  const maxShuffles = 25
  let lastError: GenerationError | null = null

  for (let shuffle = 0; shuffle < maxShuffles; shuffle++) {
    const drawOrder = rng.shuffled(items)

    try {
      const cards: Card[] = []
      const seen = new Set<string>()

      for (let i = 0; i < options.cardCount; i++) {
        let card: Card | null = null

        // Duplicate cards would not be a bug, but they look wrong at a table.
        for (let dedupe = 0; dedupe < 50; dedupe++) {
          const candidate = buildCard(ruleset, drawOrder, winAtFor(i), rng, i + 1, options)
          if (!seen.has(signatureOf(candidate))) {
            card = candidate
            break
          }
        }
        if (card === null) {
          throw new GenerationError(
            'impossible',
            `From card ${i + 1} on, only repetitions come out — the ruleset does ` +
              `not allow enough different cards.`,
          )
        }

        seen.add(signatureOf(card))
        cards.push(card)
      }

      return {
        ruleset,
        seed,
        drawOrder,
        cards,
        winAt: options.winAt,
        winningItem: drawOrder[options.winAt]!,
      }
    } catch (error) {
      if (!(error instanceof GenerationError)) throw error
      lastError = error
    }
  }

  throw new GenerationError(
    'impossible',
    `No plan could be built in ${maxShuffles} draw orders. ` +
      `Last: ${lastError?.message ?? 'unknown'}`,
  )
}

/**
 * An honest random card — with no constraint on when it wins.
 *
 * Needed in two places: for the "ordinary bingo" mode, and as the yardstick in
 * the tests. Only against honest cards can we judge whether a prepared one
 * looks inconspicuous.
 */
export function randomCard(
  ruleset: Ruleset,
  items: readonly Item[],
  rng: Rng,
  cardId = 1,
): Card {
  const free = freeIndex(ruleset)
  const total = cellCount(ruleset)
  const cells: (Item | null)[] = new Array<Item | null>(total).fill(null)
  const used = new Set<number>()

  for (let col = 0; col < ruleset.cols; col++) {
    const pool = rng.shuffled(
      items.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col)),
    )
    for (let row = 0; row < ruleset.rows; row++) {
      const idx = row * ruleset.cols + col
      if (idx === free) continue
      const chosen = pool.pop()
      if (chosen === undefined) {
        throw new GenerationError('pool-too-small', `Column ${col} has too few items.`)
      }
      cells[idx] = chosen
      used.add(chosen.id)
    }
  }

  return { id: cardId, cells, winningLine: -1 }
}
