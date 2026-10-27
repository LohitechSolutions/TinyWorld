import type { WorldDef, WorldId } from '../game/types'
import { crystalCaverns } from './crystalCaverns'
import { skyTemple } from './skyTemple'
import { verdantIsle } from './verdantIsle'

export const WORLDS: Record<WorldId, WorldDef> = {
  'verdant-isle': verdantIsle,
  'crystal-caverns': crystalCaverns,
  'sky-temple': skyTemple,
}

export const WORLD_LIST: WorldDef[] = [verdantIsle, crystalCaverns, skyTemple]

export function getWorld(id: WorldId): WorldDef {
  return WORLDS[id]
}
