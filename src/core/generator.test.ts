import { describe, expect, it } from 'vitest'
import {
  assertCardValid,
  drawPositions,
  hitCountAfter,
  hitsAfter,
  lineCompletesAt,
  signatureOf,
  winIndexOf,
} from './card.js'
import {
  buildCard,
  earliestWinNumber,
  generatePlan,
  GenerationError,
  randomCard,
} from './generator.js'
import { createRng } from './rng.js'
import { columnRange, freeIndex, lines, numberItems } from './rules.js'
import { CLASSIC, KIDS_3X3, OPEN_80 } from './types.js'

/** The win time we treat as the default. */
const WIN_AT = 25

describe('the core invariant: bingo exactly when planned', () => {
  // Across many seeds, because a single run does not reliably surface a rare
  // failure in the slot logic.
  const seeds = Array.from({ length: 60 }, (_, i) => i * 977 + 1)

  it.each(seeds)('seed %i: the card wins on draw 25, none earlier', (seed) => {
    const rng = createRng(seed)
    const drawOrder = rng.shuffled(numberItems(CLASSIC))
    const positions = drawPositions(drawOrder)
    const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, 1)

    assertCardValid(card, CLASSIC)
    expect(winIndexOf(card, CLASSIC, positions)).toBe(WIN_AT)
  })

  it('no line completes before the win time', () => {
    const rng = createRng(4242)
    const drawOrder = rng.shuffled(numberItems(CLASSIC))
    const positions = drawPositions(drawOrder)

    for (let n = 0; n < 30; n++) {
      const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, n + 1)
      for (let l = 0; l < lines(CLASSIC).length; l++) {
        expect(lineCompletesAt(card, CLASSIC, l, positions)).toBeGreaterThanOrEqual(WIN_AT)
      }
    }
  })
})

