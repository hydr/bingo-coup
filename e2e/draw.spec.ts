import { expect, test, type Page } from '@playwright/test'

/**
 * E2E-Tests der Ziehungsapp für den Beamer.
 *
 * Der wichtigste Test hier ist der letzte: Zeigt die Ziehung dieselbe
 * Reihenfolge wie das gedruckte Moderatorenblatt? Wenn nicht, ist der ganze
 * Abend hin — die Karten passen dann zu einer Ziehung, die nie stattfindet.
 */

// Ohne Animation läuft der Trommelwirbel nicht, und ein Klick deckt sofort auf.
// Das macht die Durchläufe schnell und prüft gleichzeitig, dass die App
// `prefers-reduced-motion` respektiert.
test.use({ reducedMotion: 'reduce' })

const planUrl = (guests: number, winNumber: number, seed: number, ruleset = 'classic') =>
  `/#draw?g=${guests}&w=${winNumber}&s=${seed}&r=${ruleset}`

/** Zieht weiter, bis der angegebene Stand erreicht ist. */
async function drawUntil(page: Page, target: number) {
  const current = Number((await page.getByTestId('progress').textContent())!.match(/\d+/)![0])
  for (let i = current + 1; i <= target; i++) {
    await page.getByTestId('next').click()
    await expect(page.getByTestId('progress')).toContainText(`Ziehung ${i} `)
  }
}

test('ein Link mit Plan öffnet direkt die Ziehung', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))

  await expect(page.getByTestId('draw-app')).toBeVisible()
  await expect(page.getByTestId('current-number')).toHaveText('Zum Starten tippen')
  await expect(page.getByTestId('progress')).toContainText('Ziehung 0 von 75')
})

test('jeder Klick deckt genau eine Zahl auf', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))
  await drawUntil(page, 5)

  await expect(page.getByTestId('progress')).toContainText('Ziehung 5 von 75')
  // Fünf gezogene Zahlen, also fünf Markierungen auf der Tafel.
  await expect(page.getByTestId('board').locator('[data-hit="true"]')).toHaveCount(5)
})

test('der Regiehinweis kommt eine Ziehung vorher und dann zum Moment', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))

  await drawUntil(page, 6)
  await expect(page.getByTestId('cue-next')).toHaveCount(0)

  // Eine vor dem Gewinn: Vorwarnung für den Moderator.
  await drawUntil(page, 7)
  await expect(page.getByTestId('cue-next')).toContainText('nächste Zahl löst alle aus')

  // Der Moment selbst.
  await drawUntil(page, 8)
  await expect(page.getByTestId('cue-now')).toContainText('alle haben Bingo')

  // Danach verschwindet er wieder — das Spiel läuft ja weiter.
  await drawUntil(page, 9)
  await expect(page.getByTestId('cue-now')).toHaveCount(0)
  await expect(page.getByTestId('cue-next')).toHaveCount(0)
})

test('zurück nimmt eine Ziehung heraus, neu setzt alles zurück', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))
  await drawUntil(page, 4)

  await page.getByRole('button', { name: 'zurück', exact: true }).click()
  await expect(page.getByTestId('progress')).toContainText('Ziehung 3 von 75')

  await page.getByTestId('reset').click()
  await expect(page.getByTestId('progress')).toContainText('Ziehung 0 von 75')
  await expect(page.getByTestId('current-number')).toHaveText('Zum Starten tippen')
})

test('ein anderer Plan beginnt bei null', async ({ page }) => {
  // Sonst stünde der Gastgeber mitten in einer Ziehung, die zu seinen frisch
  // gedruckten Karten nicht passt.
  await page.goto(planUrl(40, 8, 12345))
  await drawUntil(page, 3)

  await page.evaluate(() => {
    location.hash = '#draw?g=40&w=8&s=999&r=classic'
  })

  await expect(page.getByTestId('progress')).toContainText('Ziehung 0 von 75')
  await expect(page.getByTestId('current-number')).toHaveText('Zum Starten tippen')
})

test('die Tastatur steuert die Ziehung', async ({ page }) => {
  await page.goto(planUrl(40, 8, 12345))

  await page.keyboard.press('Space')
  await expect(page.getByTestId('progress')).toContainText('Ziehung 1 von 75')

  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('progress')).toContainText('Ziehung 2 von 75')

  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('progress')).toContainText('Ziehung 1 von 75')
})

test('der Weg vom Generator in die Ziehung und zurück', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('seed').fill('12345')
  await page.getByTestId('start-draw').click()

  await expect(page.getByTestId('draw-app')).toBeVisible()
  expect(page.url()).toContain('s=12345')

  await page.getByTestId('exit').click()
  await expect(page.getByTestId('draw-app')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('die Ziehung stimmt mit dem Moderatorenblatt überein', async ({ page }) => {
  const guests = 30
  const winNumber = 12
  const seed = 24680

  // Erst lesen, was auf dem Ausdruck stehen würde.
  await page.goto('/')
  await page.getByTestId('guests').fill(String(guests))
  await page.getByTestId('win-number').fill(String(winNumber))
  await page.getByTestId('seed').fill(String(seed))

  const sheet = page.getByRole('main').getByTestId('host-sheet')
  await expect(sheet).toBeVisible()
  const expected = (await sheet.getByTestId('winning-item').textContent())!.trim()

  // Dann die Ziehung durchspielen und vergleichen.
  await page.goto(planUrl(guests, winNumber, seed))
  await drawUntil(page, winNumber)

  await expect(page.getByTestId('current-number')).toHaveText(expected)
  await expect(page.getByTestId('cue-now')).toBeVisible()
})
