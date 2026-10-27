import * as THREE from 'three'
import { boxFromCenter, type Collider, type PlatformCollider } from './collision'
import {
  addClouds,
  addDistantIslands,
  addGrass,
  addInstancedFlowers,
  addInstancedRocks,
  addInstancedTrees,
  addPollen,
  addPathStones,
  addStalactites,
  buildIslandMesh,
  buildUnderside,
  colliderForObject,
  makeArtifact,
  makeCottage,
  makeCrystal,
  makePlate,
  makePlatformMesh,
  makePortal,
  makeRuins,
  makeSignPost,
  makeSwitch,
  makeTemple,
  makeTower,
  makeWater,
  makeWaterfall,
  scatterPoints,
} from './EnvironmentBuilder'
import { SeededRandom } from './math'
import { ResourcePool } from './resources'
import { qualityProfile } from './quality'
import { createHeightSampler, type HeightSampler } from './terrain'
import type { CollectibleDef, PuzzleDef, QualityLevel, Vec3, WorldDef, WorldProgress } from './types'

export type LiveCollectible = {
  def: CollectibleDef
  mesh: THREE.Object3D
  taken: boolean
}

export type LiveInteractable = {
  id: string
  kind: string
  position: Vec3
  radius: number
  label: string
  body?: string
  active: boolean
  puzzleId?: string
  nodeId?: string
}

export type BuiltWorld = {
  def: WorldDef
  group: THREE.Group
  pool: ResourcePool
  sampler: HeightSampler | null
  colliders: Collider[]
  blockers: THREE.Object3D[]
  collectibles: LiveCollectible[]
  interactables: LiveInteractable[]
  portalMesh: THREE.Group
  waterMeshes: THREE.Mesh[]
  clouds: THREE.Group | null
  pollen: THREE.Points | null
  hiddenByPuzzle: Map<string, THREE.Object3D>
  platformColliders: Map<string, PlatformCollider>
  rising: { mesh: THREE.Object3D; from: number; to: number; t: number }[]
  tick: (time: number, dt: number, waterWaves?: boolean) => void
  dispose: () => void
}

