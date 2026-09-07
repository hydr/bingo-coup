import { earliestWinNumber, GenerationError } from '../../core/generator.js'
import type { Ruleset } from '../../core/types.js'
import type { Messages } from '../i18n/index.js'

/**
 * Turns a core error into something a host can act on.
 *
 * The core's own messages stay technical and English — they talk about draw
 * orders and attempt counts, which is the wrong register for somebody planning
 * a party. Both views go through here: the generator, and the draw app, where
 * the message would otherwise stand on the projection in front of the guests.
 *
 * A new error code in the core needs a case here, or the interface falls back
 * to the unspecific sentence.
 */
export function describeError(error: unknown, t: Messages, ruleset: Ruleset): string {
  if (!(error instanceof GenerationError)) return t.errors.unknown
  switch (error.code) {
    case 'too-early':
      return t.errors.tooEarly(error.earliest ?? earliestWinNumber(ruleset))
    case 'pool-too-small':
      return t.errors.poolTooSmall
    case 'out-of-range':
    case 'impossible':
      return t.errors.impossible
    default:
      return t.errors.unknown
  }
}
