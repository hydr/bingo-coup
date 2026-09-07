import { describe, expect, it } from 'vitest'
import { drawHash, readParams } from './planParams.js'

/**
 * Diese Tests gäbe es nicht, wenn der Fehler nicht schon passiert wäre: Ein
 * fehlender Parameter kam als `null` an, und `Number(null)` ist 0 statt NaN.
 * Damit startete die Seite ohne Adresszusatz mit einem Gast und Gewinn bei
 * Ziehung 1 — also mit einer Fehlermeldung statt mit einem Plan.
 */
describe('readParams', () => {
  const defaults = { guests: 60, winNumber: 26, seed: 20260907, rulesetKey: 'classic' }

  it.each(['', '#', '#/', '#draw', '#draw?', '#generator'])(
    'nimmt bei %o die Standardwerte',
    (hash) => {
      expect(readParams(hash).params).toEqual(defaults)
    },
  )

  it('liest vollständige Angaben', () => {
    expect(readParams('#draw?g=40&w=8&s=12345&r=open80').params).toEqual({
      guests: 40,
      winNumber: 8,
      seed: 12345,
      rulesetKey: 'open80',
    })
  })

  it('erkennt die Ansicht', () => {
    expect(readParams('').view).toBe('generator')
    expect(readParams('#draw?g=1').view).toBe('draw')
    expect(readParams('#/draw').view).toBe('draw')
  })

  it('ersetzt Unsinn durch Standardwerte statt zu rechnen', () => {
    const { params } = readParams('#draw?g=abc&w=&s=NaN&r=gibtsnicht')
    expect(params).toEqual(defaults)
  })

  it('begrenzt Werte auf das Mögliche', () => {
    expect(readParams('#draw?g=99999').params.guests).toBe(500)
    expect(readParams('#draw?g=0').params.guests).toBe(1)
    // Der Gewinnzeitpunkt kann nicht hinter dem Ende der Ziehung liegen.
    expect(readParams('#draw?w=900&r=classic').params.winNumber).toBe(75)
    expect(readParams('#draw?w=900&r=kids').params.winNumber).toBe(30)
  })

  it('kommt mit dem eigenen Link zurecht', () => {
    const params = { guests: 44, winNumber: 19, seed: 4242, rulesetKey: 'kids' }
    const round = readParams(drawHash(params))
    expect(round.view).toBe('draw')
    expect(round.params).toEqual(params)
  })
})
