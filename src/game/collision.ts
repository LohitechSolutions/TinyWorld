import type { Vec3 } from './types'

export type BoxCollider = {
  kind: 'box'
  min: Vec3
  max: Vec3
  solid: boolean
}

export type CylinderCollider = {
  kind: 'cylinder'
  x: number
  z: number
  radius: number
  minY: number
  maxY: number
  solid: boolean
}

export type PlatformCollider = {
  kind: 'platform'
  id: string
  min: Vec3
  max: Vec3
  active: boolean
}

export type Collider = BoxCollider | CylinderCollider | PlatformCollider

export function resolveWalls(pos: Vec3, radius: number, height: number, colliders: Collider[]): void {
  for (const collider of colliders) {
    if (collider.kind === 'platform' || !collider.solid) continue
    const minY = collider.kind === 'box' ? collider.min.y : collider.minY
    const maxY = collider.kind === 'box' ? collider.max.y : collider.maxY
    if (pos.y > maxY + 0.1 || pos.y + height < minY) continue

    if (collider.kind === 'box') {
      const closestX = Math.min(collider.max.x, Math.max(collider.min.x, pos.x))
      const closestZ = Math.min(collider.max.z, Math.max(collider.min.z, pos.z))
      const dx = pos.x - closestX
      const dz = pos.z - closestZ
      const dist = Math.hypot(dx, dz)
      if (dist < radius && dist > 0.0001) {
        const push = (radius - dist) / dist
        pos.x += dx * push
        pos.z += dz * push
      } else if (dist === 0 && pos.x > collider.min.x && pos.x < collider.max.x && pos.z > collider.min.z && pos.z < collider.max.z) {
        const left = pos.x - collider.min.x
        const right = collider.max.x - pos.x
        const north = collider.max.z - pos.z
        const south = pos.z - collider.min.z
        const smallest = Math.min(left, right, north, south)
        if (smallest === left) pos.x = collider.min.x - radius
        else if (smallest === right) pos.x = collider.max.x + radius
        else if (smallest === north) pos.z = collider.max.z + radius
        else pos.z = collider.min.z - radius
      }
    } else {
      const dx = pos.x - collider.x
      const dz = pos.z - collider.z
      const dist = Math.hypot(dx, dz)
      const minDist = radius + collider.radius
      if (dist < minDist && dist > 0.0001) {
        const push = (minDist - dist) / dist
        pos.x += dx * push
        pos.z += dz * push
      }
    }
  }
}

export function samplePlatforms(x: number, y: number, z: number, colliders: Collider[]): number | null {
  let best: number | null = null
  for (const collider of colliders) {
    if (collider.kind !== 'platform' || !collider.active) continue
    if (x < collider.min.x || x > collider.max.x || z < collider.min.z || z > collider.max.z) continue
    const top = collider.max.y
    if (y >= top - 0.85 && y <= top + 1.35) {
      if (best === null || top > best) best = top
    }
  }
  return best
}

export function boxFromCenter(center: Vec3, size: Vec3): { min: Vec3; max: Vec3 } {
  return {
    min: { x: center.x - size.x / 2, y: center.y - size.y / 2, z: center.z - size.z / 2 },
    max: { x: center.x + size.x / 2, y: center.y + size.y / 2, z: center.z + size.z / 2 },
  }
}
