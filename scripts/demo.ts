/**
 * Zeigt einen fertigen Spielplan im Terminal — Vorstufe des Moderatorenblatts.
 *
 *   npx tsx scripts/demo.ts [gaeste] [gewinnzeitpunkt] [seed]
 */
import { drawPositions, hitsAfter } from '../src/core/card.js'
import { generatePlan } from '../src/core/generator.js'
import { columnRange } from '../src/core/rules.js'
import type { Card, Plan } from '../src/core/types.js'

const guests = Number(process.argv[2] ?? 60)
const winAt = Number(process.argv[3] ?? 25)
const seed = Number(process.argv[4] ?? 20260906)

const plan = generatePlan({ cardCount: guests, winAt, seed })
const positions = drawPositions(plan.drawOrder)

function renderCard(plan: Plan, card: Card, drawn: number): string[] {
  const { ruleset } = plan
  const hits = hitsAfter(card, positions, drawn)
  const out: string[] = []

  if (ruleset.columnLabels) {
    out.push(ruleset.columnLabels.map((l) => `  ${l} `).join(''))
  }
  for (let row = 0; row < ruleset.rows; row++) {
    const cells: string[] = []
    for (let col = 0; col < ruleset.cols; col++) {
      const idx = row * ruleset.cols + col
      const cell = card.cells[idx]!
      const text = cell === null ? '**' : cell.label.padStart(2)
      // Getroffene Felder in Klammern, damit man das Bild ohne Farbe liest.
      cells.push(hits[idx] ? `(${text})` : ` ${text} `)
    }
    out.push(cells.join(''))
  }
  return out
}

console.log(`\nSpielplan — ${guests} Gaeste, Bingo bei Ziehung ${winAt + 1}, Seed ${seed}`)
console.log('='.repeat(72))

console.log('\nZIEHUNGSREIHENFOLGE (in genau dieser Reihenfolge vorlesen)\n')
const lines: string[] = []
for (let i = 0; i < plan.drawOrder.length; i += 10) {
  const chunk = plan.drawOrder.slice(i, i + 10).map((it) => it.label.padStart(3))
  lines.push(`${String(i + 1).padStart(3)}. ${chunk.join(' ')}`)
}
console.log(lines.slice(0, Math.ceil((winAt + 6) / 10)).join('\n'))
console.log(`  ... insgesamt ${plan.drawOrder.length} Zahlen`)

console.log(`\n>>> REGIE: Nach Zahl ${plan.winningItem.label} (die ${winAt + 1}. Ziehung)`)
console.log(`    haben ALLE ${guests} Gaeste gleichzeitig Bingo.`)
console.log(`    Ab hier: Preis verteilen bzw. auspacken lassen.\n`)

console.log('='.repeat(72))
console.log(`\nDie ersten drei Karten, Stand kurz vor dem Bingo (${winAt} Zahlen gezogen):\n`)

for (const card of plan.cards.slice(0, 3)) {
  console.log(`Karte ${card.id}`)
  for (const row of renderCard(plan, card, winAt)) console.log(`  ${row}`)
  console.log(`  -> es fehlt nur noch die ${plan.winningItem.label}\n`)
}

console.log('Dieselben Karten eine Ziehung spaeter:\n')
for (const card of plan.cards.slice(0, 3)) {
  console.log(`Karte ${card.id}`)
  for (const row of renderCard(plan, card, winAt + 1)) console.log(`  ${row}`)
  console.log()
}

const [from, to] = columnRange(plan.ruleset, 0)
console.log(`(Spalte B enthaelt Zahlen ${from}-${to}, danach je 15 weiter.)`)
