import { expect, test } from '@playwright/test'
import { enterWorld, inspect, seedProgress, walkTo } from './helpers'

test('Verdant waterfall cave secret can be reached and saved', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await enterWorld(page, /Unlocked Verdant Isle/)
  await walkTo(page, 6.8, 8.6)
  await page.waitForFunction(() => window.__TW?.inspect().puzzles.includes('plate-cave'), null, { timeout: 8000 })
  await walkTo(page, -13.2, -1.6, 36000)
  await walkTo(page, -14.6, -2.1)
  await page.waitForFunction(() => window.__TW?.inspect().crystals.includes('c-cave'), null, { timeout: 8000 })
  const after = await inspect(page)
  expect(after.secrets).toContain('c-cave')
  await page.screenshot({ path: 'e2e/artifacts/secret-cave.png' })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Main menu' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.locator('canvas').waitFor({ timeout: 15000 })
  const reloaded = await inspect(page)
  expect(reloaded.secrets).toContain('c-cave')
  expect(reloaded.puzzles).toContain('plate-cave')
})

test('Sky Temple opening view frames the sanctum', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedProgress(page, 'temple')
  await enterWorld(page, /Unlocked Sky Temple/)
  await page.waitForTimeout(900)
  const state = await inspect(page)
  expect(state.worldId).toBe('sky-temple')
  expect(state.cameraDist).toBeGreaterThan(6)
  await page.screenshot({ path: 'e2e/artifacts/temple-open-1440.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'e2e/artifacts/temple-open-390.png' })
})

test('camera pull-in ignores grass near the cottage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await enterWorld(page, /Unlocked Verdant Isle/)
  await walkTo(page, 5.2, 10.4)
  const samples: number[] = []
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.move(400 + i * 40, 300)
    await page.mouse.down()
    await page.mouse.move(520 + i * 20, 310, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(160)
    samples.push((await inspect(page)).cameraDist)
  }
  expect(Math.min(...samples)).toBeGreaterThan(2.2)
  expect(Math.max(...samples) - Math.min(...samples)).toBeLessThan(7.5)
})
