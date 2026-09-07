import { expect, test, type Page } from '@playwright/test'

/**
 * End-to-end tests of the generator.
 *
 * The win logic itself is covered in src/core; what matters here is that the
 * interface keeps the same promise — above all the one everything rests on:
 * nobody has bingo until the second-to-last number, then everybody at once.
 *
 * Every test pins the language with `?lang=`. Without it they would depend on
 * the browser's locale, and a German machine and an English one would disagree
 * about which strings to expect.
 */

const AT = '/?lang=en'

/**
 * Screen and print views both live in the DOM with the same test ids — the
 * print view is a separate block. So always say which of the two is meant.
 */
const onScreen = (page: Page) => page.getByRole('main')
const inPrint = (page: Page) => page.locator('.print-only')

/** The slider is the heart of the preview, so it gets its own helper. */
async function setDrawn(page: Page, value: number) {
  await page.getByTestId('draw-slider').fill(String(value))
  await expect(page.getByTestId('drawn-count')).toHaveText(String(value))
}

async function generate(page: Page, guests: number, winNumber: number, seed: number) {
  await page.getByTestId('guests').fill(String(guests))
  await page.getByTestId('win-number').fill(String(winNumber))
  await page.getByTestId('seed').fill(String(seed))
  await expect(page.getByTestId('error')).toHaveCount(0)
  await expect(onScreen(page).getByTestId('host-sheet')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto(AT)
})

test('the page loads without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('everybody wins at once')
  expect(errors).toEqual([])

  // With no parameters in the address the page has to start on workable values
  // and show a finished plan — not an error message.
  await expect(page.getByTestId('error')).toHaveCount(0)
  await expect(page.getByTestId('guests')).toHaveValue('60')
  await expect(page.getByTestId('win-number')).toHaveValue('26')
  await expect(page.getByTestId('print')).toBeEnabled()
  await expect(page.getByTestId('start-draw')).toBeEnabled()
  await expect(onScreen(page).getByTestId('host-sheet')).toBeVisible()
})

test('nobody wins earlier, then everybody at once', async ({ page }) => {
  await generate(page, 60, 26, 20260907)

  // Across the whole draw before it: not a single bingo.
  for (const n of [0, 1, 10, 20, 24, 25]) {
    await setDrawn(page, n)
    await expect(page.getByTestId('bingo-count')).toHaveText('0')
  }

  // The 26th number sets off all 60 at the same time.
  await setDrawn(page, 26)
  await expect(page.getByTestId('bingo-count')).toHaveText('60')

  // And it stays that way.
  await setDrawn(page, 50)
  await expect(page.getByTestId('bingo-count')).toHaveText('60')
})

test('just before, everybody waits for the same number', async ({ page }) => {
  await generate(page, 40, 30, 4711)
  await setDrawn(page, 29)

  const winning = await onScreen(page).getByTestId('winning-item').textContent()
  expect(winning).toBeTruthy()

  await expect(page.getByTestId('cue-line')).toContainText('All 40 cards are now waiting')
  await expect(page.getByTestId('cue-line')).toContainText(winning!.trim())

  const cards = page.getByTestId('preview').getByTestId('card')
  await expect(cards).toHaveCount(8)

  await setDrawn(page, 30)
  await expect(page.getByTestId('triumph-line')).toContainText('have bingo')
})

test('the same seed returns the same cards, a new one different cards', async ({ page }) => {
  const firstCard = () => page.getByTestId('preview').getByTestId('card').first().innerText()

  await generate(page, 20, 26, 12345)
  const a = await firstCard()

  await generate(page, 20, 26, 99999)
  const b = await firstCard()
  expect(b).not.toBe(a)

  await generate(page, 20, 26, 12345)
  expect(await firstCard()).toBe(a)
})

test('the product name is off the cards by default', async ({ page }) => {
  // On the table the imprint would give the surprise away.
  await generate(page, 10, 26, 7)
  const card = page.getByTestId('preview').getByTestId('card').first()
  await expect(card).not.toContainText('Bingo Coup')

  await page.getByTestId('brand-toggle').check()
  await expect(card).toContainText('Bingo Coup')
})

