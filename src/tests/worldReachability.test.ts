import { describe, expect, it } from 'vitest'
import { canReadyPortal, markCollected, markPuzzle } from '../game/progression'
import { createHeightSampler } from '../game/terrain'
import { emptyWorldProgress } from '../services/saveService'
import { WORLD_LIST } from '../worlds'

describe('world reachability', () => {
  it('places required collectibles on terrain or a platform', () => {
    for (const world of WORLD_LIST) {
      const sampler = world.island ? createHeightSampler(world.island) : null
      for (const item of world.collectibles.filter((crystal) => !crystal.hidden)) {
        const onLand = sampler ? sampler.heightAt(item.position.x, item.position.z) !== null : false
        const onPlatform = world.platforms.some((platform) => {
          const hx = platform.size.x / 2 + 0.4
          const hz = platform.size.z / 2 + 0.4
          return Math.abs(item.position.x - platform.position.x) <= hx && Math.abs(item.position.z - platform.position.z) <= hz
        })
        expect(onLand || onPlatform, `${world.id}:${item.id}`).toBe(true)
      }
    }
  })

  it('can complete every world through the documented crystal and puzzle rules', () => {
    for (const world of WORLD_LIST) {
      let progress = emptyWorldProgress()
      for (const item of world.collectibles.filter((crystal) => !crystal.hidden).slice(0, world.requiredCrystals)) {
        progress = markCollected(progress, item.id, false)
      }
      for (const puzzleId of world.requiredPuzzles) {
        progress = markPuzzle(progress, puzzleId)
      }
      expect(canReadyPortal(world, progress), world.id).toBe(true)
    }
  })
})
