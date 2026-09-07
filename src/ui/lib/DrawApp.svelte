<script lang="ts">
  import { onMount } from 'svelte'
  import { generatePlan } from '../../core/generator.js'
  import type { Item, Plan } from '../../core/types.js'
  import type { Messages } from '../i18n/index.js'
  import { describeError } from './describeError.js'
  import { rulesetOf, type PlanParams } from './planParams.js'

  interface Props {
    params: PlanParams
    t: Messages
    onExit: () => void
  }

  let { params, t, onExit }: Props = $props()

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
      // Translated, not raw: the core's messages talk about draw orders and
      // attempt counts, and here they would stand on the projection.
      return { plan: null as Plan | null, error: describeError(error, t, ruleset) }
    }
  })

  const plan = $derived(result.plan)

  /** How many numbers have been revealed. */
  let drawn = $state(0)
  /** Is the drum roll running? */
  let rolling = $state(false)
  /** What rolls past during the roll — never the real number. */
  let rollingLabel = $state('')
  let dark = $state(true)
  let showBoard = $state(true)
  /** Goes false on teardown so a running roll does not carry on. */
  let alive = true
  /** Counts the rolls so an abandoned one cannot land after the fact. */
  let rollId = 0

  const current = $derived(plan && drawn > 0 ? plan.drawOrder[drawn - 1]! : null)
  const recent = $derived.by(() => {
    if (!plan) return [] as Item[]
    return plan.drawOrder.slice(Math.max(0, drawn - 6), Math.max(0, drawn - 1)).reverse()
  })
  const done = $derived(!!plan && drawn >= plan.drawOrder.length)

  /**
   * The moment everything leads up to — the next number sets off the room.
   * This is deliberately small and muted: the host sits at the machine and can
   * read it, while from ten metres on the projection it is illegible.
   */
  const cueNext = $derived(!!plan && drawn === params.winNumber - 1)
  const cueNow = $derived(!!plan && drawn === params.winNumber)

  const prefersReducedMotion = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  function next() {
    if (!plan || done) return

    // A click during the roll shortens it instead of being swallowed. Someone
    // clicking again out of impatience wants to see the number, not to lose
    // the click.
    if (rolling) {
      settle()
      return
    }

    if (prefersReducedMotion()) {
      drawn += 1
      return
    }

    // The drum roll: random numbers from the pool roll past and slow down
    // until the real one stands. That is what sells the randomness — and why
    // nobody questions the fixed order.
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
        // Ease out from 55 ms to 190 ms.
        step(55 + (elapsed / total) ** 2 * 135)
      }, delay)
    }
    step(0)
  }

  /** Ends the roll and reveals the real number. */
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
      // The browser may refuse fullscreen; the app stays usable either way.
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

  /** The board shows every number in the pool, drawn ones highlighted. */
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
      <button onclick={onExit}>{t.draw.exit}</button>
    </div>
  {:else if plan}
    <!-- The whole surface advances the draw: in a dimmed room the host should
         not have to hit anything. -->
    <button
      class="tap"
      onclick={next}
      disabled={done}
      aria-label={t.draw.nextLabel}
      data-testid="next"
    >
      <div class="numberbox">
        {#if rolling}
          <span class="number rolling" data-testid="current-number">{rollingLabel}</span>
        {:else if current}
          <span class="number" data-testid="current-number">{current.label}</span>
        {:else}
          <span class="prompt" data-testid="current-number">{t.draw.startPrompt}</span>
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
        <p class="prompt small-prompt">{t.draw.allDrawn}</p>
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
        {t.draw.progress(drawn, plan.drawOrder.length)}
      </span>

      <!-- The host cue, small and muted: readable at the machine, not on the
           projection. It must not give the guests anything away. -->
      {#if cueNext}
        <span class="cue" data-testid="cue-next">{t.draw.cueNext}</span>
      {:else if cueNow}
        <span class="cue strong" data-testid="cue-now">{t.draw.cueNow}</span>
      {/if}

      <span class="keys">
        <button class="link" onclick={back} disabled={rolling || drawn === 0} data-testid="back">
          {t.draw.back}
        </button>
        <button class="link" onclick={reset} disabled={rolling || drawn === 0} data-testid="reset">
          {t.draw.reset}
        </button>
        <button class="link" onclick={() => (showBoard = !showBoard)}>{t.draw.board}</button>
        <button class="link" onclick={() => (dark = !dark)} data-testid="toggle-dark">
          {t.draw.light}
        </button>
        <button class="link" onclick={toggleFullscreen}>{t.draw.fullscreen}</button>
        <button class="link" onclick={onExit} data-testid="exit">{t.draw.exit}</button>
      </span>
    </div>
  {/if}
</div>

<style>
  /*
   * Different requirements from the generator: this is projected into a room
   * that is often dimmed. A dark ground does not glare and lets the number
   * glow — a deliberate exception to the paper palette, toggleable for bright
   * rooms.
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

  /* The most recent numbers fade towards the back. */
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