export function buildWorld(def: WorldDef, progress: WorldProgress, quality: QualityLevel): BuiltWorld {
  const pool = new ResourcePool()
  const group = new THREE.Group()
  const colliders: Collider[] = []
  const blockers: THREE.Object3D[] = []
  const collectibles: LiveCollectible[] = []
  const interactables: LiveInteractable[] = []
  const waterMeshes: THREE.Mesh[] = []
  const hiddenByPuzzle = new Map<string, THREE.Object3D>()
  const platformColliders = new Map<string, PlatformCollider>()
  const rng = new SeededRandom(def.island?.seed ?? 17)
  const sampler = def.island ? createHeightSampler(def.island) : null
  const profile = qualityProfile(quality)
  const vegScale = profile.vegetation

  if (sampler) {
    const land = buildIslandMesh(sampler, pool, def.theme, quality)
    const under = buildUnderside(sampler, pool, def.theme)
    group.add(land, under)
    blockers.push(land, under)
  }

  addDistantIslands(group, pool, def.theme, rng)
  const clouds = addClouds(group, pool, rng, def.id === 'sky-temple' ? '#ffe8b8' : '#f4fbff')

  const avoid = def.landmarks.map((item) => ({ x: item.position.x, z: item.position.z, r: 2.8 }))
  avoid.push({ x: def.spawn.x, z: def.spawn.z, r: 3.4 })
  for (const item of def.collectibles) avoid.push({ x: item.position.x, z: item.position.z, r: 1.6 })
  for (const item of def.interactables) avoid.push({ x: item.position.x, z: item.position.z, r: 1.8 })
  for (const puzzle of def.puzzles) {
    if (puzzle.switchPosition) avoid.push({ x: puzzle.switchPosition.x, z: puzzle.switchPosition.z, r: 1.6 })
    puzzle.nodes?.forEach((node) => avoid.push({ x: node.position.x, z: node.position.z, r: 1.5 }))
    puzzle.plates?.forEach((plate) => avoid.push({ x: plate.position.x, z: plate.position.z, r: 1.5 }))
  }

  if (sampler) {
    const treeMeshes = addInstancedTrees(group, pool, scatterPoints(sampler, Math.floor(def.scatter.trees * vegScale), rng, avoid), def.theme, rng)
    blockers.push(...treeMeshes)
    addInstancedRocks(group, pool, scatterPoints(sampler, Math.floor(def.scatter.rocks * vegScale), rng, avoid, 0.9), def.theme, rng)
    addInstancedFlowers(group, pool, scatterPoints(sampler, Math.floor(def.scatter.flowers * vegScale), rng, avoid), rng)
    addGrass(group, pool, scatterPoints(sampler, Math.floor(def.scatter.grass * vegScale), rng, avoid), def.theme)
  }

  const rising: BuiltWorld['rising'] = []
  const pollen = addPollen(group, pool, def.theme.accent, profile.pollen)
  pollen.userData.ignoreCamera = true

  for (const landmark of def.landmarks) {
    const placed = placeLandmark(landmark.kind, pool, def)
    placed.position.set(landmark.position.x, landmark.position.y, landmark.position.z)
    if (landmark.rotation) placed.rotation.y = landmark.rotation
    if (landmark.scale) placed.scale.setScalar(landmark.scale)
    group.add(placed)
    blockers.push(placed)
    if (landmark.kind === 'cottage') {
      colliders.push(colliderForObject({ ...landmark.position, y: landmark.position.y + 0.8 }, { x: 2.2, y: 1.8, z: 1.8 }))
    }
    if (landmark.kind === 'ruins' || landmark.kind === 'temple' || landmark.kind === 'tower') {
      colliders.push(
        colliderForObject({ ...landmark.position, y: landmark.position.y + 1 }, { x: 1.2, y: 2.2, z: 1.2 }),
      )
    }
    if (landmark.kind === 'pond' || landmark.kind === 'waterfall') {
      placed.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (mesh.isMesh && mesh.material && (mesh.material as THREE.MeshStandardMaterial).opacity < 0.9) {
          waterMeshes.push(mesh)
          mesh.userData.ignoreCamera = true
        }
      })
    }
  }

  for (const platform of def.platforms) {
    const mesh = makePlatformMesh(pool, platform.size, platform.kind)
    mesh.position.set(platform.position.x, platform.position.y, platform.position.z)
    const bounds = boxFromCenter(platform.position, platform.size)
    const collider: PlatformCollider = {
      kind: 'platform',
      id: platform.id,
      min: bounds.min,
      max: bounds.max,
      active: !platform.startsHidden,
    }
    platformColliders.set(platform.id, collider)
    colliders.push(collider)
    if (platform.startsHidden) {
      mesh.visible = false
      mesh.position.y -= 2.4
      hiddenByPuzzle.set(platform.id, mesh)
    }
    group.add(mesh)
    blockers.push(mesh)
  }

  const portalLandmark = def.landmarks.find((item) => item.kind === 'portal')
  const portalPos = portalLandmark?.position ?? def.interactables.find((item) => item.kind === 'portal')?.position ?? { x: 0, y: 2, z: -12 }
  const portalMesh = makePortal(pool, def.theme.accent)
  portalMesh.position.set(portalPos.x, portalPos.y + 1.3, portalPos.z)
  group.add(portalMesh)

  for (const item of def.collectibles) {
    const mesh = item.kind === 'artifact' ? makeArtifact(pool, item.color, item.name) : makeCrystal(pool, item.color, item.hidden ? 0.85 : 1)
    mesh.position.set(item.position.x, item.position.y, item.position.z)
    const taken = progress.crystals.includes(item.id)
    mesh.visible = !taken
    if (item.id === 'c-cave' && !progress.puzzles.includes('plate-cave')) {
      mesh.visible = false
    }
    group.add(mesh)
    collectibles.push({ def: item, mesh, taken })
    interactables.push({
      id: item.id,
      kind: 'collectible',
      position: item.position,
      radius: 1.35,
      label: item.name,
      active: !taken,
    })
  }

  for (const puzzle of def.puzzles) {
    addPuzzleVisuals(puzzle, group, pool, interactables, progress, def.theme.accent)
  }

  for (const item of def.interactables) {
    if (item.kind === 'sign') {
      const post = makeSignPost(pool, def.theme.accent)
      post.position.set(item.position.x, item.position.y - 0.15, item.position.z)
      group.add(post)
    }
    interactables.push({
      id: item.id,
      kind: item.kind,
      position: item.position,
      radius: item.radius ?? 1.7,
      label: item.label,
      body: item.body,
      active: true,
    })
  }

  applySolvedPuzzles(def, progress, hiddenByPuzzle, platformColliders, portalMesh)

  const caveRock = new THREE.Mesh(
    pool.geo(new THREE.IcosahedronGeometry(1.1, 0)),
    pool.std(def.theme.rock, { flatShading: true }),
  )
  caveRock.position.set(-13.6, 1.8, -1.4)
  caveRock.scale.set(1.4, 1.1, 1.1)
  group.add(caveRock)
  hiddenByPuzzle.set('cave-rock', caveRock)
  if (progress.puzzles.includes('plate-cave') || def.id !== 'verdant-isle') caveRock.visible = def.id === 'verdant-isle' ? false : true
  if (def.id === 'verdant-isle') {
    colliders.push({
      kind: 'cylinder',
      x: -13.6,
      z: -1.4,
      radius: 1.1,
      minY: 0,
      maxY: 3,
      solid: !progress.puzzles.includes('plate-cave'),
    })
  } else {
    caveRock.visible = false
  }

  if (def.id === 'verdant-isle' && sampler) {
    const path = [
      { x: 1.2, z: 12.2 },
      { x: 2.4, z: 10.6 },
      { x: 3.6, z: 8.4 },
      { x: 6.2, z: 5.8 },
      { x: 8.4, z: 3.6 },
      { x: 10.6, z: 2.2 },
      { x: 6.8, z: -4.2 },
      { x: 2.4, z: -12.6 },
      { x: 0.4, z: -18.4 },
    ]
      .map((p) => {
        const y = sampler.heightAt(p.x, p.z)
        return y === null ? null : { x: p.x, z: p.z, y }
      })
      .filter((p): p is { x: number; z: number; y: number } => p !== null)
    addPathStones(group, pool, path)
  }

  if (def.id === 'crystal-caverns') {
    const ceiling = new THREE.Mesh(
      pool.geo(new THREE.SphereGeometry(17, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.48)),
      pool.std(def.theme.rock, { side: THREE.BackSide, roughness: 0.96, flatShading: true }),
    )
    ceiling.position.y = 7.2
    group.add(ceiling)
    blockers.push(ceiling)
    if (profile.extraDecor) {
      addStalactites(group, pool, def.theme, 18, rng)
      for (const spot of [
        { x: -10.2, y: 2.8, z: 8.4 },
        { x: 9.6, y: 2.9, z: 8.8 },
        { x: -8.8, y: 2.4, z: -8.2 },
        { x: 8.4, y: 2.5, z: -8.6 },
      ]) {
        const cluster = makeCrystal(pool, spot.x < 0 ? def.theme.accent : '#9e83ff', 0.7)
        cluster.position.set(spot.x, spot.y, spot.z)
        group.add(cluster)
      }
    }
    const sheen = new THREE.Mesh(
      pool.geo(new THREE.CircleGeometry(4.4, 20)),
      pool.mat(new THREE.MeshStandardMaterial({ color: def.theme.water, transparent: true, opacity: 0.18, roughness: 0.08, metalness: 0.4 })),
    )
    sheen.rotation.x = -Math.PI / 2
    sheen.position.set(0, 1.56, 0)
    sheen.userData.ignoreCamera = true
    group.add(sheen)
  }

  if (def.id === 'sky-temple') {
    for (const step of [0, 1, 2]) {
      const riser = new THREE.Mesh(
        pool.geo(new THREE.BoxGeometry(2.4 - step * 0.2, 0.14, 0.55)),
        pool.std('#efe6cf', { roughness: 0.5 }),
      )
      riser.position.set(0, 3.58 + step * 0.14, 7.1 - step * 0.45)
      riser.userData.ignoreCamera = true
      group.add(riser)
    }
    const disc = new THREE.Mesh(
      pool.geo(new THREE.TorusGeometry(2.4, 0.08, 8, 20)),
      pool.std(def.theme.accent, { emissive: def.theme.accent, emissiveIntensity: 0.2, metalness: 0.35 }),
    )
    disc.rotation.x = Math.PI / 2
    disc.position.set(0, 3.62, -1.6)
    disc.userData.ignoreCamera = true
    group.add(disc)
  }

  const tick = (time: number, dt: number, waterWaves = true) => {
    for (const item of collectibles) {
      if (item.taken || !item.mesh.visible) continue
      item.mesh.rotation.y += dt * 1.4
      item.mesh.position.y = item.def.position.y + Math.sin(time * 2 + item.def.position.x) * 0.12
    }
    const glow = portalMesh.userData.glow as THREE.Mesh | undefined
    const veil = portalMesh.userData.veil as THREE.Mesh | undefined
    if (glow && veil) {
      const ready = portalMesh.userData.ready === true
      const pulse = 0.2 + Math.sin(time * 2.2) * 0.08 + (ready ? 0.35 : 0)
      ;(glow.material as THREE.MeshBasicMaterial).opacity = pulse
      ;(veil.material as THREE.MeshBasicMaterial).opacity = ready ? 0.38 + Math.sin(time * 3) * 0.08 : 0.1
      portalMesh.rotation.y += dt * (ready ? 0.35 : 0.08)
    }
    if (waterWaves) {
      for (const water of waterMeshes) {
        const pos = water.geometry.getAttribute('position')
        if (pos && water.geometry instanceof THREE.PlaneGeometry) {
          for (let i = 0; i < pos.count; i += 1) {
            const x = pos.getX(i)
            const z = pos.getY(i)
            pos.setZ(i, Math.sin(time * 1.6 + x * 1.4 + z) * 0.06)
          }
          pos.needsUpdate = true
        }
      }
    }
    if (clouds) {
      clouds.children.forEach((cloud) => {
        cloud.position.x += (cloud.userData.drift ?? 0.05) * dt
        if (cloud.position.x > 50) cloud.position.x = -50
      })
    }
    if (pollen) {
      pollen.rotation.y += dt * 0.05
      pollen.position.y = 1 + Math.sin(time * 0.3) * 0.2
    }
    for (const item of rising) {
      item.t = Math.min(1, item.t + dt * 1.6)
      const k = item.t * item.t * (3 - 2 * item.t)
      item.mesh.position.y = item.from + (item.to - item.from) * k
    }
  }

  return {
    def,
    group,
    pool,
    sampler,
    colliders,
    blockers,
    collectibles,
    interactables,
    portalMesh,
    waterMeshes,
    clouds,
    pollen,
    hiddenByPuzzle,
    platformColliders,
    rising,
    tick,
    dispose: () => {
      group.removeFromParent()
      pool.dispose()
    },
  }
}

