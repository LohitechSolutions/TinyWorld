import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { ResourcePool } from '../game/resources'

describe('resource pool', () => {
  it('disposes tracked geometries and materials', () => {
    const pool = new ResourcePool()
    const geo = pool.geo(new THREE.BoxGeometry(1, 1, 1))
    const mat = pool.std('#88d98b')
    expect(pool.geometries).toHaveLength(1)
    expect(pool.materials).toHaveLength(1)
    pool.dispose()
    expect(geo.uuid).toBeTruthy()
    expect(mat.uuid).toBeTruthy()
    expect(pool.geometries).toHaveLength(0)
    expect(pool.materials).toHaveLength(0)
  })
})
