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
import { buildCard, generatePlan, GenerationError, randomCard } from './generator.js'
import { createRng } from './rng.js'
import { columnRange, freeIndex, lines, numberItems } from './rules.js'
import { CLASSIC, KIDS_3X3, OPEN_80 } from './types.js'

/** Der Gewinnzeitpunkt, den wir als Standard erwarten. */
const WIN_AT = 25

describe('Kerninvariante: Bingo genau zum geplanten Zeitpunkt', () => {
  // Ueber viele Seeds, weil ein einzelner Durchlauf einen seltenen Fehlerfall
  // in der Maskenlogik nicht zuverlaessig aufdeckt.
  const seeds = Array.from({ length: 60 }, (_, i) => i * 977 + 1)

  it.each(seeds)('Seed %i: Karte gewinnt bei Ziehung 25, keine frueher', (seed) => {
    const rng = createRng(seed)
    const drawOrder = rng.shuffled(numberItems(CLASSIC))
    const positions = drawPositions(drawOrder)
    const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, 1)

    assertCardValid(card, CLASSIC)
    expect(winIndexOf(card, CLASSIC, positions)).toBe(WIN_AT)
  })

  it('keine Linie wird vor dem Gewinnzeitpunkt vollstaendig', () => {
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

describe('Kartenstruktur', () => {
  const rng = createRng(7)
  const drawOrder = rng.shuffled(numberItems(CLASSIC))

  it('jede Zahl kommt nur einmal vor', () => {
    for (let n = 0; n < 25; n++) {
      const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, n + 1)
      const ids = card.cells.filter((c) => c !== null).map((c) => c!.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('jede Zahl steht im Zahlenbereich ihrer Spalte', () => {
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

  it('das Mittelfeld ist frei', () => {
    const card = buildCard(CLASSIC, drawOrder, WIN_AT, rng, 1)
    expect(card.cells[freeIndex(CLASSIC)]).toBeNull()
  })
})

describe('Plan: alle gewinnen gleichzeitig', () => {
  const plan = generatePlan({ cardCount: 60, winAt: WIN_AT, seed: 20240906 })
  const positions = drawPositions(plan.drawOrder)

  it('erzeugt die angeforderte Kartenzahl', () => {
    expect(plan.cards).toHaveLength(60)
  })

  it('jede einzelne Karte gewinnt bei derselben Ziehung', () => {
    for (const card of plan.cards) {
      expect(winIndexOf(card, plan.ruleset, positions)).toBe(WIN_AT)
    }
  })

  it('alle Karten werden von derselben Zahl ausgeloest', () => {
    // Folgt zwingend aus dem gemeinsamen Gewinnzeitpunkt — und ist genau der
    // Moment, auf den die ganze Dramaturgie hinauslaeuft.
    for (const card of plan.cards) {
      const ids = card.cells.filter((c) => c !== null).map((c) => c!.id)
      expect(ids).toContain(plan.winningItem.id)
    }
  })

  it('alle Karten stehen eine Ziehung vorher kurz vor dem Bingo', () => {
    for (const card of plan.cards) {
      const before = hitsAfter(card, positions, WIN_AT)
      const line = lines(plan.ruleset)[card.winningLine]!
      const missing = line.filter((idx) => !before[idx]).length
      expect(missing).toBe(1)
    }
  })

  it('keine Karte kommt doppelt vor', () => {
    const signatures = plan.cards.map(signatureOf)
    expect(new Set(signatures).size).toBe(signatures.length)
  })

  it('derselbe Seed liefert exakt denselben Plan', () => {
    const again = generatePlan({ cardCount: 60, winAt: WIN_AT, seed: 20240906 })
    expect(again.cards.map(signatureOf)).toEqual(plan.cards.map(signatureOf))
    expect(again.drawOrder.map((i) => i.id)).toEqual(plan.drawOrder.map((i) => i.id))
  })

  it('ein anderer Seed liefert einen anderen Plan', () => {
    const other = generatePlan({ cardCount: 60, winAt: WIN_AT, seed: 999 })
    expect(other.cards.map(signatureOf)).not.toEqual(plan.cards.map(signatureOf))
  })
})

describe('Tarnung: die Karten duerfen nicht praepariert aussehen', () => {
  const average = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

  it('das Trefferbild gleicht dem echter Gewinnerkarten', () => {
    // Der Massstab ist nicht irgendeine Karte, sondern eine ehrliche Karte, die
    // zufaellig genau bei WIN_AT gewinnt. Die hat systematisch mehr Treffer als
    // der Durchschnitt — sie hatte ja Glueck. Diese Referenz wird hier gemessen
    // statt geschaetzt, damit der Test nicht an einer Faustregel haengt.
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

  it('ohne naturalLook faellt die Karte auf', () => {
    // Gegenprobe: dann traegt die Karte nur die Gewinnlinie und das freie Feld.
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

  it('die Gewinnlinie liegt nicht immer an derselben Stelle', () => {
    const plan = generatePlan({ cardCount: 80, winAt: WIN_AT, seed: 6060 })
    expect(new Set(plan.cards.map((c) => c.winningLine)).size).toBeGreaterThan(2)
  })
})

describe('Varianten', () => {
  it('die Welle: tischweise versetzte Gewinnzeitpunkte', () => {
    const plan = generatePlan({
      cardCount: 24,
      winAt: 25,
      seed: 11,
      winAtFor: (i) => 25 + Math.floor(i / 8), // drei Tische a acht Gaeste
    })
    const pos = drawPositions(plan.drawOrder)
    const wins = plan.cards.map((c) => winIndexOf(c, plan.ruleset, pos))

    expect(wins.slice(0, 8).every((w) => w === 25)).toBe(true)
    expect(wins.slice(8, 16).every((w) => w === 26)).toBe(true)
    expect(wins.slice(16, 24).every((w) => w === 27)).toBe(true)
  })

  it('funktioniert ohne Spaltenbindung und ohne freies Feld', () => {
    const plan = generatePlan({ ruleset: OPEN_80, cardCount: 40, winAt: 25, seed: 77 })
    const pos = drawPositions(plan.drawOrder)
    for (const card of plan.cards) {
      assertCardValid(card, OPEN_80)
      expect(winIndexOf(card, OPEN_80, pos)).toBe(25)
    }
  })

  it('funktioniert auf dem kleinen Kinderfeld', () => {
    const plan = generatePlan({ ruleset: KIDS_3X3, cardCount: 15, winAt: 8, seed: 3 })
    const pos = drawPositions(plan.drawOrder)
    for (const card of plan.cards) {
      assertCardValid(card, KIDS_3X3)
      expect(winIndexOf(card, KIDS_3X3, pos)).toBe(8)
    }
  })

  it('Begriffe-Bingo verhaelt sich wie Zahlen-Bingo', () => {
    const labels = Array.from({ length: 75 }, (_, i) => `Begriff ${i + 1}`)
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
    expect(plan.winningItem.label).toMatch(/^Begriff /)
  })
})

describe('Fehlerfaelle', () => {
  it('meldet einen Gewinnzeitpunkt ausserhalb der Ziehung', () => {
    const rng = createRng(1)
    const drawOrder = rng.shuffled(numberItems(CLASSIC))
    expect(() => buildCard(CLASSIC, drawOrder, 999, rng, 1)).toThrow(GenerationError)
  })

  it('meldet einen zu fruehen Gewinnzeitpunkt mit klarer Begruendung', () => {
    // Vier Treffer in einer Linie sind vor der vierten Ziehung unmoeglich.
    expect(() => generatePlan({ cardCount: 1, winAt: 2, seed: 1 })).toThrow(
      /zu frueh oder zu spaet/,
    )
  })
})
