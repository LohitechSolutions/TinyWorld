import { DEFAULT_SETTINGS, SAVE_VERSION, WORLD_IDS } from '../game/types'
import type { SaveData, Settings, WorldId, WorldProgress } from '../game/types'

export const SAVE_KEY = 'tiny-worlds-lost-dimensions-v1'
export const SETTINGS_KEY = 'tiny-worlds-settings-v1'

export function emptyWorldProgress(): WorldProgress {
  return {
    crystals: [],
    secrets: [],
    puzzles: [],
    portalReady: false,
    completed: false,
    checkpoint: null,
  }
}

export function createEmptySave(): SaveData {
  const worlds = {
    'verdant-isle': emptyWorldProgress(),
    'crystal-caverns': emptyWorldProgress(),
    'sky-temple': emptyWorldProgress(),
  } as Record<WorldId, WorldProgress>
  return {
    version: SAVE_VERSION,
    unlockedWorlds: ['verdant-isle'],
    completedWorlds: [],
    lastWorld: null,
    playTime: 0,
    worlds,
  }
}

function isWorldId(value: unknown): value is WorldId {
  return typeof value === 'string' && (WORLD_IDS as readonly string[]).includes(value)
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string')
}

function sanitizeProgress(raw: unknown): WorldProgress {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const checkpointRaw = src.checkpoint
  let checkpoint: WorldProgress['checkpoint'] = null
  if (checkpointRaw && typeof checkpointRaw === 'object') {
    const c = checkpointRaw as Record<string, unknown>
    if (typeof c.x === 'number' && typeof c.y === 'number' && typeof c.z === 'number') {
      checkpoint = { x: c.x, y: c.y, z: c.z }
    }
  }
  return {
    crystals: asStringArray(src.crystals),
    secrets: asStringArray(src.secrets),
    puzzles: asStringArray(src.puzzles),
    portalReady: src.portalReady === true,
    completed: src.completed === true,
    checkpoint,
  }
}

export function sanitizeSave(raw: unknown): SaveData {
  const fallback = createEmptySave()
  if (!raw || typeof raw !== 'object') return fallback
  const src = raw as Record<string, unknown>
  if (src.version !== SAVE_VERSION) return fallback

  const unlocked = asStringArray(src.unlockedWorlds).filter(isWorldId)
  const completed = asStringArray(src.completedWorlds).filter(isWorldId)
  const worldsRaw = src.worlds && typeof src.worlds === 'object' ? (src.worlds as Record<string, unknown>) : {}

  const worlds = { ...fallback.worlds }
  for (const id of WORLD_IDS) {
    worlds[id] = sanitizeProgress(worldsRaw[id])
  }

  return {
    version: SAVE_VERSION,
    unlockedWorlds: unlocked.length > 0 ? Array.from(new Set(['verdant-isle', ...unlocked])) : ['verdant-isle'],
    completedWorlds: Array.from(new Set(completed)),
    lastWorld: isWorldId(src.lastWorld) ? src.lastWorld : null,
    playTime: typeof src.playTime === 'number' && Number.isFinite(src.playTime) ? Math.max(0, src.playTime) : 0,
    worlds,
  }
}

export function sanitizeSettings(raw: unknown): Settings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const quality = src.quality === 'low' || src.quality === 'medium' || src.quality === 'high' ? src.quality : DEFAULT_SETTINGS.quality
  const num = (value: unknown, fallback: number, min = 0, max = 1) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
    return Math.min(max, Math.max(min, value))
  }
  return {
    masterVolume: num(src.masterVolume, DEFAULT_SETTINGS.masterVolume),
    musicVolume: num(src.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: num(src.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    quality,
    reducedMotion: src.reducedMotion === true,
    cameraSensitivity: num(src.cameraSensitivity, DEFAULT_SETTINGS.cameraSensitivity, 0.3, 2.4),
    invertY: src.invertY === true,
    touchSensitivity: num(src.touchSensitivity, DEFAULT_SETTINGS.touchSensitivity, 0.4, 2),
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createEmptySave()
    return sanitizeSave(JSON.parse(raw))
  } catch {
    return createEmptySave()
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // Private mode or quota — keep playing in-memory.
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return sanitizeSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function persistSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage failures.
  }
}

export function clearSave(): SaveData {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Ignore
  }
  return createEmptySave()
}

export function hasContinue(save: SaveData): boolean {
  if (save.lastWorld) return true
  return WORLD_IDS.some((id) => save.worlds[id].crystals.length > 0 || save.worlds[id].puzzles.length > 0)
}
