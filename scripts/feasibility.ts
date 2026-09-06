/**
 * Machbarkeitsanalyse.
 *
 * Beantwortet die Frage, an der der ganze Plan haengt: Bei welchen
 * Gewinnzeitpunkten laesst sich ein Saal voller Karten ueberhaupt bauen — und
 * wie gut sind die Karten getarnt?
 *
 * Zwei Verfahren im Vergleich:
 *   Auswahl (rejection sampling): ehrliche Zufallskarten erzeugen und die
 *     behalten, die zufaellig zum richtigen Zeitpunkt gewinnen. Perfekt
 *     getarnt, weil die Karten echt sind — aber nur brauchbar, solange die
 *     Trefferquote nicht zu klein wird.
 *   Konstruktion: die Karte gezielt um eine Gewinnlinie herum aufbauen.
 *     Funktioniert immer, muss die Tarnung aber selbst herstellen.
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

  // --- Verfahren 1: ehrliche Karten, gefiltert --------------------------
  const honestHits: number[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const card = randomCard(ruleset, items, rng)
    if (winIndexOf(card, ruleset, positions) === winAt) {
      honestHits.push(hitCountAfter(card, positions, winAt + 1))
    }
  }

  // --- Verfahren 2: konstruierte Karten ----------------------------------
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
  console.log(`\n=== ${name} (${ruleset.rows}x${ruleset.cols}, 1-${ruleset.poolSize}, ` +
    `Spalten ${ruleset.columnRanges ? 'an' : 'aus'}, freies Feld ${ruleset.freeCenter ? 'an' : 'aus'}) ===\n`)
  console.log(
    'Ziehung |  Auswahl  | Karten/s |  Bau ok | ms/Karte | Treffer echt | Treffer gebaut | verschieden',
  )
  console.log('-'.repeat(104))

  for (const winAt of points) {
    const r = analyse(ruleset, winAt, 1000 + winAt)
    const rate = r.perMille < 0.01 ? '  < 0.01' : r.perMille.toFixed(2).padStart(8)
    // Wie viele Karten liefert die Auswahl pro Sekunde? Grob: 1 Mio Ziehungen/s.
    const perSecond = r.hitRate === 0 ? 0 : Math.round(r.hitRate * 200_000)
    console.log(
      [
        String(r.winAt).padStart(7),
        `${rate} ‰`,
        String(perSecond).padStart(8),
        `${(r.buildOk * 100).toFixed(0).padStart(6)} %`,
        r.buildMs.toFixed(2).padStart(8),
        (r.meanHonest?.toFixed(2) ?? '  —').padStart(12),
        (r.meanBuilt?.toFixed(2) ?? '  —').padStart(14),
        String(r.distinct).padStart(11),
      ].join(' | '),
    )
  }
}

report('Klassisch', CLASSIC, [8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60])
report('Offen 1-80', OPEN_80, [10, 15, 20, 25, 30, 35, 40, 45, 50])