function placeLandmark(kind: string, pool: ResourcePool, def: WorldDef): THREE.Group {
  if (kind === 'cottage') return makeCottage(pool)
  if (kind === 'ruins') return makeRuins(pool)
  if (kind === 'temple') return makeTemple(pool)
  if (kind === 'tower') return makeTower(pool)
  if (kind === 'portal') return new THREE.Group()
  if (kind === 'pond') {
    const group = new THREE.Group()
    const water = makeWater(pool, 6.4, def.theme.water)
    group.add(water)
    return group
  }
  if (kind === 'waterfall') {
    const group = new THREE.Group()
    const water = makeWater(pool, 4.6, def.theme.water)
    water.position.set(0.8, 0, 1.1)
    const fall = makeWaterfall(pool, def.theme.water)
    fall.position.set(-1.6, 0.2, 0.2)
    fall.rotation.y = Math.PI / 2
    group.add(water, fall)
    return group
  }
  if (kind === 'crystal-cluster') {
    const group = new THREE.Group()
    for (let i = 0; i < 5; i += 1) {
      const shard = makeCrystal(pool, i % 2 ? def.theme.accent : '#9e83ff', 0.55 + i * 0.12)
      shard.position.set(Math.cos(i) * 0.6, 0.2, Math.sin(i) * 0.6)
      group.add(shard)
    }
    return group
  }
  if (kind === 'columns') {
    const group = new THREE.Group()
    for (let i = 0; i < 4; i += 1) {
      const col = new THREE.Mesh(
        pool.geo(new THREE.CylinderGeometry(0.18, 0.22, 2.6, 8)),
        pool.std('#efe6cf', { roughness: 0.5 }),
      )
      col.position.set((i % 2 === 0 ? -1.4 : 1.4), 1.3, i < 2 ? -1.2 : 1.2)
      group.add(col)
    }
    return group
  }
  if (kind === 'cave-wall') {
    const group = new THREE.Group()
    const wall = new THREE.Mesh(
      pool.geo(new THREE.CylinderGeometry(16, 16, 8, 20, 1, true, 0, Math.PI * 1.2)),
      pool.std(def.theme.rock, { side: THREE.DoubleSide, flatShading: true, roughness: 0.95 }),
    )
    wall.position.y = 3
    group.add(wall)
    return group
  }
  if (kind === 'trees') {
    const group = new THREE.Group()
    const tree = makeCrystal(pool, def.theme.grassDark, 0.01)
    tree.visible = false
    group.add(tree)
    return group
  }
  return new THREE.Group()
}

