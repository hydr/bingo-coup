<script lang="ts">
  import { onMount } from 'svelte'
  import { generatePlan } from '../../core/generator.js'
  import type { Item, Plan } from '../../core/types.js'
  import { rulesetOf, type PlanParams } from './planParams.js'

  interface Props {
    params: PlanParams
    onExit: () => void
  }

  let { params, onExit }: Props = $props()

  const ruleset = $derived(rulesetOf(params.rulesetKey))

  const result = $derived.by(() => {
    try {
      const plan = generatePlan({
        ruleset,
        cardCount: params.guests,
        winAt: params.winNumber - 1,
        seed: params.seed,
      })
      return { plan, error: null as string | null }
    } catch (error) {
      return { plan: null as Plan | null, error: (error as Error).message }
    }
  })

  const plan = $derived(result.plan)

  /** Wie viele Zahlen bereits aufgedeckt sind. */
  let drawn = $state(0)
  /** Läuft der Trommelwirbel? Solange blockiert die Weiterschaltung. */
  let rolling = $state(false)
  /** Was während des Wirbels durchrollt — nie die echte Zahl. */
  let rollingLabel = $state('')
  let dark = $state(true)
  let showBoard = $state(true)
  /** Wird beim Abbau falsch, damit ein laufender Wirbel nicht weiterlaeuft. */
  let alive = true
  /** Zaehlt die Wirbel mit, damit ein abgebrochener nicht nachtraeglich zuschlaegt. */
  let rollId = 0

  const current = $derived(plan && drawn > 0 ? plan.drawOrder[drawn - 1]! : null)
  const recent = $derived.by(() => {
    if (!plan) return [] as Item[]
    return plan.drawOrder.slice(Math.max(0, drawn - 6), Math.max(0, drawn - 1)).reverse()
  })
  const done = $derived(!!plan && drawn >= plan.drawOrder.length)

  /**
   * Der Moment, auf den alles hinausläuft — die nächste Zahl löst den Saal aus.
   * Diese Anzeige ist bewusst klein und gedeckt: Der Moderator sitzt am Rechner
   * und liest sie, aus zehn Metern auf der Projektion ist sie unlesbar.
   */
  const cueNext = $derived(!!plan && drawn === params.winNumber - 1)
  const cueNow = $derived(!!plan && drawn === params.winNumber)

  const prefersReducedMotion = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  function next() {
    if (!plan || done) return

    // Ein Klick waehrend des Wirbels kuerzt ihn ab, statt ins Leere zu gehen.
    // Wer nachklickt, weil es ihm zu langsam geht, will die Zahl sehen — nicht
    // einen verschluckten Klick.
    if (rolling) {
      settle()
      return
    }

    if (prefersReducedMotion()) {
      drawn += 1
      return
    }

    // Trommelwirbel: Zufallszahlen aus dem Pool rollen durch und werden
    // langsamer, bis die echte Zahl steht. Das verkauft den Zufall — und ist
    // der Grund, warum niemand die feste Reihenfolge hinterfragt.
    rolling = true
    const mine = ++rollId
    const pool = plan.drawOrder
    let elapsed = 0
    const total = 1100

    const step = (delay: number) => {
      window.setTimeout(() => {
        if (!alive || mine !== rollId) return
        elapsed += delay
        if (elapsed >= total) {
          settle()
          return
        }
        rollingLabel = pool[Math.floor(Math.random() * pool.length)]!.label
        // Von 55 ms auf 190 ms auslaufen lassen.
        step(55 + (elapsed / total) ** 2 * 135)
      }, delay)
    }
    step(0)
  }

  /** Beendet den Wirbel und deckt die echte Zahl auf. */
  function settle() {
    rollId += 1
    rolling = false
    rollingLabel = ''
    drawn += 1
  }

  function back() {
    if (rolling || drawn === 0) return
    drawn -= 1
  }

  function reset() {
    if (rolling) return
    drawn = 0
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Vollbild kann der Browser verweigern; die App bleibt benutzbar.
    }
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault()
      next()
    } else if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      event.preventDefault()
      back()
    } else if (event.key === 'f' || event.key === 'F') {
      void toggleFullscreen()
    } else if (event.key === 'Escape') {
      onExit()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
    return () => {
      alive = false
      window.removeEventListener('keydown', onKey)
    }
  })

  /** Die Tafel zeigt alle Zahlen des Pools, gezogene hervorgehoben. */
  const board = $derived.by(() => {
    if (!plan) return [] as { item: Item; hit: boolean }[]
    const seen = new Set(plan.drawOrder.slice(0, drawn).map((i) => i.id))
    return [...plan.drawOrder]
      .sort((a, b) => a.id - b.id)
      .map((item) => ({ item, hit: seen.has(item.id) }))
  })
</script>

