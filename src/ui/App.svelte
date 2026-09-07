<script lang="ts">
  import { drawPositions, winIndexOf } from '../core/card.js'
  import { generatePlan } from '../core/generator.js'
  import { lines } from '../core/rules.js'
  import { CLASSIC, KIDS_3X3, OPEN_80, type Ruleset } from '../core/types.js'
  import BingoCard from './lib/BingoCard.svelte'
  import HostSheet from './lib/HostSheet.svelte'

  const RULESETS: Record<string, { label: string; ruleset: Ruleset }> = {
    classic: { label: 'Klassisch — 5×5, 1–75, freies Mittelfeld', ruleset: CLASSIC },
    open80: { label: 'Offen — 5×5, 1–80, alle Felder', ruleset: OPEN_80 },
    kids: { label: 'Kinder — 3×3, 1–30', ruleset: KIDS_3X3 },
  }

  let guests = $state(60)
  /** 1-basiert, so wie ein Mensch zählt. Der Kern rechnet 0-basiert. */
  let winNumber = $state(26)
  let seed = $state(20260907)
  let rulesetKey = $state('classic')
  let showBrand = $state(false)
  let previewCount = $state(8)

  const ruleset = $derived(RULESETS[rulesetKey]!.ruleset)

  const result = $derived.by(() => {
    try {
      const plan = generatePlan({
        ruleset,
        cardCount: guests,
        winAt: winNumber - 1,
        seed,
      })
      return { plan, error: null as string | null }
    } catch (error) {
      return { plan: null, error: (error as Error).message }
    }
  })

  const plan = $derived(result.plan)
  const positions = $derived(plan ? drawPositions(plan.drawOrder) : null)

  /**
   * Position des Schiebereglers. Startet kurz vor dem Bingo, weil das der
   * interessanteste Moment ist — alle Karten warten auf dieselbe Zahl.
   */
  let drawn = $state(25)

  // Bei neuem Plan mitziehen, damit der Regler nie im Nichts steht.
  $effect(() => {
    drawn = Math.min(winNumber - 1, ruleset.poolSize)
  })

  const bingoCount = $derived.by(() => {
    if (!plan || !positions) return 0
    return plan.cards.filter((c) => winIndexOf(c, ruleset, positions) < drawn).length
  })

  const lastDrawn = $derived(plan && drawn > 0 ? plan.drawOrder[drawn - 1]! : null)

  const winningCellsOf = (lineIdx: number) => lines(ruleset)[lineIdx] ?? []

  function reroll() {
    seed = Math.floor(Math.random() * 99999999)
  }
</script>

<header class="hero no-print">
  <div class="wrap">
    <p class="eyebrow">Bingo Coup</p>
    <h1>Bingo, bei dem<br />alle gleichzeitig gewinnen.</h1>
    <p class="lead">
      Das Spiel läuft für alle sichtbar normal ab: echte Karten, ein Moderator, der
      Zahlen vorliest. Nur ist die Reihenfolge vorher festgelegt — und jede Karte so
      gebaut, dass ihr am Ende dieselbe Zahl fehlt. Dann fällt sie, und der ganze Saal
      springt im selben Augenblick auf.
    </p>
  </div>
</header>

