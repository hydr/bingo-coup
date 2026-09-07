<script lang="ts">
  import type { Plan } from '../../core/types.js'

  interface Props {
    plan: Plan
    guests: number
  }

  let { plan, guests }: Props = $props()

  /** Die Ziehung in Zehnerblöcken, damit der Moderator die Zeile hält. */
  const rows = $derived(
    Array.from({ length: Math.ceil(plan.drawOrder.length / 10) }, (_, i) => ({
      from: i * 10 + 1,
      items: plan.drawOrder.slice(i * 10, i * 10 + 10),
    })),
  )

  /** 1-basierte Nummer der auslösenden Ziehung — so zählt ein Mensch. */
  const winNumber = $derived(plan.winAt + 1)
</script>

<section class="host-sheet" data-testid="host-sheet">
  <h2>Moderatorenblatt</h2>
  <p class="muted small">
    {guests} Karten &middot; Bingo bei der {winNumber}. Ziehung &middot; Seed {plan.seed}
  </p>

  <div class="cue" data-testid="cue">
    <strong>Regie:</strong> Nach der Zahl
    <span class="cue-number" data-testid="winning-item">{plan.winningItem.label}</span>
    &mdash; das ist die {winNumber}. Ziehung &mdash; haben alle {guests} Gäste
    gleichzeitig Bingo. Ab hier den Preis verteilen bzw. auspacken lassen.
  </div>

  <h3>Ziehungsreihenfolge</h3>
  <p class="muted small">
    Genau in dieser Reihenfolge vorlesen. Wird eine Zahl übersprungen oder
    vertauscht, gewinnt niemand gleichzeitig.
  </p>

  <table class="draw-table">
    <tbody>
      {#each rows as row (row.from)}
        <tr>
          <th scope="row">{row.from}.</th>
          {#each row.items as item (item.id)}
            <td class:is-winner={item.id === plan.winningItem.id}>{item.label}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .host-sheet {
    max-width: 46em;
  }

  .cue {
    border: 1px solid var(--gold-soft);
    background: var(--gold-wash);
    border-radius: var(--radius);
    padding: 1rem 1.2rem;
    margin: 1.5rem 0 2.5rem;
  }

  .cue-number {
    font-size: 1.5em;
    font-weight: 600;
    color: var(--hit);
    padding: 0 0.15em;
    font-variant-numeric: tabular-nums;
  }

  .draw-table {
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
    margin-top: 1rem;
  }

  .draw-table th {
    text-align: right;
    padding: 0.3rem 0.7rem 0.3rem 0;
    color: var(--ink-faint);
    font-family: var(--sans);
    font-size: 0.75rem;
    font-weight: 400;
  }

  .draw-table td {
    padding: 0.3rem 0.55rem;
    text-align: right;
    min-width: 2.4em;
    border-bottom: 1px solid var(--line);
  }

  .draw-table td.is-winner {
    color: var(--hit);
    font-weight: 700;
    background: var(--gold-wash);
  }
</style>
