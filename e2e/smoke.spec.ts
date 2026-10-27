import { expect, test } from '@playwright/test'

test('how to play and settings are reachable', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'How to Play' }).click()
  await expect(page.getByRole('heading', { name: 'How to Play' })).toBeVisible()
  await page.screenshot({ path: 'e2e/artifacts/howto-1440.png', fullPage: true })
  await page.getByRole('button', { name: 'Return' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.screenshot({ path: 'e2e/artifacts/settings-768.png', fullPage: true })
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Credits' }).click()
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible()
  await page.screenshot({ path: 'e2e/artifacts/credits-768.png', fullPage: true })
})

test('loads the menu and enters Verdant Isle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('heading', { name: 'Tiny Worlds' })).toBeVisible()
  await page.screenshot({ path: 'e2e/artifacts/menu-1440.png', fullPage: true })

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose a World' })).toBeVisible()
  await page.screenshot({ path: 'e2e/artifacts/worlds-1440.png', fullPage: true })

  await page.getByRole('button', { name: /Unlocked Verdant Isle/ }).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'e2e/artifacts/play-1440.png' })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'e2e/artifacts/play-390.png' })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(900)
  await page.keyboard.up('KeyW')
  await page.screenshot({ path: 'e2e/artifacts/moved-1440.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible()
  await page.screenshot({ path: 'e2e/artifacts/pause-1440.png' })
})