<div class="stage" class:dark data-testid="draw-app">
  {#if result.error}
    <div class="fail">
      <p>{result.error}</p>
      <button onclick={onExit}>Zurück</button>
    </div>
  {:else if plan}
    <!-- Die ganze Fläche schaltet weiter: Der Moderator muss im abgedunkelten
         Saal nichts treffen müssen. -->
    <button
      class="tap"
      onclick={next}
      disabled={done}
      aria-label="Nächste Zahl ziehen"
      data-testid="next"
    >
      <div class="numberbox">
        {#if rolling}
          <span class="number rolling" data-testid="current-number">{rollingLabel}</span>
        {:else if current}
          <span class="number" data-testid="current-number">{current.label}</span>
        {:else}
          <span class="prompt" data-testid="current-number">Zum Starten tippen</span>
        {/if}
      </div>

      {#if recent.length > 0}
        <div class="recent" data-testid="recent">
          {#each recent as item (item.id)}
            <span>{item.label}</span>
          {/each}
        </div>
      {/if}

      {#if done}
        <p class="prompt small-prompt">Alle Zahlen gezogen</p>
      {/if}
    </button>

    {#if showBoard}
      <div class="board" data-testid="board">
        {#each board as entry (entry.item.id)}
          <span class:hit={entry.hit} data-hit={entry.hit ? 'true' : 'false'}>
            {entry.item.label}
          </span>
        {/each}
      </div>
    {/if}

    <div class="bar">
      <span class="count" data-testid="progress">
        Ziehung {drawn} von {plan.drawOrder.length}
      </span>

      <!-- Regiehinweis, klein und gedeckt: lesbar am Rechner, nicht auf der
           Projektion. Er darf den Gästen nichts verraten. -->
      {#if cueNext}
        <span class="cue" data-testid="cue-next">nächste Zahl löst alle aus</span>
      {:else if cueNow}
        <span class="cue strong" data-testid="cue-now">jetzt: alle haben Bingo</span>
      {/if}

      <span class="keys">
        <button class="link" onclick={back} disabled={rolling || drawn === 0}>zurück</button>
        <button class="link" onclick={reset} disabled={rolling || drawn === 0} data-testid="reset">
          neu
        </button>
        <button class="link" onclick={() => (showBoard = !showBoard)}>tafel</button>
        <button class="link" onclick={() => (dark = !dark)} data-testid="toggle-dark">licht</button>
        <button class="link" onclick={toggleFullscreen}>vollbild</button>
        <button class="link" onclick={onExit} data-testid="exit">zurück zum Generator</button>
      </span>
    </div>
  {/if}
</div>

<style>
  /*
   * Andere Anforderungen als der Generator: Das läuft projiziert in einem oft
   * abgedunkelten Saal. Dunkler Grund blendet nicht und lässt die Zahl leuchten
   * — deshalb hier bewusst eine Ausnahme vom Papierton, umschaltbar für helle
   * Räume.
   */
  .stage {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--paper);
    color: var(--ink);
    overflow: hidden;
  }

  .stage.dark {
    background: #17120e;
    color: #f3e7d2;
  }

  .tap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(1rem, 3vh, 2.5rem);
    background: none;
    border: 0;
    border-radius: 0;
    padding: 2rem;
    color: inherit;
    cursor: pointer;
    min-height: 0;
  }

  .tap:disabled {
    cursor: default;
    opacity: 1;
  }

  .numberbox {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: clamp(6rem, 34vh, 22rem);
  }

  .number {
    font-family: var(--serif);
    font-size: clamp(6rem, 30vh, 22rem);
    line-height: 0.85;
    font-variant-numeric: tabular-nums;
    color: var(--gold);
    letter-spacing: -0.03em;
  }

  .stage.dark .number {
    color: #e8c07d;
    text-shadow: 0 0 60px rgb(232 192 125 / 22%);
  }

  .number.rolling {
    opacity: 0.5;
    filter: blur(1.5px);
  }

  .prompt {
    font-family: var(--sans);
    font-size: clamp(1rem, 2.5vh, 1.4rem);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.45;
  }

  .small-prompt {
    margin: 0;
  }

  .recent {
    display: flex;
    gap: clamp(0.8rem, 2vw, 2rem);
    font-family: var(--serif);
    font-size: clamp(1.2rem, 4vh, 2.6rem);
    font-variant-numeric: tabular-nums;
    opacity: 0.35;
  }

  /* Die zuletzt gezogenen Zahlen verblassen nach hinten. */
  .recent span:nth-child(2) {
    opacity: 0.75;
  }
  .recent span:nth-child(3) {
    opacity: 0.55;
  }
  .recent span:nth-child(4) {
    opacity: 0.4;
  }
  .recent span:nth-child(5) {
    opacity: 0.25;
  }

  .board {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem 0.45rem;
    padding: 0 clamp(1rem, 4vw, 3rem) 0.8rem;
    font-family: var(--sans);
    font-size: clamp(0.6rem, 1.5vh, 0.9rem);
    font-variant-numeric: tabular-nums;
    flex: 0 0 auto;
    max-height: 22vh;
    overflow: hidden;
  }

  .board span {
    opacity: 0.22;
    min-width: 1.6em;
    text-align: center;
  }

  .board span.hit {
    opacity: 1;
    color: var(--gold);
    font-weight: 700;
  }

  .stage.dark .board span.hit {
    color: #e8c07d;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    flex-wrap: wrap;
    padding: 0.6rem clamp(1rem, 4vw, 2rem);
    border-top: 1px solid rgb(255 255 255 / 8%);
    font-family: var(--sans);
    font-size: 0.72rem;
    opacity: 0.55;
  }

  .stage:not(.dark) .bar {
    border-top-color: var(--line);
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .cue {
    color: var(--gold);
    letter-spacing: 0.04em;
  }

  .stage.dark .cue {
    color: #e8c07d;
  }

  .cue.strong {
    font-weight: 700;
  }

  .keys {
    margin-left: auto;
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
  }

  button.link {
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    font-family: var(--sans);
    font-size: 0.72rem;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  button.link:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .fail {
    margin: auto;
    max-width: 32em;
    padding: 2rem;
    text-align: center;
  }

  @media print {
    .stage {
      display: none;
    }
  }
</style>
