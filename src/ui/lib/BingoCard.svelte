<script lang="ts">
  import { hitsAfter, type DrawPositions } from '../../core/card.js'
  import { freeIndex } from '../../core/rules.js'
  import type { Card, Ruleset } from '../../core/types.js'
  import type { Messages } from '../i18n/index.js'

  interface Props {
    card: Card
    ruleset: Ruleset
    positions: DrawPositions
    t: Messages
    /** How many items have been drawn. */
    drawn: number
    /** Colours in the winning line — preview only, never in print. */
    reveal?: boolean
    /** The winning line as flat cell indices; needed when `reveal` is set. */
    winningCells?: readonly number[]
    /**
     * The imprint in the top right. `null` leaves it out — which matters,
     * because the product name must not appear on the tables: it would give
     * the surprise away, and no host wants somebody else's advertising.
     */
    brand?: string | null
  }

  let {
    card,
    ruleset,
    positions,
    t,
    drawn,
    reveal = false,
    winningCells = [],
    brand = null,
  }: Props = $props()

  const free = $derived(freeIndex(ruleset))
  const hits = $derived(hitsAfter(card, positions, drawn))
  const winners = $derived(new Set(reveal ? winningCells : []))
</script>

<div class="card" data-testid="card" data-card-id={card.id}>
  <div class="card-head">
    <span>{t.card.label(card.id)}</span>
    {#if brand}<span>{brand}</span>{/if}
  </div>

  <div
    class="grid"
    style="grid-template-columns: repeat({ruleset.cols}, 1fr)"
    role="table"
    aria-label={t.card.aria(card.id)}
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
        data-testid="cell"
        data-hit={hits[idx] ? 'true' : 'false'}
      >
        {cell === null ? t.card.free : cell.label}
      </div>
    {/each}
  </div>
</div>
