import * as THREE from 'three'
import { clamp, damp } from './math'
import type { Settings } from './types'

const _lookAt = new THREE.Vector3()
const _desired = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _pulled = new THREE.Vector3()

export function isCameraBlocker(object: THREE.Object3D): boolean {
  if (object.userData.ignoreCamera) return false
  if (object.type === 'Points') return false
  return true
}

export function cameraPullDistance(hits: { object: THREE.Object3D; distance: number }[]): number | null {
  const hit = hits.find((item) => isCameraBlocker(item.object))
  if (!hit) return null
  return Math.max(2.35, hit.distance - 0.45)
}

export class ThirdPersonCamera {
  yaw = 0.4
  pitch = 0.38
  distance = 8.6
  followDist = 8.6
  target = new THREE.Vector3()
  current = new THREE.Vector3()
  offset = new THREE.Vector3()
  lookBias = new THREE.Vector3()
  ray = new THREE.Raycaster()
  blocked = false
  blockedFrames = 0
  clearFrames = 0

  applyLook(lookX: number, lookY: number, settings: Settings, dt: number): void {
    const sens = 0.0046 * settings.cameraSensitivity
    this.yaw -= lookX * sens
    const invert = settings.invertY ? -1 : 1
    this.pitch += lookY * invert * sens
    this.pitch = clamp(this.pitch, 0.14, 1.08)
    void dt
  }

  update(
    dt: number,
    player: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    blockers: THREE.Object3D[],
    reducedMotion: boolean,
  ): void {
    this.target.lerp(player, reducedMotion ? 1 : 1 - Math.exp(-10 * dt))
    _lookAt.copy(this.target)
    _lookAt.y += 1.18
    _lookAt.add(this.lookBias)

    this.offset.set(
      Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      Math.sin(this.pitch) * this.distance + 1.05,
      Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance,
    )
    _desired.copy(_lookAt).add(this.offset)

    let want = this.distance
    let hitPull: number | null = null
    if (blockers.length > 0) {
      _dir.copy(_desired).sub(_lookAt)
      const length = _dir.length()
      if (length > 0.001) {
        this.ray.set(_lookAt, _dir.normalize())
        this.ray.near = 0.5
        this.ray.far = length
        const hits = this.ray.intersectObjects(blockers, true)
        hitPull = cameraPullDistance(hits)
        if (hitPull !== null) want = hitPull
      }
    }

    if (hitPull !== null) {
      this.blockedFrames += 1
      this.clearFrames = 0
      this.blocked = this.blockedFrames >= 2
    } else {
      this.clearFrames += 1
      this.blockedFrames = 0
      if (this.clearFrames >= 3) this.blocked = false
    }
    if (!this.blocked && hitPull !== null) want = this.followDist

    const recover = want >= this.followDist - 0.05
    this.followDist = damp(this.followDist, want, recover ? 2.6 : 12, dt)
    _pulled.copy(_lookAt).add(this.offset.setLength(this.followDist))
    const smooth = reducedMotion ? 22 : 11
    this.current.x = damp(this.current.x || _pulled.x, _pulled.x, smooth, dt)
    this.current.y = damp(this.current.y || _pulled.y, _pulled.y, smooth, dt)
    this.current.z = damp(this.current.z || _pulled.z, _pulled.z, smooth, dt)
    camera.position.copy(this.current)
    camera.lookAt(_lookAt)
  }

  snapTo(player: THREE.Vector3): void {
    _lookAt.copy(player)
    _lookAt.y += 1.18
    _lookAt.add(this.lookBias)
    this.target.copy(player)
    this.followDist = this.distance
    this.blocked = false
    this.blockedFrames = 0
    this.clearFrames = 0
    this.offset.set(
      Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      Math.sin(this.pitch) * this.distance + 1.05,
      Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance,
    )
    this.current.copy(_lookAt).add(this.offset)
  }
}
