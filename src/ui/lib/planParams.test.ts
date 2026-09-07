import { describe, expect, it } from 'vitest'
import { drawHash, readParams, type PlanParams } from './planParams.js'

/**
 * These tests would not exist if the mistake had not already happened: a
 * missing parameter arrives as `null`, and `Number(null)` is 0 rather than NaN.
 * The page without an address suffix therefore started with one guest and a win
 * on draw 1 — an error message instead of a plan.
 */
describe('readParams', () => {
  const defaults: PlanParams = {
    guests: 60,
    winNumber: 26,
    seed: 20260907,
    rulesetKey: 'classic',
  }

  it.each(['', '#', '#/', '#draw', '#draw?', '#generator'])(
    'falls back to the defaults for %o',
    (hash) => {
      expect(readParams(hash).params).toEqual(defaults)
    },
  )

  it('reads a full set of values', () => {
    expect(readParams('#draw?g=40&w=8&s=12345&r=open80').params).toEqual({
      guests: 40,
      winNumber: 8,
      seed: 12345,
      rulesetKey: 'open80',
    })
  })

  it('recognises the view', () => {
    expect(readParams('').view).toBe('generator')
    expect(readParams('#draw?g=1').view).toBe('draw')
    expect(readParams('#/draw').view).toBe('draw')
  })

  it('replaces nonsense with defaults instead of computing with it', () => {
    expect(readParams('#draw?g=abc&w=&s=NaN&r=nosuchthing').params).toEqual(defaults)
  })

  it('clamps values to what is possible', () => {
    expect(readParams('#draw?g=99999').params.guests).toBe(500)
    expect(readParams('#draw?g=0').params.guests).toBe(1)
    // The win time cannot lie beyond the end of the draw.
    expect(readParams('#draw?w=900&r=classic').params.winNumber).toBe(75)
    expect(readParams('#draw?w=900&r=kids').params.winNumber).toBe(30)
  })

  it('round-trips its own link', () => {
    const params: PlanParams = {
      guests: 44,
      winNumber: 19,
      seed: 4242,
      rulesetKey: 'kids',
    }
    const round = readParams(drawHash(params))
    expect(round.view).toBe('draw')
    expect(round.params).toEqual(params)
  })
})
