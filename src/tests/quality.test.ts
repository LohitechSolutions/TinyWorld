import { describe, expect, it } from 'vitest'
import { QUALITY_PROFILES, qualityProfile } from '../game/quality'

describe('quality profiles', () => {
  it('defines distinct low, medium, and high profiles', () => {
    const low = qualityProfile('low')
    const medium = qualityProfile('medium')
    const high = qualityProfile('high')
    expect(low.shadows).toBe(false)
    expect(medium.shadows).toBe(true)
    expect(high.pixelRatioCap).toBeGreaterThan(medium.pixelRatioCap)
    expect(high.vegetation).toBeGreaterThan(low.vegetation)
    expect(high.pollen).toBeGreaterThan(low.pollen)
    expect(low.extraDecor).toBe(false)
    expect(high.extraDecor).toBe(true)
    expect(Object.keys(QUALITY_PROFILES)).toEqual(['low', 'medium', 'high'])
  })
})
