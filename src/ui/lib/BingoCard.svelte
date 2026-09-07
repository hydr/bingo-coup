<script lang="ts">
  import { hitsAfter, type DrawPositions } from '../../core/card.js'
  import { freeIndex } from '../../core/rules.js'
  import type { Card, Ruleset } from '../../core/types.js'

  interface Props {
    card: Card
    ruleset: Ruleset
    positions: DrawPositions
    /** Anzahl bereits gezogener Elemente. */
    drawn: number
    /** Zeigt die Gewinnlinie farblich an — nur für die Vorschau, nie im Druck. */
    reveal?: boolean
    /** Gewinnlinie als flache Zellindizes, nötig wenn `reveal` gesetzt ist. */
    winningCells?: readonly number[]
    /** Begriffe brauchen kleinere Schrift als Zahlen. */
    words?: boolean
    /**
     * Aufdruck oben rechts. `null` laesst ihn weg — wichtig, denn auf den
     * Tischen darf der Produktname nicht auftauchen: Er wuerde die
     * Ueberraschung verraten, und fremde Werbung will kein Gastgeber.
     */
    brand?: string | null
  }

  let {
    card,
    ruleset,
    positions,
    drawn,
    reveal = false,
    winningCells = [],
    words = false,
    brand = null,
  }: Props = $props()

  const free = $derived(freeIndex(ruleset))
  const hits = $derived(hitsAfter(card, positions, drawn))
  const winners = $derived(new Set(reveal ? winningCells : []))
</script>

<div class="card" data-testid="card" data-card-id={card.id}>
  <div class="card-head">
    <span>Karte {card.id}</span>
    {#if brand}<span>{brand}</span>{/if}
  </div>

  <div
    class="grid"
    style="grid-template-columns: repeat({ruleset.cols}, 1fr)"
    role="table"
    aria-label="Bingokarte {card.id}"
  >
    {#if ruleset.columnLabels}
      {#each ruleset.columnLabels as label (label)}
        <div class="col-label">{label}</div>
      {/each}
    {/if}

    {#each card.cells as cell, idx (idx)}
      <div
        class="cell"
        class:free={idx === free}
        class:hit={hits[idx]}
        class:winner={winners.has(idx)}
        class:words={words && idx !== free}
        data-testid="cell"
        data-hit={hits[idx] ? 'true' : 'false'}
      >
        {cell === null ? 'FREI' : cell.label}
      </div>
    {/each}
  </div>
</div>