test('the rulesets can be switched', async ({ page }) => {
  await generate(page, 15, 26, 3)
  await expect(page.getByTestId('preview').getByTestId('card').first()).toContainText('FREE')

  // The open game: 5x5 without a free centre.
  await page.getByTestId('ruleset').selectOption('open80')
  await expect(page.getByTestId('error')).toHaveCount(0)
  const open = page.getByTestId('preview').getByTestId('card').first()
  await expect(open).not.toContainText('FREE')
  await expect(open.getByTestId('cell')).toHaveCount(25)

  // The kids grid: 3x3, so small guests make it to the end.
  await page.getByTestId('win-number').fill('9')
  await page.getByTestId('ruleset').selectOption('kids')
  await expect(page.getByTestId('error')).toHaveCount(0)
  await expect(
    page.getByTestId('preview').getByTestId('card').first().getByTestId('cell'),
  ).toHaveCount(9)
})

test('draw 4 is the earliest possible win', async ({ page }) => {
  // A line through the free centre needs only four real squares: three drawn
  // before plus the one that sets it off. So draw 4 still works.
  await page.getByTestId('guests').fill('10')
  await page.getByTestId('win-number').fill('4')
  await expect(page.getByTestId('error')).toHaveCount(0)
  await expect(onScreen(page).getByTestId('host-sheet')).toBeVisible()
})

test('an impossible win time is reported in plain language', async ({ page }) => {
  // On draw 2 only two numbers are available for four squares. The message
  // should say what would work instead of talking about draw orders.
  await page.getByTestId('guests').fill('10')
  await page.getByTestId('win-number').fill('2')
  await expect(page.getByTestId('error')).toBeVisible()
  await expect(page.getByTestId('error')).toContainText('at least 4 numbers')
})

test('the print version holds every card and the host sheet', async ({ page }) => {
  await generate(page, 12, 26, 555)
  await page.emulateMedia({ media: 'print' })

  // In print the interface disappears and the cards remain.
  await expect(page.getByTestId('draw-slider')).toBeHidden()

  const printed = inPrint(page).getByTestId('card')
  await expect(printed).toHaveCount(12)
  await expect(printed.first()).toBeVisible()

  // Printed cards are blank — otherwise nobody could play. The one exception
  // is the free centre: it counts as hit from the start, so exactly one square
  // per card.
  const marked = inPrint(page).locator('[data-testid="cell"][data-hit="true"]')
  await expect(marked).toHaveCount(12)
  for (const cell of await marked.all()) {
    await expect(cell).toHaveText('FREE')
  }

  await expect(inPrint(page).getByTestId('host-sheet')).toBeVisible()
})

test('the language can be switched, and the choice survives a reload', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('everybody wins at once')

  await page.getByTestId('lang-de').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'alle gleichzeitig gewinnen',
  )
  await expect(page.getByTestId('print')).toContainText('Karten und Moderatorenblatt')
  await expect(onScreen(page).getByTestId('host-sheet')).toContainText('Moderatorenblatt')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')

  // The choice goes into the address, so a reload keeps it.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'alle gleichzeitig gewinnen',
  )

  await page.getByTestId('lang-en').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('everybody wins at once')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('the tab title follows the language too', async ({ page }) => {
  // It is what search engines and bookmarks read, so a static title in
  // index.html would be wrong in one of the two languages.
  await expect(page).toHaveTitle(/bingo where everybody wins at once/)

  await page.getByTestId('lang-de').click()
  await expect(page).toHaveTitle(/Bingo, bei dem alle gleichzeitig gewinnen/)
})

test('error messages follow the language', async ({ page }) => {
  await page.getByTestId('win-number').fill('2')
  await expect(page.getByTestId('error')).toContainText('at least 4 numbers')

  await page.getByTestId('lang-de').click()
  await expect(page.getByTestId('error')).toContainText('mindestens 4 Zahlen')
})
