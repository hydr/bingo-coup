/** Wie sieht eine ehrliche Karte aus, die zufaellig bei Ziehung k gewinnt? */
import { drawPositions, hitCountAfter, winIndexOf } from '../src/core/card.js'
import { randomCard } from '../src/core/generator.js'
import { numberItems } from '../src/core/rules.js'
import { createRng } from '../src/core/rng.js'
import { CLASSIC } from '../src/core/types.js'

const WIN_AT = 25
const rng = createRng(12345)
const items = numberItems(CLASSIC)
const counts: number[] = []
let seen = 0

for (let trial = 0; trial < 400_000; trial++) {
  const drawOrder = rng.shuffled(items)
  const positions = drawPositions(drawOrder)
  const card = randomCard(CLASSIC, items, rng)
  seen++
  if (winIndexOf(card, CLASSIC, positions) !== WIN_AT) continue
  counts.push(hitCountAfter(card, positions, WIN_AT + 1))
}

counts.sort((a, b) => a - b)
const mean = counts.reduce((a, b) => a + b, 0) / counts.length
console.log(`Stichproben:            ${seen}`)
console.log(`davon Gewinn bei ${WIN_AT}:   ${counts.length} (${((counts.length / seen) * 100).toFixed(2)} %)`)
console.log(`Treffer im Mittel:      ${mean.toFixed(2)}`)
console.log(`Spanne:                 ${counts[0]} .. ${counts[counts.length - 1]}`)
console.log(`5 % / 95 %:             ${counts[Math.floor(counts.length * 0.05)]} / ${counts[Math.floor(counts.length * 0.95)]}`)