describe('card structure', () => {
  const rng = createRng(7)
  const drawOrder = rng.shuffled(numberItems(CLASSIC))

  it('every number appears only once', () => {
    for (let n = 0; n < 25; n++) {
      const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, n + 1)
      const ids = card.cells.filter((c) => c !== null).map((c) => c!.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('every number sits in its column range', () => {
    for (let n = 0; n < 25; n++) {
      const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, n + 1)
      card.cells.forEach((cell, idx) => {
        if (cell === null) return
        const [from, to] = columnRange(CLASSIC, idx % CLASSIC.cols)
        expect(cell.id).toBeGreaterThanOrEqual(from)
        expect(cell.id).toBeLessThanOrEqual(to)
      })
    }
  })

  it('the centre square is free', () => {
    const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, 1)
    expect(card.cells[freeIndex(CLASSIC)]).toBeNull()
  })
})

describe('a plan: everybody wins at once', () => {
  const plan = generatePlan({ cardCount: 60, winAt: WIN_AT, seed: 20240906 })
  const positions = drawPositions(plan.drawOrder)

  it('produces as many cards as asked for', () => {
    expect(plan.cards).toHaveLength(60)
  })

  it('every single card wins on the same draw', () => {
    for (const card of plan.cards) {
      expect(winIndexOf(card, plan.ruleset, positions)).toBe(WIN_AT)
    }
  })

  it('every card is set off by the same number', () => {
    // A necessary consequence of the shared win time — and exactly the moment
    // the whole build-up leads to.
    for (const card of plan.cards) {
      const ids = card.cells.filter((c) => c !== null).map((c) => c!.id)
      expect(ids).toContain(plan.winningItem.id)
    }
  })

  it('one draw earlier, every card is one square short', () => {
    for (const card of plan.cards) {
      const before = hitsAfter(card, positions, WIN_AT)
      const line = lines(plan.ruleset)[card.winningLine]!
      const missing = line.filter((idx) => !before[idx]).length
      expect(missing).toBe(1)
    }
  })

  it('no card appears twice', () => {
    const signatures = plan.cards.map(signatureOf)
    expect(new Set(signatures).size).toBe(signatures.length)
  })

  it('the same seed returns exactly the same plan', () => {
    const again = generatePlan({ cardCount: 60, winAt: WIN_AT, seed: 20240906 })
    expect(again.cards.map(signatureOf)).toEqual(plan.cards.map(signatureOf))
    expect(again.drawOrder.map((i) => i.id)).toEqual(plan.drawOrder.map((i) => i.id))
  })

  it('a different seed returns a different plan', () => {
    const other = generatePlan({ cardCount: 60, winAt: WIN_AT, seed: 999 })
    expect(other.cards.map(signatureOf)).not.toEqual(plan.cards.map(signatureOf))
  })
})

describe('camouflage: the cards must not look prepared', () => {
  const average = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

  it('the pattern of hits matches that of honest winning cards', () => {
    // The yardstick is not any old card but an honest one that happens to win
    // exactly on WIN_AT. Such a card has systematically more hits than average
    // — it got lucky. This reference is measured here rather than estimated,
    // so the test does not rest on a rule of thumb.
    const plan = generatePlan({ cardCount: 150, winAt: WIN_AT, seed: 31337 })
    const pos = drawPositions(plan.drawOrder)

    const rng = createRng(31338)
    const items = numberItems(CLASSIC)
    const honest: number[] = []
    for (let i = 0; i < 120_000 && honest.length < 500; i++) {
      const card = randomCard(CLASSIC, items, rng)
      if (winIndexOf(card, CLASSIC, pos) === WIN_AT) {
        honest.push(hitCountAfter(card, pos, WIN_AT + 1))
      }
    }
    expect(honest.length).toBeGreaterThan(50)

    const built = plan.cards.map((c) => hitCountAfter(c, pos, WIN_AT + 1))
    expect(Math.abs(average(built) - average(honest))).toBeLessThan(1)
  })

  it('without naturalLook the card stands out', () => {
    // The counter-check: the card then carries only its winning line and the
    // free centre.
    const plan = generatePlan({
      cardCount: 20,
      winAt: WIN_AT,
      seed: 5,
      naturalLook: false,
    })
    const pos = drawPositions(plan.drawOrder)
    const counts = plan.cards.map((c) => hitCountAfter(c, pos, WIN_AT + 1))
    expect(Math.max(...counts)).toBeLessThanOrEqual(6)
  })

  it('the winning line is not always in the same place', () => {
    const plan = generatePlan({ cardCount: 80, winAt: WIN_AT, seed: 6060 })
    expect(new Set(plan.cards.map((c) => c.winningLine)).size).toBeGreaterThan(2)
  })
})

describe('variants', () => {
  it('the wave: win times staggered table by table', () => {
    const plan = generatePlan({
      cardCount: 24,
      winAt: 25,
      seed: 11,
      winAtFor: (i) => 25 + Math.floor(i / 8), // three tables of eight guests
    })
    const pos = drawPositions(plan.drawOrder)
    const wins = plan.cards.map((c) => winIndexOf(c, plan.ruleset, pos))

    expect(wins.slice(0, 8).every((w) => w === 25)).toBe(true)
    expect(wins.slice(8, 16).every((w) => w === 26)).toBe(true)
    expect(wins.slice(16, 24).every((w) => w === 27)).toBe(true)
  })

  it('works without column ranges and without a free centre', () => {
    const plan = generatePlan({ ruleset: OPEN_80, cardCount: 40, winAt: 25, seed: 77 })
    const pos = drawPositions(plan.drawOrder)
    for (const card of plan.cards) {
      assertCardValid(card, OPEN_80)
      expect(winIndexOf(card, OPEN_80, pos)).toBe(25)
    }
  })

  it('works on the small kids grid', () => {
    const plan = generatePlan({ ruleset: KIDS_3X3, cardCount: 15, winAt: 8, seed: 3 })
    const pos = drawPositions(plan.drawOrder)
    for (const card of plan.cards) {
      assertCardValid(card, KIDS_3X3)
      expect(winIndexOf(card, KIDS_3X3, pos)).toBe(8)
    }
  })

  it('custom labels behave exactly like numbers', () => {
    // The win logic must never look at `label`. Not a product feature but the
    // guarantee that display and logic stay apart.
    const labels = Array.from({ length: 75 }, (_, i) => `Phrase ${i + 1}`)
    const plan = generatePlan({
      cardCount: 10,
      winAt: 20,
      seed: 8,
      items: labels.map((label, i) => ({ id: i + 1, label })),
    })
    const pos = drawPositions(plan.drawOrder)
    for (const card of plan.cards) {
      expect(winIndexOf(card, plan.ruleset, pos)).toBe(20)
    }
    expect(plan.winningItem.label).toMatch(/^Phrase /)
  })
})

describe('failure cases', () => {
  it('reports a win time outside the draw', () => {
    const rng = createRng(1)
    const drawOrder = rng.shuffled(numberItems(CLASSIC))
    expect(() => buildCard(CLASSIC, drawOrder, 999, rng, 1)).toThrow(GenerationError)
  })

  it('reports a win time that is too early, and says what would work', () => {
    // Four squares in a line cannot all be hit before the fourth draw. The
    // code matters more than the wording: the interface picks the message it
    // shows from it, in whichever language is on.
    expect.assertions(3)
    try {
      generatePlan({ cardCount: 1, winAt: 2, seed: 1 })
    } catch (error) {
      const failure = error as GenerationError
      expect(failure.code).toBe('too-early')
      expect(failure.earliest).toBe(4)
      expect(failure.message).toContain('at least 4')
    }
  })

  it('names the earliest possible win for each ruleset', () => {
    // A line through the free centre needs one real square less, which is what
    // makes an early win possible at all.
    expect(earliestWinNumber(CLASSIC)).toBe(4)
    expect(earliestWinNumber(KIDS_3X3)).toBe(2)
    expect(earliestWinNumber(OPEN_80)).toBe(5)
  })
})
