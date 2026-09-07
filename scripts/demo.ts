/**
 * Prints a finished plan to the terminal — the precursor of the host sheet.
 *
 *   npx tsx scripts/demo.ts [guests] [win time] [seed]
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
      // Marked squares in brackets, so the pattern reads without colour.
      cells.push(hits[idx] ? `(${text})` : ` ${text} `)
    }
    out.push(cells.join(''))
  }
  return out
}

console.log(`\nPlan — ${guests} guests, bingo on draw ${winAt + 1}, seed ${seed}`)
console.log('='.repeat(72))

console.log('\nDRAW ORDER (read out in exactly this order)\n')
const lines: string[] = []
for (let i = 0; i < plan.drawOrder.length; i += 10) {
  const chunk = plan.drawOrder.slice(i, i + 10).map((it) => it.label.padStart(3))
  lines.push(`${String(i + 1).padStart(3)}. ${chunk.join(' ')}`)
}
console.log(lines.slice(0, Math.ceil((winAt + 6) / 10)).join('\n'))
console.log(`  ... ${plan.drawOrder.length} numbers in total`)

console.log(`\n>>> CUE: after the number ${plan.winningItem.label} (draw ${winAt + 1})`)
console.log(`    all ${guests} guests have bingo at the same time.`)
console.log(`    From here: hand out the prize, or let them unwrap.\n`)

console.log('='.repeat(72))
console.log(`\nThe first three cards, just short of bingo (${winAt} numbers drawn):\n`)

for (const card of plan.cards.slice(0, 3)) {
  console.log(`Card ${card.id}`)
  for (const row of renderCard(plan, card, winAt)) console.log(`  ${row}`)
  console.log(`  -> only the ${plan.winningItem.label} is missing\n`)
}

console.log('The same cards one draw later:\n')
for (const card of plan.cards.slice(0, 3)) {
  console.log(`Card ${card.id}`)
  for (const row of renderCard(plan, card, winAt + 1)) console.log(`  ${row}`)
  console.log()
}

const [from, to] = columnRange(plan.ruleset, 0)
console.log(`(Column B holds numbers ${from}-${to}, each following column 15 more.)`)
