import { expect, test } from '@playwright/test'
import { enterWorld, inspect, seedProgress, walkTo } from './helpers'

async function sampleFps(page: import('@playwright/test').Page, ms: number): Promise<{ min: number; avg: number; samples: number[] }> {
  const samples: number[] = []
  const start = Date.now()
  while (Date.now() - start < ms) {
    await page.waitForTimeout(520)
    const fps = (await inspect(page)).fps
    if (fps > 0) samples.push(fps)
  }
  const avg = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length)
  return { min: Math.min(...samples), avg, samples }
}

test('measure spawn and demanding gameplay frame rates', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const started = Date.now()
  await enterWorld(page, /Unlocked Verdant Isle/)
  const firstPlayable = Date.now() - started
  await page.waitForTimeout(1200)
  const verdantSpawn = await inspect(page)
  console.log(`MEASURE firstPlayableMs=${firstPlayable} verdantSpawn=${verdantSpawn.fps.toFixed(1)} quality=${verdantSpawn.quality}`)

  await page.keyboard.down('ShiftLeft')
  await page.keyboard.down('KeyW')
  const foliage = await sampleFps(page, 3500)
  await page.keyboard.up('KeyW')
  await page.keyboard.up('ShiftLeft')
  console.log(`MEASURE verdantMove min=${foliage.min.toFixed(1)} avg=${foliage.avg.toFixed(1)} n=${foliage.samples.length}`)

  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(700, 360)
    await page.mouse.down()
    await page.mouse.move(860, 380, { steps: 8 })
    await page.mouse.up()
  }
  const rotate = await sampleFps(page, 1600)
  console.log(`MEASURE verdantRotate min=${rotate.min.toFixed(1)} avg=${rotate.avg.toFixed(1)}`)

  await walkTo(page, 0, -20.2, 36000)
  const portal = await sampleFps(page, 1600)
  console.log(`MEASURE verdantPortal min=${portal.min.toFixed(1)} avg=${portal.avg.toFixed(1)}`)

  await seedProgress(page, 'caverns')
  const cavernStart = Date.now()
  await enterWorld(page, /Unlocked Crystal Caverns/)
  const cavernTransition = Date.now() - cavernStart
  await page.waitForTimeout(1000)
  const caverns = await inspect(page)
  console.log(`MEASURE cavernTransitionMs=${cavernTransition} cavernsSpawn=${caverns.fps.toFixed(1)}`)

  await seedProgress(page, 'temple')
  await enterWorld(page, /Unlocked Sky Temple/)
  await page.waitForTimeout(1000)
  const temple = await inspect(page)
  console.log(`MEASURE templeSpawn=${temple.fps.toFixed(1)}`)

  expect(verdantSpawn.fps).toBeGreaterThan(20)
  expect(foliage.avg).toBeGreaterThan(20)
  expect(caverns.fps).toBeGreaterThan(20)
  expect(temple.fps).toBeGreaterThan(20)
})