function addPuzzleVisuals(
  puzzle: PuzzleDef,
  group: THREE.Group,
  pool: ResourcePool,
  interactables: LiveInteractable[],
  progress: WorldProgress,
  accent: string,
): void {
  const solved = progress.puzzles.includes(puzzle.id)
  if (puzzle.kind === 'switch' && puzzle.switchPosition) {
    const mesh = makeSwitch(pool, accent)
    mesh.position.set(puzzle.switchPosition.x, puzzle.switchPosition.y, puzzle.switchPosition.z)
    mesh.userData.solved = solved
    if (solved) (mesh.userData.gem as THREE.Mesh).scale.setScalar(1.25)
    group.add(mesh)
    interactables.push({
      id: puzzle.id,
      kind: 'switch',
      position: puzzle.switchPosition,
      radius: 1.5,
      label: solved ? 'The switch is awake' : puzzle.title,
      puzzleId: puzzle.id,
      active: !solved,
    })
  }
  if (puzzle.kind === 'plates' && puzzle.plates) {
    for (const plate of puzzle.plates) {
      const mesh = makePlate(pool, accent)
      mesh.position.set(plate.position.x, plate.position.y, plate.position.z)
      mesh.userData.plateId = plate.id
      group.add(mesh)
      interactables.push({
        id: plate.id,
        kind: 'plate',
        position: plate.position,
        radius: plate.radius,
        label: puzzle.title,
        puzzleId: puzzle.id,
        active: !solved,
      })
    }
  }
  if (puzzle.kind === 'sequence' && puzzle.nodes) {
    puzzle.nodes.forEach((node, index) => {
      const mesh = makeSwitch(pool, index % 2 ? '#9e83ff' : accent)
      mesh.position.set(node.position.x, node.position.y, node.position.z)
      mesh.userData.nodeId = node.id
      group.add(mesh)
      interactables.push({
        id: node.id,
        kind: 'node',
        position: node.position,
        radius: 1.4,
        label: `${puzzle.title} (${index + 1})`,
        puzzleId: puzzle.id,
        nodeId: node.id,
        active: !solved,
      })
    })
  }
}

