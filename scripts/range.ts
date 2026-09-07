/**
 * The product question: which win times can furnish a whole room? Unlike
 * scripts/feasibility.ts this measures the real path through generatePlan,
 * reshuffling of the draw order included.
 */
import { drawPositions, winIndexOf } from '../src/core/card.js'
import { generatePlan, GenerationError } from '../src/core/generator.js'
import { CLASSIC, OPEN_80, type Ruleset } from '../src/core/types.js'

const GUESTS = 80

function check(ruleset: Ruleset, winAt: number, seed: number): string {
  const started = performance.now()
  try {
    const plan = generatePlan({ ruleset, cardCount: GUESTS, winAt, seed })
    const pos = drawPositions(plan.drawOrder)
    const wrong = plan.cards.filter((c) => winIndexOf(c, ruleset, pos) !== winAt).length
    const ms = performance.now() - started
    if (wrong > 0) return `FAILED: ${wrong} cards wrong`
    return `ok  (${ms.toFixed(0)} ms)`
  } catch (error) {
    if (error instanceof GenerationError) return `no (${error.message.slice(0, 60)}...)`
    throw error
  }
}

for (const [name, ruleset] of [['Classic 1-75', CLASSIC], ['Open 1-80', OPEN_80]] as const) {
  console.log(`\n=== ${name}, ${GUESTS} guests, 5 seeds each ===\n`)
  for (let winAt = 5; winAt <= 65; winAt += 5) {
    const results = [1, 2, 3, 4, 5].map((s) => check(ruleset, winAt, s * 7919))
    const okCount = results.filter((r) => r.startsWith('ok')).length
    const detail = okCount === 5 ? results[0] : results.find((r) => !r.startsWith('ok')) ?? ''
    console.log(`Draw ${String(winAt).padStart(2)}: ${okCount}/5 ${detail}`)
  }
}
