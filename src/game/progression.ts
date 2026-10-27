import { WORLD_IDS } from './types'
import type { SaveData, WorldDef, WorldId, WorldProgress } from './types'

export function isWorldUnlocked(save: SaveData, worldId: WorldId): boolean {
  return save.unlockedWorlds.includes(worldId)
}

export function requiredCrystalCount(world: WorldDef, progress: WorldProgress): number {
  return progress.crystals.filter((id) => world.collectibles.some((item) => item.id === id && item.kind !== 'secret')).length
}

export function secretCount(world: WorldDef, progress: WorldProgress): number {
  return world.collectibles.filter((item) => item.hidden && progress.crystals.includes(item.id)).length
}

export function canReadyPortal(world: WorldDef, progress: WorldProgress): boolean {
  const crystals = requiredCrystalCount(world, progress)
  const puzzlesDone = world.requiredPuzzles.every((id) => progress.puzzles.includes(id))
  return crystals >= world.requiredCrystals && puzzlesDone
}

export function computeObjective(world: WorldDef, progress: WorldProgress): string {
  const crystals = requiredCrystalCount(world, progress)
  if (crystals < world.requiredCrystals) {
    return `Find the energy crystals (${crystals}/${world.requiredCrystals})`
  }

  for (const puzzleId of world.requiredPuzzles) {
    if (!progress.puzzles.includes(puzzleId)) {
      const puzzle = world.puzzles.find((item) => item.id === puzzleId)
      return puzzle?.hint ?? 'Solve the remaining ancient mechanism'
    }
  }

  if (!progress.portalReady) {
    return 'The portal is gathering light — approach it'
  }

  if (!progress.completed) {
    return 'Activate the ancient portal'
  }

  return 'This world is restored. Explore or return when ready.'
}

export function unlockNext(save: SaveData, world: WorldDef): SaveData {
  const next = world.unlocks
  if (!next) return save
  if (save.unlockedWorlds.includes(next)) return save
  return {
    ...save,
    unlockedWorlds: [...save.unlockedWorlds, next],
  }
}

export function continueWorld(save: SaveData): WorldId {
  if (save.lastWorld && isWorldUnlocked(save, save.lastWorld) && !save.completedWorlds.includes(save.lastWorld)) {
    return save.lastWorld
  }
  for (const id of WORLD_IDS) {
    if (isWorldUnlocked(save, id) && !save.completedWorlds.includes(id)) return id
  }
  return save.lastWorld ?? 'verdant-isle'
}

export function crystalTotals(world: WorldDef): { required: number; secrets: number; all: number } {
  const secrets = world.collectibles.filter((item) => item.hidden).length
  return {
    required: world.requiredCrystals,
    secrets,
    all: world.collectibles.length,
  }
}

export function markCollected(progress: WorldProgress, id: string, hidden: boolean): WorldProgress {
  if (progress.crystals.includes(id)) return progress
  return {
    ...progress,
    crystals: [...progress.crystals, id],
    secrets: hidden && !progress.secrets.includes(id) ? [...progress.secrets, id] : progress.secrets,
  }
}

export function markPuzzle(progress: WorldProgress, id: string): WorldProgress {
  if (progress.puzzles.includes(id)) return progress
  return { ...progress, puzzles: [...progress.puzzles, id] }
}

export function allWorldsComplete(save: SaveData): boolean {
  return WORLD_IDS.every((id) => save.completedWorlds.includes(id))
}
