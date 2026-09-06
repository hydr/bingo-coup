export type { Card, Cell, Item, Plan, Ruleset } from './types.js'
export { CLASSIC, KIDS_3X3, OPEN_80 } from './types.js'

export { createRng, randomSeed, type Rng } from './rng.js'

export {
  cellCount,
  cellIndex,
  columnOf,
  columnRange,
  fitsColumn,
  freeIndex,
  labelItems,
  lines,
  numberItems,
  validateRuleset,
} from './rules.js'

export {
  assertCardValid,
  drawPositions,
  hitCountAfter,
  hitsAfter,
  lineCompletesAt,
  signatureOf,
  winIndexOf,
  type DrawPositions,
} from './card.js'

export {
  buildCard,
  generatePlan,
  GenerationError,
  randomCard,
  type CardOptions,
  type PlanOptions,
} from './generator.js'
