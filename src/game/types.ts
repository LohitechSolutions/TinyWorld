export const WORLD_IDS = ['verdant-isle', 'crystal-caverns', 'sky-temple'] as const
export type WorldId = (typeof WORLD_IDS)[number]

export const SCREENS = {
  LOADING: 'loading',
  MENU: 'menu',
  HOWTO: 'howto',
  WORLDS: 'worlds',
  SETTINGS: 'settings',
  CREDITS: 'credits',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ENDING: 'ending',
  ERROR: 'error',
} as const

export type ScreenId = (typeof SCREENS)[keyof typeof SCREENS]

export type Vec3 = { x: number; y: number; z: number }

export type QualityLevel = 'low' | 'medium' | 'high'

export type Settings = {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  quality: QualityLevel
  reducedMotion: boolean
  cameraSensitivity: number
  invertY: boolean
  touchSensitivity: number
}

export type WorldProgress = {
  crystals: string[]
  secrets: string[]
  puzzles: string[]
  portalReady: boolean
  completed: boolean
  checkpoint: Vec3 | null
}

export type SaveData = {
  version: number
  unlockedWorlds: WorldId[]
  completedWorlds: WorldId[]
  lastWorld: WorldId | null
  playTime: number
  worlds: Record<WorldId, WorldProgress>
}

export type CollectibleKind = 'crystal' | 'artifact' | 'secret'

export type CollectibleDef = {
  id: string
  kind: CollectibleKind
  position: Vec3
  color: string
  name: string
  hidden?: boolean
}

export type PuzzleKind = 'switch' | 'sequence' | 'plates'

export type PuzzleNode = { id: string; position: Vec3 }

export type PuzzleDef = {
  id: string
  kind: PuzzleKind
  title: string
  hint: string
  targetId?: string
  switchPosition?: Vec3
  nodes?: PuzzleNode[]
  order?: string[]
  plates?: { id: string; position: Vec3; radius: number }[]
}

export type InteractableKind = 'sign' | 'checkpoint' | 'portal' | 'mechanism'

export type InteractableDef = {
  id: string
  kind: InteractableKind
  position: Vec3
  label: string
  body?: string
  radius?: number
}

export type PlatformKind = 'stone' | 'wood' | 'crystal' | 'bridge' | 'gold'

export type PlatformDef = {
  id: string
  position: Vec3
  size: Vec3
  kind: PlatformKind
  startsHidden?: boolean
}

export type LandmarkKind =
  | 'trees'
  | 'ruins'
  | 'waterfall'
  | 'pond'
  | 'cottage'
  | 'portal'
  | 'tower'
  | 'temple'
  | 'crystal-cluster'
  | 'cave-wall'
  | 'columns'

export type LandmarkDef = {
  kind: LandmarkKind
  position: Vec3
  scale?: number
  rotation?: number
  extra?: Record<string, number>
}

export type HillDef = { x: number; z: number; h: number; spread: number }
export type FlatDef = { x: number; z: number; radius: number; height: number }

export type IslandParams = {
  center: { x: number; z: number }
  radius: number
  baseHeight: number
  seed: number
  edgeNoise: number
  hills: HillDef[]
  flats: FlatDef[]
  bowl?: number
}

export type WorldTheme = {
  sky: string
  fog: string
  fogNear: number
  fogFar: number
  sunColor: string
  sunDir: Vec3
  sunIntensity: number
  hemiSky: string
  hemiGround: string
  ground: string
  grass: string
  grassDark: string
  rock: string
  dirt: string
  water: string
  accent: string
}

export type WorldDef = {
  id: WorldId
  name: string
  subtitle: string
  description: string
  preview: string
  requiredCrystals: number
  requiredPuzzles: string[]
  unlocks?: WorldId
  theme: WorldTheme
  spawn: Vec3
  fallY: number
  island: IslandParams | null
  collectibles: CollectibleDef[]
  puzzles: PuzzleDef[]
  interactables: InteractableDef[]
  landmarks: LandmarkDef[]
  platforms: PlatformDef[]
  scatter: {
    trees: number
    rocks: number
    flowers: number
    grass: number
    crystals?: number
  }
}

export type HudNotification = {
  id: string
  title: string
  body: string
  tone: 'crystal' | 'secret' | 'puzzle' | 'info' | 'portal'
}

export type CompletionStats = {
  worldId: WorldId
  worldName: string
  crystals: number
  crystalTotal: number
  secrets: number
  secretTotal: number
  puzzles: number
  nextWorld: WorldId | null
  allComplete: boolean
}

export type GameEvent =
  | { type: 'collect'; id: string; kind: CollectibleKind; name: string; hidden?: boolean }
  | { type: 'puzzle'; id: string; title: string }
  | { type: 'prompt'; text: string | null }
  | { type: 'objective'; text: string }
  | { type: 'checkpoint'; position: Vec3 }
  | { type: 'portal-ready' }
  | { type: 'world-complete'; stats: CompletionStats }
  | { type: 'notify'; title: string; body: string; tone: HudNotification['tone'] }
  | { type: 'fell' }
  | { type: 'ready' }

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.7,
  musicVolume: 0.45,
  sfxVolume: 0.7,
  quality: 'high',
  reducedMotion: false,
  cameraSensitivity: 1,
  invertY: false,
  touchSensitivity: 1,
}

export const SAVE_VERSION = 1
