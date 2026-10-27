import { describe, expect, it } from 'vitest'
import { canReadyPortal, computeObjective, continueWorld, markCollected, markPuzzle } from '../game/progression'
import { createEmptySave, emptyWorldProgress } from '../services/saveService'
import { verdantIsle } from '../worlds/verdantIsle'
import { crystalCaverns } from '../worlds/crystalCaverns'
import { skyTemple } from '../worlds/skyTemple'

describe('progression', () => {
  it('keeps the portal closed until crystals and required puzzles are done', () => {
    let progress = emptyWorldProgress()
    expect(canReadyPortal(verdantIsle, progress)).toBe(false)
    progress = markCollected(progress, 'c-meadow', false)
    progress = markCollected(progress, 'c-falls', false)
    progress = markCollected(progress, 'c-ruins', false)
    expect(canReadyPortal(verdantIsle, progress)).toBe(false)
    progress = markPuzzle(progress, 'switch-bridge')
    progress = markPuzzle(progress, 'sequence-plaza')
    expect(canReadyPortal(verdantIsle, progress)).toBe(true)
  })

  it('does not count the same crystal twice', () => {
    let progress = emptyWorldProgress()
    progress = markCollected(progress, 'c-meadow', false)
    progress = markCollected(progress, 'c-meadow', false)
    expect(progress.crystals).toEqual(['c-meadow'])
  })

  it('updates the objective text as the isle is restored', () => {
    const start = computeObjective(verdantIsle, emptyWorldProgress())
    expect(start).toContain('energy crystals')
    const ready = computeObjective(
      verdantIsle,
      markPuzzle(
        markPuzzle(
          markCollected(markCollected(markCollected(emptyWorldProgress(), 'c-meadow', false), 'c-falls', false), 'c-ruins', false),
          'switch-bridge',
        ),
        'sequence-plaza',
      ),
    )
    expect(ready.toLowerCase()).toContain('portal')
  })

  it('keeps the established sequence orders', () => {
    expect(verdantIsle.puzzles.find((item) => item.id === 'sequence-plaza')?.order).toEqual(['n-b', 'n-a', 'n-c'])
    expect(crystalCaverns.puzzles.find((item) => item.id === 'sequence-heart')?.order).toEqual(['h-3', 'h-1', 'h-2'])
    expect(skyTemple.puzzles.find((item) => item.id === 'sequence-sanctum')?.order).toEqual(['s-1', 's-3', 's-2'])
  })

  it('continues from the last unfinished unlocked world', () => {
    const save = createEmptySave()
    save.lastWorld = 'verdant-isle'
    expect(continueWorld(save)).toBe('verdant-isle')
    save.completedWorlds = ['verdant-isle']
    save.unlockedWorlds = ['verdant-isle', 'crystal-caverns']
    save.lastWorld = 'verdant-isle'
    expect(continueWorld(save)).toBe('crystal-caverns')
  })
})
