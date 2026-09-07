/**
 * Feasibility analysis.
 *
 * Answers the question the whole plan rested on: for which win times can a room
 * full of cards be built at all — and how well camouflaged are they?
 *
 * Two methods compared:
 *   Selection (rejection sampling): generate honest random cards and keep the
 *     ones that happen to win at the right moment. Perfectly camouflaged
 *     because the cards are genuine — but only usable while the hit rate stays
 *     workable.
 *   Construction: build the card deliberately around a winning line. Always
 *     works, but has to produce the camouflage itself.
 */
import { drawPositions, hitCountAfter, signatureOf, winIndexOf } from '../src/core/card.js'
import { buildCard, GenerationError, randomCard } from '../src/core/generator.js'
import { numberItems } from '../src/core/rules.js'
import { createRng } from '../src/core/rng.js'
import { CLASSIC, OPEN_80, type Ruleset } from '../src/core/types.js'

const SAMPLES = 120_000
const BUILD_COUNT = 300

interface Row {
  winAt: number
  hitRate: number
  perMille: number
  buildOk: number
  buildMs: number
  meanHonest: number | null
  meanBuilt: number | null
  distinct: number
}

function analyse(ruleset: Ruleset, winAt: number, seed: number): Row {
  const rng = createRng(seed)
  const items = numberItems(ruleset)
  const drawOrder = rng.shuffled(items)
  const positions = drawPositions(drawOrder)

  // --- Method 1: honest cards, filtered ---------------------------------
  const honestHits: number[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const card = randomCard(ruleset, items, rng)
    if (winIndexOf(card, ruleset, positions) === winAt) {
      honestHits.push(hitCountAfter(card, positions, winAt + 1))
    }
  }

  // --- Method 2: constructed cards ---------------------------------------
  const started = performance.now()
  const builtHits: number[] = []
  const signatures = new Set<string>()
  let ok = 0

  for (let i = 0; i < BUILD_COUNT; i++) {
    try {
      const card = buildCard(ruleset, drawOrder, winAt, rng, i + 1)
      if (winIndexOf(card, ruleset, positions) !== winAt) continue
      ok++
      signatures.add(signatureOf(card))
      builtHits.push(hitCountAfter(card, positions, winAt + 1))
    } catch (error) {
      if (!(error instanceof GenerationError)) throw error
    }
  }
  const buildMs = performance.now() - started

  const mean = (xs: number[]) =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length

  return {
    winAt,
    hitRate: honestHits.length / SAMPLES,
    perMille: (honestHits.length / SAMPLES) * 1000,
    buildOk: ok / BUILD_COUNT,
    buildMs: buildMs / BUILD_COUNT,
    meanHonest: mean(honestHits),
    meanBuilt: mean(builtHits),
    distinct: signatures.size,
  }
}

function report(name: string, ruleset: Ruleset, points: readonly number[]): void {
  console.log(
    `\n=== ${name} (${ruleset.rows}x${ruleset.cols}, 1-${ruleset.poolSize}, ` +
      `columns ${ruleset.columnRanges ? 'on' : 'off'}, free centre ` +
      `${ruleset.freeCenter ? 'on' : 'off'}) ===\n`,
  )
  console.log(
    'Draw | Selection | Cards/s | Build ok | ms/card | Hits honest | Hits built | Distinct',
  )
  console.log('-'.repeat(100))

  for (const winAt of points) {
    const r = analyse(ruleset, winAt, 1000 + winAt)
    const rate = r.perMille < 0.01 ? '  < 0.01' : r.perMille.toFixed(2).padStart(8)
    // How many cards would selection yield per second? Roughly.
    const perSecond = r.hitRate === 0 ? 0 : Math.round(r.hitRate * 200_000)
    console.log(
      [
        String(r.winAt).padStart(4),
        `${rate} ‰`,
        String(perSecond).padStart(7),
        `${(r.buildOk * 100).toFixed(0).padStart(7)} %`,
        r.buildMs.toFixed(2).padStart(7),
        (r.meanHonest?.toFixed(2) ?? '  —').padStart(11),
        (r.meanBuilt?.toFixed(2) ?? '  —').padStart(10),
        String(r.distinct).padStart(8),
      ].join(' | '),
    )
  }
}

report('Classic', CLASSIC, [8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60])
report('Open 1-80', OPEN_80, [10, 15, 20, 25, 30, 35, 40, 45, 50])
