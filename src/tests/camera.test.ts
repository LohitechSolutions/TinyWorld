import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { cameraPullDistance, isCameraBlocker } from '../game/ThirdPersonCamera'

describe('camera obstruction', () => {
  it('ignores grass, flowers, and particle points', () => {
    const grass = new THREE.Object3D()
    grass.userData.ignoreCamera = true
    const pollen = new THREE.Points()
    expect(isCameraBlocker(grass)).toBe(false)
    expect(isCameraBlocker(pollen)).toBe(false)
    expect(isCameraBlocker(new THREE.Mesh())).toBe(true)
  })

  it('pulls in for solid hits and ignores marked props', () => {
    const soft = new THREE.Object3D()
    soft.userData.ignoreCamera = true
    const wall = new THREE.Object3D()
    const pulled = cameraPullDistance([
      { object: soft, distance: 1.2 },
      { object: wall, distance: 4.2 },
    ])
    expect(pulled).toBeCloseTo(3.75, 2)
    expect(cameraPullDistance([{ object: soft, distance: 1 }])).toBeNull()
  })
})
