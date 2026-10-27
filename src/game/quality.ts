import type { QualityLevel } from './types'

export type QualityProfile = {
  pixelRatioCap: number
  shadows: boolean
  shadowMap: number
  vegetation: number
  pollen: number
  antialias: boolean
  exposure: number
  waterWaves: boolean
  extraDecor: boolean
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  low: {
    pixelRatioCap: 1,
    shadows: false,
    shadowMap: 512,
    vegetation: 0.42,
    pollen: 24,
    antialias: false,
    exposure: 0.98,
    waterWaves: false,
    extraDecor: false,
  },
  medium: {
    pixelRatioCap: 1.25,
    shadows: true,
    shadowMap: 1024,
    vegetation: 0.75,
    pollen: 56,
    antialias: true,
    exposure: 1.06,
    waterWaves: true,
    extraDecor: true,
  },
  high: {
    pixelRatioCap: 1.75,
    shadows: true,
    shadowMap: 2048,
    vegetation: 1,
    pollen: 88,
    antialias: true,
    exposure: 1.08,
    waterWaves: true,
    extraDecor: true,
  },
}

export function qualityProfile(level: QualityLevel): QualityProfile {
  return QUALITY_PROFILES[level] ?? QUALITY_PROFILES.medium
}
