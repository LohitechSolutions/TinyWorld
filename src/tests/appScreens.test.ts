import { describe, expect, it } from 'vitest'
import { WORLD_LIST } from '../worlds'
import { verdantIsle } from '../worlds/verdantIsle'
import { crystalCaverns } from '../worlds/crystalCaverns'
import { skyTemple } from '../worlds/skyTemple'

describe('world content', () => {
  it('ships three distinct playable worlds', () => {
    expect(WORLD_LIST.map((world) => world.id)).toEqual(['verdant-isle', 'crystal-caverns', 'sky-temple'])
  })

  it('gives each world three puzzle types and enough crystals', () => {
    for (const world of [verdantIsle, crystalCaverns, skyTemple]) {
      const kinds = new Set(world.puzzles.map((puzzle) => puzzle.kind))
      expect(kinds.has('switch')).toBe(true)
      expect(kinds.has('sequence')).toBe(true)
      expect(kinds.has('plates')).toBe(true)
      expect(world.collectibles.length).toBeGreaterThanOrEqual(world.requiredCrystals)
      expect(world.interactables.some((item) => item.kind === 'portal')).toBe(true)
    }
  })

  it('places Verdant Isle collectibles on or beside the island', () => {
    const radius = verdantIsle.island!.radius
    for (const item of verdantIsle.collectibles.filter((crystal) => !crystal.hidden)) {
      expect(Math.hypot(item.position.x, item.position.z)).toBeLessThan(radius + 2)
    }
  })
})
