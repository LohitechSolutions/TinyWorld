import { damp, shortestAngle } from './math'
import type { InputSnapshot } from './InputManager'
import { resolveWalls, samplePlatforms } from './collision'
import type { Collider } from './collision'
import type { HeightSampler } from './terrain'
import type { Vec3 } from './types'

export type PlayerQuery = {
  sampler: HeightSampler | null
  colliders: Collider[]
  spawn: Vec3
  fallY: number
}

export class PlayerController {
  position = { x: 0, y: 1, z: 0 }
  velocity = { x: 0, y: 0, z: 0 }
  yaw = 0
  onGround = false
  radius = 0.28
  height = 1.2
  interacting = false
  justLanded = false
  justFell = false
  airTime = 0
  coyote = 0

  reset(spawn: Vec3): void {
    this.position.x = spawn.x
    this.position.y = spawn.y
    this.position.z = spawn.z
    this.velocity.x = 0
    this.velocity.y = 0
    this.velocity.z = 0
    this.onGround = false
    this.airTime = 0
    this.coyote = 0
  }

  update(dt: number, input: InputSnapshot, cameraYaw: number, query: PlayerQuery): void {
    this.justLanded = false
    this.justFell = false
    this.interacting = input.interactPressed
    const capped = Math.min(dt, 0.05)

    const sin = Math.sin(cameraYaw)
    const cos = Math.cos(cameraYaw)
    const wishX = -sin * input.moveZ + cos * input.moveX
    const wishZ = -cos * input.moveZ - sin * input.moveX
    const wishMag = Math.hypot(wishX, wishZ)
    const topSpeed = input.run ? 7.1 : 4.15
    const accel = this.onGround ? 30 : 8
    const decel = this.onGround ? 20 : 3

    if (wishMag > 0.01) {
      const nx = wishX / wishMag
      const nz = wishZ / wishMag
      this.velocity.x += nx * accel * capped
      this.velocity.z += nz * accel * capped
      const speed = Math.hypot(this.velocity.x, this.velocity.z)
      const max = topSpeed * Math.min(1, wishMag)
      if (speed > max) {
        this.velocity.x *= max / speed
        this.velocity.z *= max / speed
      }
      this.yaw += shortestAngle(this.yaw, Math.atan2(nx, nz)) * Math.min(1, capped * 12)
    } else {
      const speed = Math.hypot(this.velocity.x, this.velocity.z)
      const next = damp(speed, 0, decel, capped)
      if (speed > 0.001) {
        this.velocity.x *= next / speed
        this.velocity.z *= next / speed
      } else {
        this.velocity.x = 0
        this.velocity.z = 0
      }
    }

    this.velocity.y -= 26 * capped
    if (this.onGround) this.coyote = 0.1
    else this.coyote = Math.max(0, this.coyote - capped)
    if (input.jumpPressed && this.coyote > 0) {
      this.velocity.y = 8.4
      this.onGround = false
      this.coyote = 0
    }

    this.position.x += this.velocity.x * capped
    this.position.z += this.velocity.z * capped
    this.position.y += this.velocity.y * capped

    resolveWalls(this.position, this.radius, this.height, query.colliders)

    const terrain = query.sampler ? query.sampler.heightAt(this.position.x, this.position.z) : null
    const platform = samplePlatforms(this.position.x, this.position.y, this.position.z, query.colliders)
    let ground: number | null = null
    if (terrain !== null && platform !== null) ground = Math.max(terrain, platform)
    else ground = terrain ?? platform

    if (ground !== null && this.position.y <= ground + 0.08 && this.velocity.y <= 0.15) {
      if (!this.onGround && this.airTime > 0.08) this.justLanded = true
      this.position.y = ground
      this.velocity.y = 0
      this.onGround = true
      this.airTime = 0
    } else {
      this.onGround = false
      this.airTime += capped
    }

    const offWorld = this.position.y < query.fallY || (ground === null && this.position.y < query.fallY + 8)
    if (offWorld) {
      this.reset(query.spawn)
      this.justFell = true
    }
  }

  moving(input: InputSnapshot): boolean {
    return Math.hypot(input.moveX, input.moveZ) > 0.12
  }
}
