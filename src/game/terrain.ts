import { fbm, noise2, smoothstep } from './math'
import type { IslandParams } from './types'

export type HeightSampler = {
  heightAt: (x: number, z: number) => number | null
  radiusAt: (angle: number) => number
  contains: (x: number, z: number) => boolean
  params: IslandParams
}

export function createHeightSampler(params: IslandParams): HeightSampler {
  const radiusAt = (angle: number): number => {
    const wobble =
      Math.sin(angle * 5 + 1.2) * 0.1 +
      Math.sin(angle * 3 + 0.4) * 0.07 +
      (noise2(Math.cos(angle) * 2.2, Math.sin(angle) * 2.2) - 0.5) * params.edgeNoise
    return params.radius * (1 + wobble)
  }

  const heightAt = (x: number, z: number): number | null => {
    const dx = x - params.center.x
    const dz = z - params.center.z
    const r = Math.hypot(dx, dz)
    const angle = Math.atan2(dz, dx)
    const edge = radiusAt(angle)
    if (r > edge) return null
    const t = r / edge
    const rim = 1 - smoothstep(0.78, 1, t)
    if (rim <= 0.002) return null

    let h = params.baseHeight
    h += (fbm(x * 0.08 + params.seed, z * 0.08) - 0.5) * 0.55
    for (const hill of params.hills) {
      const d = Math.hypot(x - hill.x, z - hill.z)
      h += hill.h * Math.exp(-(d * d) / (hill.spread * hill.spread))
    }
    if (params.bowl) {
      h -= params.bowl * (1 - t) * (1 - t)
    }
    for (const flat of params.flats) {
      const d = Math.hypot(x - flat.x, z - flat.z)
      if (d < flat.radius) {
        const k = 1 - smoothstep(flat.radius * 0.55, flat.radius, d)
        h = h * (1 - k) + flat.height * k
      }
    }
    return h * rim
  }

  return {
    heightAt,
    radiusAt,
    contains: (x, z) => heightAt(x, z) !== null,
    params,
  }
}
