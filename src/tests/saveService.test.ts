import { describe, expect, it } from 'vitest'
import { createEmptySave, sanitizeSave, sanitizeSettings } from '../services/saveService'
import { DEFAULT_SETTINGS, SAVE_VERSION } from '../game/types'

describe('saveService', () => {
  it('creates a valid empty save with the first world unlocked', () => {
    const save = createEmptySave()
    expect(save.version).toBe(SAVE_VERSION)
    expect(save.unlockedWorlds).toEqual(['verdant-isle'])
    expect(save.worlds['verdant-isle'].crystals).toEqual([])
  })

  it('rejects corrupted or version-mismatched data', () => {
    expect(sanitizeSave(null).unlockedWorlds).toContain('verdant-isle')
    expect(sanitizeSave({ version: 99, unlockedWorlds: ['sky-temple'] }).unlockedWorlds).toEqual(['verdant-isle'])
    expect(sanitizeSave({ version: 1, unlockedWorlds: ['not-real'] }).unlockedWorlds).toEqual(['verdant-isle'])
  })

  it('keeps valid world progress and always unlocks Verdant Isle', () => {
    const save = sanitizeSave({
      version: 1,
      unlockedWorlds: ['crystal-caverns'],
      completedWorlds: ['verdant-isle'],
      lastWorld: 'crystal-caverns',
      playTime: 12,
      worlds: {
        'verdant-isle': {
          crystals: ['c-meadow'],
          secrets: ['c-cave'],
          puzzles: ['switch-bridge'],
          portalReady: true,
          completed: true,
          checkpoint: { x: 1, y: 2, z: 3 },
        },
      },
    })
    expect(save.unlockedWorlds).toContain('verdant-isle')
    expect(save.unlockedWorlds).toContain('crystal-caverns')
    expect(save.worlds['verdant-isle'].crystals).toEqual(['c-meadow'])
    expect(save.worlds['verdant-isle'].checkpoint).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('clamps settings into a safe range', () => {
    const settings = sanitizeSettings({
      masterVolume: 4,
      musicVolume: -2,
      quality: 'ultra',
      cameraSensitivity: 9,
    })
    expect(settings.masterVolume).toBe(1)
    expect(settings.musicVolume).toBe(0)
    expect(settings.quality).toBe(DEFAULT_SETTINGS.quality)
    expect(settings.cameraSensitivity).toBe(2.4)
  })
})
