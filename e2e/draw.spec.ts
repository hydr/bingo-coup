import { expect, test, type Page } from '@playwright/test'

/**
 * End-to-end tests of the projector draw app.
 *
 * The one that matters most is the last: does the draw show the same order as
 * the printed host sheet? If not, the evening is lost — the cards would belong
 * to a draw that never happens.
 */

// Without animation there is no drum roll and a click reveals immediately.
// That keeps the runs fast and at the same time checks that the app honours
// `prefers-reduced-motion`.
test.use({ reducedMotion: 'reduce' })

const planUrl = (guests: number, winNumber: number, seed: number, ruleset = 'classic') =>
  `/?lang=en#draw?g=${guests}&w=${winNumber}&s=${seed}&r=${ruleset}`

/** Keeps drawing until the given count is reached. */
async function drawUntil(page: Page, target: number) {
  const current = Number((await page.getByTestId('progress').textContent())!.match(/\d+/)![0])
  for (let i = current + 1; i <= target; i++) {
    await page.getByTestId('next').click()
    await expect(page.getByTestId('progress')).toContainText(`Draw ${i} `)
  }
}

test('a link with a plan opens the draw directly', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))

  await expect(page.getByTestId('draw-app')).toBeVisible()
  await expect(page.getByTestId('current-number')).toHaveText('Tap to start')
  await expect(page.getByTestId('progress')).toContainText('Draw 0 of 75')
})

test('each click reveals exactly one number', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))
  await drawUntil(page, 5)

  await expect(page.getByTestId('progress')).toContainText('Draw 5 of 75')
  // Five numbers drawn, so five marks on the board.
  await expect(page.getByTestId('board').locator('[data-hit="true"]')).toHaveCount(5)
})

test('the host cue comes one draw early and then at the moment', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))

  await drawUntil(page, 6)
  await expect(page.getByTestId('cue-next')).toHaveCount(0)

  // One before the win: a warning for the host.
  await drawUntil(page, 7)
  await expect(page.getByTestId('cue-next')).toContainText('next number sets off everybody')

  // The moment itself.
  await drawUntil(page, 8)
  await expect(page.getByTestId('cue-now')).toContainText('everybody has bingo')

  // Then it goes away again — the game carries on, after all.
  await drawUntil(page, 9)
  await expect(page.getByTestId('cue-now')).toHaveCount(0)
  await expect(page.getByTestId('cue-next')).toHaveCount(0)
})

test('back removes one draw, restart clears everything', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))
  await drawUntil(page, 4)

  await page.getByTestId('back').click()
  await expect(page.getByTestId('progress')).toContainText('Draw 3 of 75')

  await page.getByTestId('reset').click()
  await expect(page.getByTestId('progress')).toContainText('Draw 0 of 75')
  await expect(page.getByTestId('current-number')).toHaveText('Tap to start')
})

test('a different plan starts from zero', async ({ page }) => {
  // Otherwise the host would stand in the middle of a draw that does not match
  // the cards they just printed.
  await page.goto(planUrl(40, 8, 12345))
  await drawUntil(page, 3)

  await page.evaluate(() => {
    location.hash = '#draw?g=40&w=8&s=999&r=classic'
  })

  await expect(page.getByTestId('progress')).toContainText('Draw 0 of 75')
  await expect(page.getByTestId('current-number')).toHaveText('Tap to start')
})

test('the keyboard drives the draw', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))

  await page.keyboard.press('Space')
  await expect(page.getByTestId('progress')).toContainText('Draw 1 of 75')

  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('progress')).toContainText('Draw 2 of 75')

  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('progress')).toContainText('Draw 1 of 75')
})

test('the way from the generator into the draw and back', async ({ page }) => {
  await page.goto('/?lang=en')
  await page.getByTestId('seed').fill('12345')
  await page.getByTestId('start-draw').click()

  await expect(page.getByTestId('draw-app')).toBeVisible()
  expect(page.url()).toContain('s=12345')

  await page.getByTestId('exit').click()
  await expect(page.getByTestId('draw-app')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the draw app follows the chosen language', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345).replace('lang=en', 'lang=de'))
  await expect(page.getByTestId('current-number')).toHaveText('Zum Starten tippen')
  await expect(page.getByTestId('progress')).toContainText('Ziehung 0 von 75')
})

test('the draw matches the host sheet', async ({ page }) => {
  const guests = 30
  const winNumber = 12
  const seed = 24680

  // First read what would be on the printout.
  await page.goto('/?lang=en')
  await page.getByTestId('guests').fill(String(guests))
  await page.getByTestId('win-number').fill(String(winNumber))
  await page.getByTestId('seed').fill(String(seed))

  const sheet = page.getByRole('main').getByTestId('host-sheet')
  await expect(sheet).toBeVisible()
  const expected = (await sheet.getByTestId('winning-item').textContent())!.trim()

  // Then play the draw through and compare.
  await page.goto(planUrl(guests, winNumber, seed))
  await drawUntil(page, winNumber)

  await expect(page.getByTestId('current-number')).toHaveText(expected)
  await expect(page.getByTestId('cue-now')).toBeVisible()
})
