import { create } from 'zustand'
import { canReadyPortal, continueWorld, markCollected, markPuzzle, unlockNext } from '../game/progression'
import { SCREENS } from '../game/types'
import type { CompletionStats, HudNotification, SaveData, ScreenId, Settings, WorldDef, WorldId } from '../game/types'
import { clearSave, hasContinue, loadSave, loadSettings, persistSave, persistSettings } from '../services/saveService'

type GameStore = {
  screen: ScreenId
  overlay: ScreenId | null
  currentWorld: WorldId | null
  save: SaveData
  settings: Settings
  bootProgress: number
  bootMessage: string
  errorMessage: string | null
  prompt: string | null
  objective: string
  notifications: HudNotification[]
  lastCompletion: CompletionStats | null
  hasContinue: boolean

  setBoot: (progress: number, message: string) => void
  finishBoot: () => void
  failBoot: (message: string) => void
  go: (screen: ScreenId) => void
  openOverlay: (screen: ScreenId | null) => void
  updateSettings: (patch: Partial<Settings>) => void
  startWorld: (id: WorldId) => void
  continueGame: () => WorldId
  setPrompt: (text: string | null) => void
  setObjective: (text: string) => void
  collect: (world: WorldDef, id: string, hidden: boolean, name: string) => void
  solvePuzzle: (world: WorldDef, id: string, title: string) => void
  setCheckpoint: (worldId: WorldId, position: { x: number; y: number; z: number }) => void
  markPortalReady: (world: WorldDef) => void
  completeWorld: (world: WorldDef, stats: CompletionStats) => void
  notify: (note: Omit<HudNotification, 'id'>) => void
  dismissNote: (id: string) => void
  addPlayTime: (seconds: number) => void
  resetSave: () => void
}

let noteSeq = 0

export const useGameStore = create<GameStore>((set, get) => ({
  screen: SCREENS.LOADING,
  overlay: null,
  currentWorld: null,
  save: loadSave(),
  settings: loadSettings(),
  bootProgress: 0.04,
  bootMessage: 'Waking the lost dimensions…',
  errorMessage: null,
  prompt: null,
  objective: 'Explore',
  notifications: [],
  lastCompletion: null,
  hasContinue: hasContinue(loadSave()),

  setBoot: (progress, message) => set({ bootProgress: progress, bootMessage: message }),

  finishBoot: () => set({ screen: SCREENS.MENU, bootProgress: 1, bootMessage: 'Ready' }),

  failBoot: (message) => set({ screen: SCREENS.ERROR, errorMessage: message }),

  go: (screen) => {
    const leaveWorld =
      screen === SCREENS.MENU ||
      screen === SCREENS.WORLDS ||
      screen === SCREENS.HOWTO ||
      screen === SCREENS.CREDITS
    set({
      screen,
      overlay: null,
      currentWorld: leaveWorld ? null : get().currentWorld,
    })
  },

  openOverlay: (screen) => set({ overlay: screen }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    persistSettings(settings)
    set({ settings })
  },

  startWorld: (id) => {
    const save = { ...get().save, lastWorld: id }
    persistSave(save)
    set({
      save,
      currentWorld: id,
      screen: SCREENS.PLAYING,
      overlay: null,
      prompt: null,
      hasContinue: true,
    })
  },

  continueGame: () => {
    const id = continueWorld(get().save)
    get().startWorld(id)
    return id
  },

  setPrompt: (text) => {
    if (get().prompt === text) return
    set({ prompt: text })
  },

  setObjective: (text) => {
    if (get().objective === text) return
    set({ objective: text })
  },

  collect: (world, id, hidden, name) => {
    const save = structuredClone(get().save) as SaveData
    const progress = save.worlds[world.id]
    save.worlds[world.id] = markCollected(progress, id, hidden)
    persistSave(save)
    set({ save, hasContinue: true })
    get().notify({
      title: hidden ? 'Secret discovered' : 'Crystal collected',
      body: name,
      tone: hidden ? 'secret' : 'crystal',
    })
    if (canReadyPortal(world, save.worlds[world.id]) && !save.worlds[world.id].portalReady) {
      get().markPortalReady(world)
    }
  },

  solvePuzzle: (world, id, title) => {
    const save = structuredClone(get().save) as SaveData
    save.worlds[world.id] = markPuzzle(save.worlds[world.id], id)
    persistSave(save)
    set({ save })
    get().notify({ title: 'Mechanism awakened', body: title, tone: 'puzzle' })
    if (canReadyPortal(world, save.worlds[world.id]) && !save.worlds[world.id].portalReady) {
      get().markPortalReady(world)
    }
  },

  setCheckpoint: (worldId, position) => {
    const save = structuredClone(get().save) as SaveData
    save.worlds[worldId].checkpoint = position
    persistSave(save)
    set({ save })
  },

  markPortalReady: (world) => {
    const save = structuredClone(get().save) as SaveData
    save.worlds[world.id].portalReady = true
    persistSave(save)
    set({ save })
    get().notify({
      title: 'Portal awakened',
      body: 'The ancient ring is ready.',
      tone: 'portal',
    })
  },

  completeWorld: (world, stats) => {
    const save = structuredClone(get().save) as SaveData
    const progress = save.worlds[world.id]
    progress.completed = true
    progress.portalReady = true
    if (!save.completedWorlds.includes(world.id)) save.completedWorlds.push(world.id)
    const next = unlockNext(save, world)
    persistSave(next)
    set({
      save: next,
      lastCompletion: stats,
      screen: stats.allComplete ? SCREENS.ENDING : SCREENS.COMPLETE,
    })
  },

  notify: (note) => {
    noteSeq += 1
    const item: HudNotification = { ...note, id: `n-${noteSeq}` }
    set({ notifications: [...get().notifications.slice(-4), item] })
    window.setTimeout(() => get().dismissNote(item.id), 4200)
  },

  dismissNote: (id) => set({ notifications: get().notifications.filter((item) => item.id !== id) }),

  addPlayTime: (seconds) => {
    const save = { ...get().save, playTime: get().save.playTime + seconds }
    persistSave(save)
    set({ save })
  },

  resetSave: () => {
    const save = clearSave()
    set({
      save,
      hasContinue: false,
      currentWorld: null,
      lastCompletion: null,
      notifications: [],
    })
  },
}))
