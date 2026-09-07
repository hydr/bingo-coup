import { expect, test, type Page } from '@playwright/test'

/**
 * E2E-Tests der Oberfläche.
 *
 * Die Gewinnlogik selbst ist in src/core getestet; hier geht es darum, dass die
 * Oberfläche dieselbe Zusage einhält — vor allem die eine, auf die alles
 * hinausläuft: Bis zur vorletzten Zahl hat niemand Bingo, dann alle auf einmal.
 */

/**
 * Bildschirm- und Druckfassung tragen dieselben Testmarken — die Druckansicht
 * steht als eigener Block im DOM. Deshalb wird hier immer explizit gesagt,
 * welche der beiden gemeint ist.
 */
const onScreen = (page: Page) => page.getByRole('main')
const inPrint = (page: Page) => page.locator('.print-only')

/** Der Schieberegler ist der Kern der Vorschau, deshalb eine eigene Hilfe. */
async function setDrawn(page: Page, value: number) {
  const slider = page.getByTestId('draw-slider')
  await slider.fill(String(value))
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
  await page.goto('/')
})

test('die Seite lädt ohne Konsolenfehler', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('alle gleichzeitig gewinnen')
  expect(errors).toEqual([])
})

test('niemand gewinnt vorher, dann alle gleichzeitig', async ({ page }) => {
  await generate(page, 60, 26, 20260907)

  // Über die ganze Ziehung davor: kein einziges Bingo.
  for (const n of [0, 1, 10, 20, 24, 25]) {
    await setDrawn(page, n)
    await expect(page.getByTestId('bingo-count')).toHaveText('0')
  }

  // Die 26. Zahl löst alle 60 auf einmal aus.
  await setDrawn(page, 26)
  await expect(page.getByTestId('bingo-count')).toHaveText('60')

  // Und es bleibt dabei.
  await setDrawn(page, 50)
  await expect(page.getByTestId('bingo-count')).toHaveText('60')
})

test('kurz vorher warten alle auf dieselbe Zahl', async ({ page }) => {
  await generate(page, 40, 30, 4711)
  await setDrawn(page, 29)

  const winning = await onScreen(page).getByTestId('winning-item').textContent()
  expect(winning).toBeTruthy()

  await expect(page.getByTestId('cue-line')).toContainText('Alle 40 Karten warten')
  await expect(page.getByTestId('cue-line')).toContainText(winning!.trim())

  // Auf jeder Vorschaukarte fehlt genau ein Feld der Gewinnlinie.
  const cards = page.getByTestId('preview').getByTestId('card')
  await expect(cards).toHaveCount(8)

  await setDrawn(page, 30)
  await expect(page.getByTestId('triumph-line')).toContainText('haben Bingo')
})

test('derselbe Seed liefert dieselben Karten, ein neuer andere', async ({ page }) => {
  const firstCard = () => page.getByTestId('preview').getByTestId('card').first().innerText()

  await generate(page, 20, 26, 12345)
  const a = await firstCard()

  await generate(page, 20, 26, 99999)
  const b = await firstCard()
  expect(b).not.toBe(a)

  await generate(page, 20, 26, 12345)
  expect(await firstCard()).toBe(a)
})

test('der Produktname steht standardmäßig nicht auf den Karten', async ({ page }) => {
  // Auf dem Tisch würde der Aufdruck die Überraschung verraten.
  await generate(page, 10, 26, 7)
  const card = page.getByTestId('preview').getByTestId('card').first()
  await expect(card).not.toContainText('Bingo Coup')

  await page.getByTestId('brand-toggle').check()
  await expect(card).toContainText('Bingo Coup')
})

test('die Regelsätze lassen sich wechseln', async ({ page }) => {
  await generate(page, 15, 26, 3)
  await expect(page.getByTestId('preview').getByTestId('card').first()).toContainText('FREI')

  // Offenes Spiel: 5x5 ohne freies Mittelfeld.
  await page.getByTestId('ruleset').selectOption('open80')
  await expect(page.getByTestId('error')).toHaveCount(0)
  const open = page.getByTestId('preview').getByTestId('card').first()
  await expect(open).not.toContainText('FREI')
  await expect(open.getByTestId('cell')).toHaveCount(25)

  // Kinderfeld: 3x3, damit auch kleine Gäste durchhalten.
  await page.getByTestId('win-number').fill('9')
  await page.getByTestId('ruleset').selectOption('kids')
  await expect(page.getByTestId('error')).toHaveCount(0)
  await expect(page.getByTestId('preview').getByTestId('card').first().getByTestId('cell')).toHaveCount(9)
})

test('der früheste mögliche Gewinn liegt bei Ziehung 4', async ({ page }) => {
  // Eine Linie durch das freie Mittelfeld braucht nur vier echte Felder: drei
  // vorher gezogene plus das auslösende. Ziehung 4 geht also noch.
  await page.getByTestId('guests').fill('10')
  await page.getByTestId('win-number').fill('4')
  await expect(page.getByTestId('error')).toHaveCount(0)
  await expect(onScreen(page).getByTestId('host-sheet')).toBeVisible()
})

test('ein unmöglicher Gewinnzeitpunkt wird verständlich gemeldet', async ({ page }) => {
  // Bei Ziehung 2 stehen nur zwei Zahlen für vier Felder bereit.
  await page.getByTestId('guests').fill('10')
  await page.getByTestId('win-number').fill('2')
  await expect(page.getByTestId('error')).toBeVisible()
  await expect(page.getByTestId('error')).toContainText('Ziehungsreihenfolge')
})

test('die Druckfassung enthält alle Karten und das Moderatorenblatt', async ({ page }) => {
  await generate(page, 12, 26, 555)
  await page.emulateMedia({ media: 'print' })

  // Im Druck verschwindet die Oberfläche, die Karten bleiben.
  await expect(page.getByTestId('draw-slider')).toBeHidden()

  const printed = inPrint(page).getByTestId('card')
  await expect(printed).toHaveCount(12)
  await expect(printed.first()).toBeVisible()

  // Gedruckte Karten sind leer — sonst könnte niemand mitspielen. Einzige
  // Ausnahme ist das freie Mittelfeld: Das gilt von Anfang an als getroffen,
  // je Karte also genau ein Feld.
  const marked = inPrint(page).locator('[data-testid="cell"][data-hit="true"]')
  await expect(marked).toHaveCount(12)
  for (const cell of await marked.all()) {
    await expect(cell).toHaveText('FREI')
  }

  await expect(inPrint(page).getByTestId('host-sheet')).toBeVisible()
})