<main class="wrap no-print">
  <hr class="rule" />

  <section>
    <h2>Spielplan erzeugen</h2>

    <div class="controls">
      <div>
        <label for="guests">Gäste</label>
        <input id="guests" type="number" min="1" max="500" bind:value={guests} data-testid="guests" />
      </div>
      <div>
        <label for="winNumber">Bingo bei Ziehung</label>
        <input
          id="winNumber"
          type="number"
          min="4"
          max={ruleset.poolSize}
          bind:value={winNumber}
          data-testid="win-number"
        />
      </div>
      <div>
        <label for="seed">Seed</label>
        <input id="seed" type="number" bind:value={seed} data-testid="seed" />
      </div>
      <div>
        <label for="ruleset">Regeln</label>
        <select id="ruleset" bind:value={rulesetKey} data-testid="ruleset">
          {#each Object.entries(RULESETS) as [key, entry] (key)}
            <option value={key}>{entry.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="ghost" onclick={reroll} data-testid="reroll">Andere Karten</button>
      <button onclick={() => window.print()} disabled={!plan} data-testid="print">
        Karten und Moderatorenblatt drucken
      </button>
      <label class="inline">
        <input type="checkbox" bind:checked={showBrand} data-testid="brand-toggle" />
        Aufdruck „Bingo Coup" auf den Karten
      </label>
    </div>

    <p class="small muted hint">
      Der Seed macht den Plan reproduzierbar: Geht der Ausdruck verloren, liefert
      derselbe Seed exakt dieselben Karten. Der Aufdruck bleibt standardmäßig weg —
      auf dem Tisch würde er die Überraschung verraten.
    </p>

    {#if result.error}
      <p class="error" data-testid="error">{result.error}</p>
    {/if}
  </section>

  {#if plan && positions}
    <hr class="rule" />

    <section>
      <h2>Probelauf</h2>
      <p class="lead">
        Zieh den Regler durch die Ziehung. Bis zur {winNumber}. Zahl hat niemand Bingo —
        dann alle auf einmal.
      </p>

      <div class="sim">
        <input
          type="range"
          min="0"
          max={plan.drawOrder.length}
          bind:value={drawn}
          aria-label="Anzahl gezogener Zahlen"
          data-testid="draw-slider"
        />

        <div class="readout">
          <div>
            <span class="readout-label">Gezogen</span>
            <strong data-testid="drawn-count">{drawn}</strong>
            <span class="muted">von {plan.drawOrder.length}</span>
          </div>
          <div>
            <span class="readout-label">Zuletzt</span>
            <strong data-testid="last-drawn">{lastDrawn ? lastDrawn.label : '—'}</strong>
          </div>
          <div class:triumph={bingoCount > 0}>
            <span class="readout-label">Bingo</span>
            <strong data-testid="bingo-count">{bingoCount}</strong>
            <span class="muted">von {guests} Karten</span>
          </div>
        </div>

        {#if bingoCount === 0 && drawn === winNumber - 1}
          <p class="cue-line" data-testid="cue-line">
            Alle {guests} Karten warten jetzt auf die
            <strong>{plan.winningItem.label}</strong>.
          </p>
        {:else if bingoCount === guests && guests > 0}
          <p class="cue-line triumph-line" data-testid="triumph-line">
            Alle {guests} Karten haben Bingo — ausgelöst von der
            <strong>{plan.winningItem.label}</strong>.
          </p>
        {/if}
      </div>

      <h3 class="preview-head">Vorschau</h3>
      <p class="small muted">
        Die Ringe zeigen den Stand beim Reglerwert. Die goldene Fläche ist die
        Gewinnlinie — die sieht nur du, nicht der Gast.
      </p>

      <div class="cards" data-testid="preview">
        {#each plan.cards.slice(0, previewCount) as card (card.id)}
          <BingoCard
            {card}
            {ruleset}
            {positions}
            {drawn}
            reveal
            winningCells={winningCellsOf(card.winningLine)}
            brand={showBrand ? 'Bingo Coup' : null}
          />
        {/each}
      </div>

      {#if previewCount < plan.cards.length}
        <div class="actions">
          <button
            class="ghost"
            onclick={() => (previewCount = plan.cards.length)}
            data-testid="show-all"
          >
            Alle {plan.cards.length} Karten zeigen
          </button>
        </div>
      {/if}
    </section>

    <hr class="rule" />

    <section>
      <HostSheet {plan} {guests} />
    </section>

    <hr class="rule" />

    <footer class="small muted foot">
      <p>
        Gedacht für Familienfeiern — Goldene Hochzeit, Hochzeit, Kindergeburtstag,
        Firmenfeier. Niemand wird bevorzugt, es gibt keinen Verlierer. Nicht gedacht
        für Verlosungen mit Geldeinsatz.
      </p>
    </footer>
  {/if}
</main>

<!-- Druckfassung: leere Karten zum Ausfüllen, danach das Moderatorenblatt. -->
{#if plan && positions}
  <div class="print-only">
    <div class="sheet">
      {#each plan.cards as card (card.id)}
        <BingoCard
          {card}
          {ruleset}
          {positions}
          drawn={0}
          brand={showBrand ? 'Bingo Coup' : null}
        />
      {/each}
    </div>
    <HostSheet {plan} {guests} />
  </div>
{/if}

<style>
  .hero {
    padding: clamp(3rem, 10vw, 6rem) 0 0;
  }

  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1.2rem;
    margin: 1.5rem 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0 0;
  }

  label.inline {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    font-size: 0.85rem;
    margin: 0;
    cursor: pointer;
  }

  label.inline input {
    accent-color: var(--gold);
  }

  .hint {
    max-width: 42em;
    margin-top: 1.2rem;
  }

  .error {
    border-left: 3px solid var(--hit);
    background: #fdf3f1;
    padding: 0.8rem 1rem;
    margin-top: 1.5rem;
    font-family: var(--sans);
    font-size: 0.88rem;
  }

  .sim {
    margin: 2rem 0 3rem;
  }

  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: 2.5rem;
    margin-top: 1.2rem;
  }

  .readout strong {
    font-size: 1.7rem;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    display: inline-block;
    min-width: 1.4em;
  }

  .readout-label {
    display: block;
    font-family: var(--sans);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .readout .triumph strong {
    color: var(--hit);
  }

  .cue-line {
    margin-top: 1.5rem;
    padding: 0.8rem 1.1rem;
    border: 1px solid var(--gold-soft);
    background: var(--gold-wash);
    border-radius: var(--radius);
    max-width: 40em;
  }

  .cue-line strong {
    color: var(--hit);
    font-size: 1.15em;
  }

  .triumph-line {
    border-color: var(--hit);
    background: #fdf3f1;
  }

  .preview-head {
    margin-top: 2.5rem;
  }

  .cards {
    margin-top: 1.2rem;
  }

  .foot {
    max-width: 42em;
    padding-bottom: 4rem;
  }
</style>
