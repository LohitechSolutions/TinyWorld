import { expect, test } from '@playwright/test'
import { enterWorld, inspect, interact, playSequence, seedProgress, walkTo } from './helpers'

test('settings persist after reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('heading', { name: 'Settings' }).waitFor()
  await page.locator('select').selectOption('low')
  await page.getByRole('button', { name: 'Done' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('select')).toHaveValue('low')
})

test('Verdant Isle can be completed with keyboard input', async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await enterWorld(page, /Unlocked Verdant Isle/)
  await page.waitForTimeout(800)
  const sample = await inspect(page)
  await page.waitForTimeout(700)
  const measured = await inspect(page)
  await page.screenshot({ path: 'e2e/artifacts/perf-verdant.png' })
  expect(sample.worldId).toBe('verdant-isle')
  expect(measured.fps).toBeGreaterThan(0)
  console.log(`Verdant FPS ${measured.fps.toFixed(1)} quality=${measured.quality}`)

  await walkTo(page, 4.2, 10.2)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('c-meadow'), null, { timeout: 8000 })

  await walkTo(page, -9.4, 1.6)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('c-falls'), null, { timeout: 8000 })

  await walkTo(page, 14.2, -0.6)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('c-ruins'), null, { timeout: 8000 })

  await walkTo(page, 12.2, 2.4)
  await interact(page)
  await page.waitForFunction(() => window.__TW?.inspect().puzzles.includes('switch-bridge'), null, { timeout: 8000 })

  await walkTo(page, 0, -20.2, 36000)
  await playSequence(page, [
    { x: 2.1, z: -26.4 },
    { x: -2.1, z: -26.4 },
    { x: 0, z: -28.2 },
  ], 'sequence-plaza')
  await page.waitForFunction(() => window.__TW?.inspect().portalReady === true, null, { timeout: 8000 })

  await walkTo(page, 0, -27.4)
  await interact(page)
  await expect(page.getByRole('heading', { name: /Verdant Isle restored/i })).toBeVisible({ timeout: 8000 })
  await page.screenshot({ path: 'e2e/artifacts/complete-verdant.png' })
  await page.getByRole('button', { name: 'World selection' }).click()
  await expect(page.getByRole('heading', { name: 'Choose a World' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Restored Verdant Isle/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Unlocked Crystal Caverns/ })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: /Restored Verdant Isle/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Unlocked Crystal Caverns/ })).toBeVisible()
})

test('Crystal Caverns can be completed with keyboard input', async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedProgress(page, 'caverns')
  await enterWorld(page, /Unlocked Crystal Caverns/)
  await page.waitForTimeout(800)
  expect((await inspect(page)).worldId).toBe('crystal-caverns')
  await page.screenshot({ path: 'e2e/artifacts/play-caverns.png' })

  await walkTo(page, -5.4, 7.2)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('cc-1'), null, { timeout: 8000 })
  await walkTo(page, 7.1, 3.4)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('cc-2'), null, { timeout: 8000 })
  await walkTo(page, -6.8, 1.4)
  await interact(page)
  await page.waitForFunction(() => window.__TW?.inspect().puzzles.includes('switch-gate'), null, { timeout: 8000 })
  await walkTo(page, -4.2, -1.2)
  await walkTo(page, 4.2, -1.2)
  await page.waitForFunction(() => window.__TW?.inspect().puzzles.includes('plates-span'), null, { timeout: 8000 })
  await walkTo(page, -2.2, -4.5)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('cc-3'), null, { timeout: 8000 })
  await playSequence(page, [
    { x: 0, z: -11.7 },
    { x: -1.8, z: -10.4 },
    { x: 1.8, z: -10.4 },
  ], 'sequence-heart')
  await page.waitForFunction(() => window.__TW?.inspect().portalReady === true, null, { timeout: 8000 })
  await walkTo(page, 0, -12.4)
  await interact(page)
  await expect(page.getByRole('heading', { name: /Crystal Caverns restored/i })).toBeVisible({ timeout: 8000 })
  await page.screenshot({ path: 'e2e/artifacts/complete-caverns.png' })
  await page.getByRole('button', { name: 'World selection' }).click()
  await expect(page.getByRole('button', { name: /Restored Crystal Caverns/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Unlocked Sky Temple/ })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: /Restored Crystal Caverns/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Unlocked Sky Temple/ })).toBeVisible()
})

test('Sky Temple can be completed with keyboard input', async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedProgress(page, 'temple')
  await enterWorld(page, /Unlocked Sky Temple/)
  await page.waitForTimeout(800)
  expect((await inspect(page)).worldId).toBe('sky-temple')
  await page.screenshot({ path: 'e2e/artifacts/play-temple.png' })

  await walkTo(page, -3.4, 6.4)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('st-1'), null, { timeout: 8000 })
  await walkTo(page, 2.6, 6.8)
  await interact(page)
  await page.waitForFunction(() => window.__TW?.inspect().puzzles.includes('switch-stair'), null, { timeout: 8000 })
  await walkTo(page, 9.6, 1.2, 40000)
  await walkTo(page, 12.2, 1.2, 20000)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('st-2'), null, { timeout: 10000 })
  await walkTo(page, -9.6, 1.2, 40000)
  await walkTo(page, -12.2, 1.2, 20000)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('st-3'), null, { timeout: 10000 })
  await page.waitForFunction(() => window.__TW?.inspect().puzzles.includes('plates-wings'), null, { timeout: 8000 })
  await playSequence(page, [
    { x: -1.6, z: -2.8 },
    { x: 0, z: -4.4 },
    { x: 1.6, z: -2.8 },
  ], 'sequence-sanctum')
  await page.waitForFunction(() => window.__TW?.inspect().portalReady === true, null, { timeout: 8000 })
  await walkTo(page, 0, -4.8)
  await interact(page)
  await expect(page.getByRole('heading', { name: /The dimensions remember|Sky Temple restored/i })).toBeVisible({ timeout: 8000 })
  await page.screenshot({ path: 'e2e/artifacts/complete-temple.png' })
  await page.getByRole('button', { name: 'World selection' }).click()
  await expect(page.getByRole('button', { name: /Restored Sky Temple/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Restored Verdant Isle/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Restored Crystal Caverns/ })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: /Restored Sky Temple/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Restored Crystal Caverns/ })).toBeVisible()
})
