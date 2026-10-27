import type { Page } from '@playwright/test'
import { SAVE_KEY } from '../src/services/saveService'
import { SAVE_VERSION } from '../src/game/types'

export type Inspect = {
  x: number
  y: number
  z: number
  yaw: number
  cameraYaw: number
  onGround: boolean
  worldId: string | null
  crystals: string[]
  puzzles: string[]
  portalReady: boolean
  completed: boolean
  fps: number
  quality: string
  secrets: string[]
  cameraDist: number
  cameraBlocked: boolean
}

declare global {
  interface Window {
    __TW?: { inspect: () => Inspect }
  }
}

const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'] as const

export async function inspect(page: Page): Promise<Inspect> {
  await page.waitForFunction(() => Boolean(window.__TW?.inspect), null, { timeout: 20000 })
  return page.evaluate(() => window.__TW!.inspect())
}

export async function releaseKeys(page: Page): Promise<void> {
  for (const key of KEYS) await page.keyboard.up(key)
}

function emptyProgress() {
  return { crystals: [] as string[], secrets: [] as string[], puzzles: [] as string[], portalReady: false, completed: false, checkpoint: null }
}

export function seedProgress(page: Page, unlocked: 'caverns' | 'temple'): Promise<void> {
  const verdantDone = {
    crystals: ['c-meadow', 'c-falls', 'c-ruins'],
    secrets: [],
    puzzles: ['switch-bridge', 'sequence-plaza'],
    portalReady: true,
    completed: true,
    checkpoint: null,
  }
  const cavernsDone = {
    crystals: ['cc-1', 'cc-2', 'cc-3'],
    secrets: [],
    puzzles: ['switch-gate', 'plates-span', 'sequence-heart'],
    portalReady: true,
    completed: true,
    checkpoint: null,
  }
  const save = {
    version: SAVE_VERSION,
    unlockedWorlds: unlocked === 'temple' ? ['verdant-isle', 'crystal-caverns', 'sky-temple'] : ['verdant-isle', 'crystal-caverns'],
    completedWorlds: unlocked === 'temple' ? ['verdant-isle', 'crystal-caverns'] : ['verdant-isle'],
    lastWorld: unlocked === 'temple' ? 'sky-temple' : 'crystal-caverns',
    playTime: 180,
    worlds: {
      'verdant-isle': verdantDone,
      'crystal-caverns': unlocked === 'temple' ? cavernsDone : emptyProgress(),
      'sky-temple': emptyProgress(),
    },
  }
  return page.addInitScript(
    ([key, payload, token]) => {
      if (sessionStorage.getItem('tw-seed') === token) return
      localStorage.setItem(key, payload)
      sessionStorage.setItem('tw-seed', token)
    },
    [SAVE_KEY, JSON.stringify(save), unlocked] as const,
  )
}

export async function enterWorld(page: Page, name: RegExp): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('heading', { name: 'Choose a World' }).waitFor()
  await page.getByRole('button', { name }).click()
  await page.locator('canvas').waitFor({ timeout: 15000 })
  await inspect(page)
}

export async function walkTo(page: Page, x: number, z: number, timeoutMs = 28000): Promise<Inspect> {
  const start = Date.now()
  let lastDist = Infinity
  let stuckAt = Date.now()
  await page.keyboard.down('ShiftLeft')
  while (Date.now() - start < timeoutMs) {
    const state = await inspect(page)
    const dx = x - state.x
    const dz = z - state.z
    const dist = Math.hypot(dx, dz)
    if (dist < 1.15 && state.onGround) {
      await releaseKeys(page)
      return state
    }
    if (dist < lastDist - 0.08) {
      lastDist = dist
      stuckAt = Date.now()
    } else if (Date.now() - stuckAt > 1400) {
      await page.keyboard.press('Space')
      stuckAt = Date.now()
    }
    if (dist < 2.6 && dist > 1.15 && state.onGround && Date.now() - stuckAt > 700) {
      await page.keyboard.press('Space')
      stuckAt = Date.now()
    }
    const wishX = dx / dist
    const wishZ = dz / dist
    const sin = Math.sin(state.cameraYaw)
    const cos = Math.cos(state.cameraYaw)
    const moveZ = -sin * wishX - cos * wishZ
    const moveX = cos * wishX - sin * wishZ
    await page.keyboard.up('KeyW')
    await page.keyboard.up('KeyS')
    await page.keyboard.up('KeyA')
    await page.keyboard.up('KeyD')
    if (moveZ > 0.28) await page.keyboard.down('KeyW')
    if (moveZ < -0.28) await page.keyboard.down('KeyS')
    if (moveX > 0.28) await page.keyboard.down('KeyD')
    if (moveX < -0.28) await page.keyboard.down('KeyA')
    await page.waitForTimeout(120)
  }
  await releaseKeys(page)
  throw new Error(`Could not reach ${x.toFixed(1)}, ${z.toFixed(1)}`)
}

export async function interact(page: Page): Promise<void> {
  await page.keyboard.press('KeyE')
  await page.waitForTimeout(220)
}

export async function playSequence(page: Page, nodes: { x: number; z: number }[], puzzleId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const node of nodes) {
      await walkTo(page, node.x, node.z)
      await page.waitForTimeout(180)
      await interact(page)
    }
    const state = await inspect(page)
    if (state.puzzles.includes(puzzleId)) return
  }
  throw new Error(`Sequence ${puzzleId} did not complete`)
}