export function applySolvedPuzzles(
  def: WorldDef,
  progress: WorldProgress,
  hiddenByPuzzle: Map<string, THREE.Object3D>,
  platformColliders: Map<string, PlatformCollider>,
  portalMesh: THREE.Group,
): void {
  for (const puzzle of def.puzzles) {
    if (!progress.puzzles.includes(puzzle.id) || !puzzle.targetId) continue
    const mesh = hiddenByPuzzle.get(puzzle.targetId)
    if (mesh) {
      mesh.visible = true
      mesh.position.y += 2.4
    }
    const platform = platformColliders.get(puzzle.targetId)
    if (platform) platform.active = true
  }
  portalMesh.userData.ready = progress.portalReady || progress.completed
}

export function raiseTarget(world: BuiltWorld, targetId: string): void {
  const mesh = world.hiddenByPuzzle.get(targetId)
  if (mesh) {
    mesh.visible = true
    const from = mesh.position.y
    const to = from + 2.4
    world.rising.push({ mesh, from, to, t: 0 })
  }
  const platform = world.platformColliders.get(targetId)
  if (platform) platform.active = true
  const rock = world.hiddenByPuzzle.get('cave-rock')
  if (targetId === 'waterfall-cave' && rock) {
    rock.visible = false
  }
  for (const collider of world.colliders) {
    if (collider.kind === 'cylinder' && Math.abs(collider.x + 13.6) < 0.2) collider.solid = false
  }
}
