<script lang="ts">
  import { onMount } from 'svelte'
  import { drawPositions, winIndexOf } from '../core/card.js'
  import { earliestWinNumber, generatePlan } from '../core/generator.js'
  import { randomSeed } from '../core/rng.js'
  import { lines } from '../core/rules.js'
  import {
    detectLocale,
    LOCALES,
    LOCALE_ORDER,
    persistLocale,
    type Locale,
  } from './i18n/index.js'
  import BingoCard from './lib/BingoCard.svelte'
  import { describeError } from './lib/describeError.js'
  import DrawApp from './lib/DrawApp.svelte'
  import HostSheet from './lib/HostSheet.svelte'
  import {
    clampInt,
    DEFAULT_GUESTS,
    DEFAULT_SEED,
    DEFAULT_WIN_NUMBER,
    drawHash,
    MAX_GUESTS,
    MAX_SEED,
    readParams,
    RULESET_KEYS,
    rulesetOf,
  } from './lib/planParams.js'

  // The entry point comes out of the address bar so that a shared link shows
  // the same plan on the machine at the projector.
  const initial = readParams(location.hash)

  let locale = $state<Locale>(detectLocale())
  let view = $state(initial.view)
  let guests = $state(initial.params.guests)
  /** One-based, the way a person counts. The core works zero-based. */
  let winNumber = $state(initial.params.winNumber)
  let seed = $state(initial.params.seed)
  let rulesetKey = $state(initial.params.rulesetKey)
  let showBrand = $state(false)
  let previewCount = $state(8)

  const t = $derived(LOCALES[locale])
  const ruleset = $derived(rulesetOf(rulesetKey))
  const earliest = $derived(earliestWinNumber(ruleset))

  /**
   * What actually goes into the generator, and into the link to the draw.
   *
   * The input fields cannot be trusted on their own: a cleared number field
   * hands over `null`, and `max` does not stop anybody typing a larger number.
   * Both used to reach the generator — `null` produced a plan with no cards and
   * no error message, and a large guest count rendered that many grids into the
   * print view and froze the tab.
   */
  const cardCount = $derived(clampInt(guests, 1, MAX_GUESTS, DEFAULT_GUESTS))
  const winAt = $derived(
    clampInt(winNumber, 1, ruleset.poolSize, DEFAULT_WIN_NUMBER) - 1,
  )
  const seedValue = $derived(clampInt(seed, 0, MAX_SEED, DEFAULT_SEED))

  const params = $derived({
    guests: cardCount,
    winNumber: winAt + 1,
    seed: seedValue,
    rulesetKey,
  })

  const result = $derived.by(() => {
    try {
      const plan = generatePlan({
        ruleset,
        cardCount,
        winAt,
        seed: seedValue,
      })
      return { plan, error: null as string | null }
    } catch (error) {
      return { plan: null, error: describeError(error, t, ruleset) }
    }
  })

  const plan = $derived(result.plan)
  const positions = $derived(plan ? drawPositions(plan.drawOrder) : null)

  /**
   * Where the slider sits. Starts just short of the bingo, because that is the
   * interesting moment — every card waiting for the same number.
   */
  let drawn = $state(25)

  // Follow a new plan so the slider never points into nothing.
  $effect(() => {
    drawn = Math.min(winAt, ruleset.poolSize)
  })

  const bingoCount = $derived.by(() => {
    if (!plan || !positions) return 0
    return plan.cards.filter((c) => winIndexOf(c, ruleset, positions) < drawn).length
  })

  const lastDrawn = $derived(plan && drawn > 0 ? plan.drawOrder[drawn - 1]! : null)

  const winningCellsOf = (lineIdx: number) => lines(ruleset)[lineIdx] ?? []

  // Tab title and <html lang> have to follow the language: search engines and
  // bookmarks read both, and a static title in index.html would stay behind.
  $effect(() => {
    document.title = t.documentTitle
    document.documentElement.lang = locale
  })

  // The browser's back button should move between the views.
  onMount(() => {
    const sync = () => {
      const next = readParams(location.hash)
      view = next.view
      if (next.view === 'draw') {
        guests = next.params.guests
        winNumber = next.params.winNumber
        seed = next.params.seed
        rulesetKey = next.params.rulesetKey
      }
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  })

  function setLocale(next: Locale) {
    locale = next
    persistLocale(next)
  }

  function startDraw() {
    location.hash = drawHash(params)
    view = 'draw'
  }

  function leaveDraw() {
    history.pushState(null, '', location.pathname + location.search)
    view = 'generator'
  }

  function reroll() {
    seed = randomSeed()
  }
</script>

{#if view === 'draw'}
  <!--
    The key forces a rebuild as soon as the plan changes. Without it the draw
    keeps its counter: change the seed and restart, and the host would stand in
    the middle of a draw that no longer matches the fresh printout.
  -->
  {#key drawHash(params)}
    <DrawApp {params} {t} onExit={leaveDraw} />
  {/key}
{:else}
  <header class="hero no-print">
    <div class="wrap">
      <div class="topline">
        <p class="eyebrow">{t.brand}</p>
        <nav class="langs" aria-label={t.language.label}>
          {#each LOCALE_ORDER as code (code)}
            <button
              class="lang"
              class:active={locale === code}
              aria-current={locale === code ? 'true' : undefined}
              onclick={() => setLocale(code)}
              data-testid={`lang-${code}`}
            >
              {t.language[code]}
            </button>
          {/each}
        </nav>
      </div>

      <h1>{t.hero.title[0]}<br />{t.hero.title[1]}</h1>
      <p class="lead">{t.hero.lead}</p>
    </div>
  </header>

  <main class="wrap no-print">
    <hr class="rule" />

    <section>
      <h2>{t.generator.heading}</h2>

      <div class="controls">
        <div>
          <label for="guests">{t.generator.guests}</label>
          <input
            id="guests"
            type="number"
            min="1"
            max={MAX_GUESTS}
            bind:value={guests}
            data-testid="guests"
          />
        </div>
        <div>
          <label for="winNumber">{t.generator.winNumber}</label>
          <input
            id="winNumber"
            type="number"
            min={earliest}
            max={ruleset.poolSize}
            bind:value={winNumber}
            data-testid="win-number"
          />
        </div>
        <div>
          <label for="seed">{t.generator.seed}</label>
          <input id="seed" type="number" bind:value={seed} data-testid="seed" />
        </div>
        <div>
          <label for="ruleset">{t.generator.rules}</label>
          <select id="ruleset" bind:value={rulesetKey} data-testid="ruleset">
            {#each RULESET_KEYS as key (key)}
              <option value={key}>{t.rulesets[key]}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="actions">
        <button class="ghost" onclick={reroll} data-testid="reroll">
          {t.generator.reroll}
        </button>
        <button onclick={() => window.print()} disabled={!plan} data-testid="print">
          {t.generator.print}
        </button>
        <button class="ghost" onclick={startDraw} disabled={!plan} data-testid="start-draw">
          {t.generator.startDraw}
        </button>
        <label class="inline">
          <input type="checkbox" bind:checked={showBrand} data-testid="brand-toggle" />
          {t.generator.brandToggle(t.brand)}
        </label>
      </div>

      <p class="small muted hint">{t.generator.seedHint}</p>
      <p class="small muted hint">{t.generator.linkHint}</p>

      {#if result.error}
        <p class="error" data-testid="error">{result.error}</p>
      {/if}
    </section>

    {#if plan && positions}
      <hr class="rule" />

      <section>
        <h2>{t.sim.heading}</h2>
        <p class="lead">{t.sim.lead(winAt + 1)}</p>

        <div class="sim">
          <input
            type="range"
            min="0"
            max={plan.drawOrder.length}
            bind:value={drawn}
            aria-label={t.sim.sliderLabel}
            data-testid="draw-slider"
          />

          <div class="readout">
            <div>
              <span class="readout-label">{t.sim.drawn}</span>
              <strong data-testid="drawn-count">{drawn}</strong>
              <span class="muted">{t.sim.ofTotal(plan.drawOrder.length)}</span>
            </div>
            <div>
              <span class="readout-label">{t.sim.last}</span>
              <strong data-testid="last-drawn">{lastDrawn ? lastDrawn.label : '—'}</strong>
            </div>
            <div class:triumph={bingoCount > 0}>
              <span class="readout-label">{t.sim.bingo}</span>
              <strong data-testid="bingo-count">{bingoCount}</strong>
              <span class="muted">{t.sim.ofCards(cardCount)}</span>
            </div>
          </div>

          {#if bingoCount === 0 && drawn === winAt}
            <p class="cue-line" data-testid="cue-line">
              {t.sim.waiting(cardCount, plan.winningItem.label)}
            </p>
          {:else if bingoCount === cardCount}
            <p class="cue-line triumph-line" data-testid="triumph-line">
              {t.sim.triumph(cardCount, plan.winningItem.label)}
            </p>
          {/if}
        </div>

        <h3 class="preview-head">{t.sim.previewHeading}</h3>
        <p class="small muted">{t.sim.previewHint}</p>

        <div class="cards" data-testid="preview">
          {#each plan.cards.slice(0, previewCount) as card (card.id)}
            <BingoCard
              {card}
              {ruleset}
              {positions}
              {t}
              {drawn}
              reveal
              winningCells={winningCellsOf(card.winningLine)}
              brand={showBrand ? t.brand : null}
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
              {t.sim.showAll(plan.cards.length)}
            </button>
          </div>
        {/if}
      </section>

      <hr class="rule" />

      <section>
        <HostSheet {plan} guests={cardCount} {t} />
      </section>

      <hr class="rule" />

      <footer class="small muted foot">
        <p>{t.footer}</p>
      </footer>
    {/if}
  </main>

  <!-- The print version: blank cards to play on, then the host sheet. -->
  {#if plan && positions}
    <div class="print-only">
      <div class="sheet">
        {#each plan.cards as card (card.id)}
          <BingoCard
            {card}
            {ruleset}
            {positions}
            {t}
            drawn={0}
            brand={showBrand ? t.brand : null}
          />
        {/each}
      </div>
      <HostSheet {plan} guests={cardCount} {t} />
    </div>
  {/if}
{/if}

<style>
  .hero {
    padding: clamp(2rem, 7vw, 4rem) 0 0;
  }

  .topline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.6rem;
  }

  .topline .eyebrow {
    margin: 0;
  }

  .langs {
    display: flex;
    gap: 0.15rem;
    align-items: baseline;
  }

  button.lang {
    background: none;
    border: 0;
    padding: 0.1rem 0.45rem;
    color: var(--ink-faint);
    font-family: var(--sans);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: var(--radius);
  }

  button.lang:hover {
    color: var(--gold);
    background: var(--gold-wash);
    filter: none;
  }

  button.lang.active {
    color: var(--gold);
    text-decoration: underline;
    text-underline-offset: 4px;
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
    max-width: 42em;
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
