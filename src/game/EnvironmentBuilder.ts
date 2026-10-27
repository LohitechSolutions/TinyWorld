import * as THREE from 'three'
import { boxFromCenter } from './collision'
import type { Collider } from './collision'
import { fbm, hexToRgb, SeededRandom } from './math'
import { enableShadows, type ResourcePool } from './resources'
import type { HeightSampler } from './terrain'
import type { QualityLevel, Vec3, WorldTheme } from './types'

export function buildIslandMesh(sampler: HeightSampler, pool: ResourcePool, theme: WorldTheme, quality: QualityLevel): THREE.Mesh {
  const res = quality === 'low' ? 48 : quality === 'medium' ? 70 : 90
  const reach = sampler.params.radius * 1.2
  const positions: number[] = []
  const colors: number[] = []
  const valid: boolean[] = []

  for (let iz = 0; iz <= res; iz += 1) {
    for (let ix = 0; ix <= res; ix += 1) {
      const x = sampler.params.center.x + (ix / res - 0.5) * 2 * reach
      const z = sampler.params.center.z + (iz / res - 0.5) * 2 * reach
      const h = sampler.heightAt(x, z)
      const ok = h !== null
      valid.push(ok)
      positions.push(x, ok ? h : -1, z)
      const grass = hexToRgb(theme.grass)
      const dark = hexToRgb(theme.grassDark)
      const dirt = hexToRgb(theme.dirt)
      const rock = hexToRgb(theme.rock)
      const n = fbm(x * 0.18, z * 0.18)
      let r = grass.r
      let g = grass.g
      let b = grass.b
      if (ok && h !== null) {
        const hx = sampler.heightAt(x + 0.35, z)
        const hz = sampler.heightAt(x, z + 0.35)
        const slope = hx !== null && hz !== null ? Math.hypot(hx - h, hz - h) / 0.35 : 0
        if (slope > 0.85) {
          r = rock.r
          g = rock.g
          b = rock.b
        } else if (slope > 0.45) {
          r = dirt.r * 0.65 + grass.r * 0.35
          g = dirt.g * 0.65 + grass.g * 0.35
          b = dirt.b * 0.65 + grass.b * 0.35
        } else {
          const mix = n
          r = grass.r * (1 - mix * 0.35) + dark.r * mix * 0.35
          g = grass.g * (1 - mix * 0.35) + dark.g * mix * 0.35
          b = grass.b * (1 - mix * 0.35) + dark.b * mix * 0.35
        }
      } else {
        r = rock.r
        g = rock.g
        b = rock.b
      }
      colors.push(r, g, b)
    }
  }

  const indices: number[] = []
  const col = res + 1
  for (let iz = 0; iz < res; iz += 1) {
    for (let ix = 0; ix < res; ix += 1) {
      const a = iz * col + ix
      const b = a + 1
      const c = a + col
      const d = c + 1
      if (valid[a] && valid[b] && valid[c]) indices.push(a, c, b)
      if (valid[b] && valid[c] && valid[d]) indices.push(b, c, d)
    }
  }

  const geometry = pool.geo(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = pool.mat(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: false,
    }),
  )
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = true
  return mesh
}

export function buildUnderside(sampler: HeightSampler, pool: ResourcePool, theme: WorldTheme): THREE.Group {
  const group = new THREE.Group()
  const cx = sampler.params.center.x
  const cz = sampler.params.center.z
  const depth = 9.2
  const cone = new THREE.Mesh(
    pool.geo(new THREE.ConeGeometry(sampler.params.radius * 0.82, depth, 48, 4, true)),
    pool.std(theme.rock, { roughness: 0.94, flatShading: true }),
  )
  cone.position.set(cx, -depth * 0.36, cz)
  cone.rotation.x = Math.PI
  cone.castShadow = true
  group.add(cone)
  const ring = new THREE.Mesh(
    pool.geo(new THREE.TorusGeometry(sampler.params.radius * 0.62, 0.55, 6, 18)),
    pool.std(theme.dirt, { roughness: 0.95, flatShading: true }),
  )
  ring.position.set(cx, -1.1, cz)
  ring.rotation.x = Math.PI / 2
  group.add(ring)
  return group
}

export function addDistantIslands(parent: THREE.Object3D, pool: ResourcePool, theme: WorldTheme, rng: SeededRandom): void {
  for (let i = 0; i < 6; i += 1) {
    const island = new THREE.Group()
    const top = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(1.8 + rng.next(), 2.4 + rng.next(), 0.45, 7)), pool.std(theme.grass))
    const rock = new THREE.Mesh(pool.geo(new THREE.ConeGeometry(1.7, 3.2, 6)), pool.std(theme.rock, { flatShading: true }))
    rock.rotation.x = Math.PI
    rock.position.y = -1.6
    const tree = new THREE.Mesh(pool.geo(new THREE.ConeGeometry(0.55, 1.3, 6)), pool.std(theme.grassDark))
    tree.position.y = 0.8
    island.add(top, rock, tree)
    const angle = rng.range(0, Math.PI * 2)
    const dist = rng.range(48, 78)
    island.position.set(Math.cos(angle) * dist, rng.range(2, 14), Math.sin(angle) * dist)
    island.scale.setScalar(rng.range(1.1, 2.4))
    parent.add(island)
  }
}

export function addClouds(parent: THREE.Object3D, pool: ResourcePool, rng: SeededRandom, color = '#f4fbff'): THREE.Group {
  const group = new THREE.Group()
  const mat = pool.std(color, { transparent: true, opacity: 0.72, roughness: 1, depthWrite: false })
  const geo = pool.geo(new THREE.SphereGeometry(1, 8, 6))
  for (let i = 0; i < 14; i += 1) {
    const puff = new THREE.Group()
    for (let k = 0; k < 3; k += 1) {
      const mesh = new THREE.Mesh(geo, mat)
      mesh.scale.set(rng.range(2.2, 4.2), rng.range(0.7, 1.3), rng.range(1.8, 3.2))
      mesh.position.set(rng.range(-1.4, 1.4), rng.range(-0.2, 0.3), rng.range(-1, 1))
      puff.add(mesh)
    }
    puff.position.set(rng.range(-40, 40), rng.range(-10, 18), rng.range(-40, 40))
    puff.userData.drift = rng.range(-0.12, 0.12)
    group.add(puff)
  }
  parent.add(group)
  return group
}

export function scatterPoints(
  sampler: HeightSampler,
  count: number,
  rng: SeededRandom,
  avoid: { x: number; z: number; r: number }[],
  radiusScale = 0.84,
): Vec3[] {
  const points: Vec3[] = []
  let tries = 0
  while (points.length < count && tries < count * 24) {
    tries += 1
    const angle = rng.range(0, Math.PI * 2)
    const radius = Math.sqrt(rng.next()) * sampler.params.radius * radiusScale
    const x = sampler.params.center.x + Math.cos(angle) * radius
    const z = sampler.params.center.z + Math.sin(angle) * radius
    const y = sampler.heightAt(x, z)
    if (y === null) continue
    const blocked = avoid.some((zone) => Math.hypot(x - zone.x, z - zone.z) < zone.r)
    if (blocked) continue
    const hx = sampler.heightAt(x + 0.3, z)
    const hz = sampler.heightAt(x, z + 0.3)
    if (hx === null || hz === null) continue
    if (Math.hypot(hx - y, hz - y) > 0.28) continue
    points.push({ x, y, z })
  }
  return points
}

export function addInstancedTrees(
  parent: THREE.Object3D,
  pool: ResourcePool,
  points: Vec3[],
  theme: WorldTheme,
  rng: SeededRandom,
): THREE.Object3D[] {
  if (points.length === 0) return []
  const trunkGeo = pool.geo(new THREE.CylinderGeometry(0.09, 0.16, 1.15, 6))
  const leafGeo = pool.geo(new THREE.IcosahedronGeometry(0.72, 0))
  const pineGeo = pool.geo(new THREE.ConeGeometry(0.62, 1.55, 7))
  const trunkMat = pool.std('#6b442c', { roughness: 0.9, flatShading: true })
  const leafMat = pool.std(theme.grassDark, { roughness: 0.68, flatShading: true })
  const leafMat2 = pool.std(theme.grass, { roughness: 0.64, flatShading: true })
  const oaks = points.filter((_, index) => index % 3 !== 0)
  const pines = points.filter((_, index) => index % 3 === 0)
  const blockers: THREE.Object3D[] = []
  const dummy = new THREE.Object3D()

  if (oaks.length) {
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, oaks.length)
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, oaks.length)
    const leaves2 = new THREE.InstancedMesh(leafGeo, leafMat2, oaks.length)
    oaks.forEach((point, index) => {
      const scale = rng.range(0.95, 1.65)
      dummy.position.set(point.x, point.y + 0.55 * scale, point.z)
      dummy.rotation.y = rng.range(0, Math.PI * 2)
      dummy.scale.set(scale, scale * rng.range(1, 1.22), scale)
      dummy.updateMatrix()
      trunks.setMatrixAt(index, dummy.matrix)
      dummy.position.set(point.x, point.y + 1.28 * scale, point.z)
      dummy.scale.set(scale * 1.18, scale * 0.95, scale * 1.18)
      dummy.updateMatrix()
      leaves.setMatrixAt(index, dummy.matrix)
      dummy.position.set(point.x + 0.16 * scale, point.y + 1.58 * scale, point.z - 0.08 * scale)
      dummy.scale.set(scale * 0.72, scale * 0.68, scale * 0.72)
      dummy.updateMatrix()
      leaves2.setMatrixAt(index, dummy.matrix)
    })
    trunks.castShadow = true
    leaves.castShadow = true
    leaves2.castShadow = true
    parent.add(trunks, leaves, leaves2)
    blockers.push(trunks, leaves)
  }

  if (pines.length) {
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, pines.length)
    const tops = new THREE.InstancedMesh(pineGeo, leafMat, pines.length)
    pines.forEach((point, index) => {
      const scale = rng.range(0.9, 1.45)
      dummy.position.set(point.x, point.y + 0.5 * scale, point.z)
      dummy.rotation.set(0, rng.range(0, Math.PI), 0)
      dummy.scale.set(scale * 0.7, scale, scale * 0.7)
      dummy.updateMatrix()
      trunks.setMatrixAt(index, dummy.matrix)
      dummy.position.set(point.x, point.y + 1.35 * scale, point.z)
      dummy.scale.set(scale, scale * 1.1, scale)
      dummy.updateMatrix()
      tops.setMatrixAt(index, dummy.matrix)
    })
    trunks.castShadow = true
    tops.castShadow = true
    parent.add(trunks, tops)
    blockers.push(tops)
  }
  return blockers
}

export function addInstancedRocks(parent: THREE.Object3D, pool: ResourcePool, points: Vec3[], theme: WorldTheme, rng: SeededRandom): void {
  if (points.length === 0) return
  const geo = pool.geo(new THREE.IcosahedronGeometry(0.35, 0))
  const mat = pool.std(theme.rock, { flatShading: true, roughness: 0.95 })
  const mesh = new THREE.InstancedMesh(geo, mat, points.length)
  const dummy = new THREE.Object3D()
  points.forEach((point, index) => {
    dummy.position.set(point.x, point.y + 0.1, point.z)
    dummy.rotation.set(rng.range(0, 1), rng.range(0, Math.PI), rng.range(0, 1))
    dummy.scale.set(rng.range(0.6, 1.6), rng.range(0.4, 1.1), rng.range(0.6, 1.5))
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
}

export function addInstancedFlowers(parent: THREE.Object3D, pool: ResourcePool, points: Vec3[], rng: SeededRandom): void {
  if (points.length === 0) return
  const geo = pool.geo(new THREE.SphereGeometry(0.07, 6, 5))
  const colors = [0xff8fb3, 0xffe08a, 0xc9a6ff, 0x9be7ff, 0xffb38a]
  const mesh = new THREE.InstancedMesh(geo, pool.std('#ffffff'), points.length)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  points.forEach((point, index) => {
    dummy.position.set(point.x, point.y + 0.12, point.z)
    dummy.scale.setScalar(rng.range(0.7, 1.3))
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
    mesh.setColorAt(index, color.setHex(colors[index % colors.length]))
  })
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.userData.ignoreCamera = true
  parent.add(mesh)
}

export function addGrass(parent: THREE.Object3D, pool: ResourcePool, points: Vec3[], theme: WorldTheme): void {
  if (points.length === 0) return
  const geo = pool.geo(new THREE.ConeGeometry(0.05, 0.28, 4))
  const mat = pool.std(theme.grass, { flatShading: true })
  const mesh = new THREE.InstancedMesh(geo, mat, points.length)
  const dummy = new THREE.Object3D()
  points.forEach((point, index) => {
    dummy.position.set(point.x, point.y + 0.12, point.z)
    dummy.rotation.y = index * 0.7
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  mesh.userData.ignoreCamera = true
  parent.add(mesh)
}

export function makeCrystal(pool: ResourcePool, color: string, scale = 1): THREE.Group {
  const group = new THREE.Group()
  const mat = pool.std(color, {
    roughness: 0.14,
    metalness: 0.22,
    emissive: color,
    emissiveIntensity: 0.48,
    transparent: true,
    opacity: 0.96,
  })
  const core = new THREE.Mesh(pool.geo(new THREE.OctahedronGeometry(0.3 * scale, 0)), mat)
  core.castShadow = true
  const shard = new THREE.Mesh(pool.geo(new THREE.OctahedronGeometry(0.16 * scale, 0)), mat)
  shard.position.set(0.14 * scale, 0.08 * scale, 0)
  shard.rotation.z = 0.4
  const shard2 = new THREE.Mesh(pool.geo(new THREE.OctahedronGeometry(0.11 * scale, 0)), mat)
  shard2.position.set(-0.12 * scale, -0.04 * scale, 0.06 * scale)
  shard2.rotation.z = -0.5
  const inner = new THREE.Mesh(
    pool.geo(new THREE.OctahedronGeometry(0.12 * scale, 0)),
    pool.mat(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })),
  )
  const halo = new THREE.Mesh(
    pool.geo(new THREE.SphereGeometry(0.38 * scale, 10, 8)),
    pool.mat(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, depthWrite: false })),
  )
  halo.userData.ignoreCamera = true
  group.add(core, shard, shard2, inner, halo)
  group.userData.ignoreCamera = true
  return group
}

export function makeArtifact(pool: ResourcePool, color: string, name: string): THREE.Group {
  const group = new THREE.Group()
  const metal = pool.std(color, { roughness: 0.28, metalness: 0.55, emissive: color, emissiveIntensity: 0.32 })
  if (name.includes('Disc')) {
    const disc = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 16)), metal)
    const rim = new THREE.Mesh(pool.geo(new THREE.TorusGeometry(0.34, 0.03, 8, 18)), metal)
    rim.rotation.x = Math.PI / 2
    group.add(disc, rim)
  } else if (name.includes('Wing')) {
    const hub = new THREE.Mesh(pool.geo(new THREE.SphereGeometry(0.1, 10, 8)), metal)
    const wing = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.72, 0.06, 0.22)), metal)
    wing.rotation.z = 0.18
    group.add(hub, wing)
  } else {
    const spiral = new THREE.Mesh(pool.geo(new THREE.TorusGeometry(0.22, 0.045, 8, 16)), metal)
    spiral.rotation.x = 0.7
    const core = new THREE.Mesh(pool.geo(new THREE.OctahedronGeometry(0.14, 0)), metal)
    group.add(spiral, core)
  }
  group.userData.ignoreCamera = true
  return group
}

export function makeSignPost(pool: ResourcePool, accent: string): THREE.Group {
  const group = new THREE.Group()
  const post = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.05, 0.06, 1.15, 6)), pool.std('#6b442c', { roughness: 0.88 }))
  post.position.y = 0.55
  const board = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.62, 0.34, 0.06)), pool.std('#c4a574', { roughness: 0.72 }))
  board.position.set(0, 1.05, 0.04)
  const rune = new THREE.Mesh(
    pool.geo(new THREE.CircleGeometry(0.08, 8)),
    pool.std(accent, { emissive: accent, emissiveIntensity: 0.35 }),
  )
  rune.position.set(0, 1.05, 0.08)
  group.add(post, board, rune)
  group.userData.ignoreCamera = true
  return group
}

export function makePortal(pool: ResourcePool, accent: string): THREE.Group {
  const group = new THREE.Group()
  const stone = pool.std('#8d8676', { roughness: 0.66, metalness: 0.14 })
  const ring = new THREE.Mesh(pool.geo(new THREE.TorusGeometry(1.38, 0.16, 10, 32)), stone)
  const inner = new THREE.Mesh(pool.geo(new THREE.TorusGeometry(1.05, 0.045, 8, 24)), pool.std(accent, { emissive: accent, emissiveIntensity: 0.28, roughness: 0.3 }))
  const pillars = [
    [-1.15, -0.15],
    [1.15, -0.15],
  ]
  for (const [x, z] of pillars) {
    const post = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.16, 0.2, 2.4, 8)), stone)
    post.position.set(x, -0.1, z)
    const cap = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.32, 0.12, 0.32)), stone)
    cap.position.set(x, 1.14, z)
    group.add(post, cap)
  }
  const glow = new THREE.Mesh(
    pool.geo(new THREE.TorusGeometry(1.16, 0.07, 8, 28)),
    pool.mat(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.32 })),
  )
  const veil = new THREE.Mesh(
    pool.geo(new THREE.CircleGeometry(1.16, 28)),
    pool.mat(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16, side: THREE.DoubleSide })),
  )
  const base = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(1.55, 1.75, 0.26, 12)), stone)
  base.position.y = -1.22
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2
    const rune = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.16, 0.08, 0.08)), pool.std(accent, { emissive: accent, emissiveIntensity: 0.22 }))
    rune.position.set(Math.cos(a) * 1.42, -1.02, Math.sin(a) * 1.42)
    group.add(rune)
  }
  ring.position.y = 0.12
  inner.position.y = 0.12
  glow.position.y = 0.12
  veil.position.y = 0.12
  group.add(base, ring, inner, glow, veil)
  enableShadows(group, true, true)
  group.userData.glow = glow
  group.userData.veil = veil
  return group
}

export function makeCottage(pool: ResourcePool): THREE.Group {
  const house = new THREE.Group()
  const plaster = pool.std('#e8d3b0', { roughness: 0.84 })
  const timber = pool.std('#6b442c', { roughness: 0.86 })
  const body = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(2.25, 1.48, 1.85)), plaster)
  body.position.y = 0.74
  const beam = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(2.28, 0.08, 0.08)), timber)
  beam.position.set(0, 1.42, 0.94)
  const roof = new THREE.Mesh(pool.geo(new THREE.ConeGeometry(1.78, 1.15, 4)), pool.std('#b2574a', { flatShading: true, roughness: 0.78 }))
  roof.position.y = 2.08
  roof.rotation.y = Math.PI / 4
  const door = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.42, 0.7, 0.08)), timber)
  door.position.set(0, 0.44, 0.94)
  const window = new THREE.Mesh(
    pool.geo(new THREE.BoxGeometry(0.32, 0.32, 0.06)),
    pool.std('#ffe0a3', { emissive: '#c9a05a', emissiveIntensity: 0.28 }),
  )
  window.position.set(-0.62, 0.86, 0.94)
  const window2 = window.clone()
  window2.position.set(0.62, 0.86, 0.94)
  const box = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.42, 0.1, 0.16)), pool.std('#7a5334'))
  box.position.set(-0.62, 0.64, 1.02)
  const flower = new THREE.Mesh(pool.geo(new THREE.SphereGeometry(0.07, 6, 5)), pool.std('#ff8fb3'))
  flower.position.set(-0.62, 0.74, 1.04)
  flower.userData.ignoreCamera = true
  const chimney = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.28, 0.78, 0.28)), pool.std('#8d7462'))
  chimney.position.set(0.72, 2.16, -0.28)
  const step = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.7, 0.12, 0.4)), pool.std('#9a9384'))
  step.position.set(0, 0.06, 1.12)
  const porch = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(1.1, 0.08, 0.7)), pool.std('#8a6848', { roughness: 0.9 }))
  porch.position.set(0, 0.02, 1.28)
  house.add(body, beam, roof, door, window, window2, box, flower, chimney, step, porch)
  enableShadows(house)
  return house
}

export function makeRuins(pool: ResourcePool): THREE.Group {
  const group = new THREE.Group()
  const stone = pool.std('#9a9384', { flatShading: true, roughness: 0.9 })
  const slab = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(5.2, 0.22, 5.2)), stone)
  slab.position.y = 0.05
  group.add(slab)
  const positions = [
    [-1.8, 0, -1.6],
    [1.7, 0, -1.4],
    [-1.6, 0, 1.7],
    [1.8, 0, 1.5],
    [0.2, 0, -2],
  ]
  positions.forEach((pos, index) => {
    const h = 1.4 + (index % 3) * 0.45
    const col = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.22, 0.28, h, 7)), stone)
    col.position.set(pos[0], h / 2, pos[2])
    col.rotation.z = (index - 2) * 0.05
    group.add(col)
  })
  const archL = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(0.32, 2.1, 0.32)), stone)
  const archR = archL.clone()
  const archTop = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(1.8, 0.28, 0.32)), stone)
  archL.position.set(-0.8, 1.05, 0.2)
  archR.position.set(0.8, 1.05, 0.2)
  archTop.position.set(0, 2.15, 0.2)
  const lintel = new THREE.Mesh(pool.geo(new THREE.TorusGeometry(0.82, 0.1, 6, 12, Math.PI)), stone)
  lintel.position.set(0, 2.05, 0.2)
  lintel.rotation.z = Math.PI
  const fallen = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.2, 0.24, 2.2, 7)), stone)
  fallen.rotation.z = 1.2
  fallen.position.set(0.4, 0.28, 1.6)
  const pedestal = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.32, 0.4, 0.45, 8)), stone)
  pedestal.position.set(-0.2, 0.28, -0.4)
  const moss = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(1.4, 0.08, 0.55)), pool.std('#4c9b68', { roughness: 0.92 }))
  moss.position.set(1.4, 0.16, 0.8)
  group.add(archL, archR, archTop, lintel, fallen, pedestal, moss)
  enableShadows(group)
  return group
}

export function makeTemple(pool: ResourcePool): THREE.Group {
  const group = new THREE.Group()
  const marble = pool.std('#efe6cf', { roughness: 0.45, metalness: 0.08 })
  const gold = pool.std('#e4c36a', { roughness: 0.35, metalness: 0.35, emissive: '#8a6a20', emissiveIntensity: 0.15 })
  const floor = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(4.2, 4.4, 0.35, 10)), marble)
  floor.position.y = 0.1
  const hall = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(4.4, 2.4, 3.6)), marble)
  hall.position.y = 1.4
  const steps = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(3.2, 3.6, 0.22, 10)), marble)
  steps.position.y = 0.32
  const roof = new THREE.Mesh(pool.geo(new THREE.ConeGeometry(3.3, 1.6, 4)), gold)
  roof.rotation.y = Math.PI / 4
  roof.position.y = 3.3
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    const col = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.16, 0.18, 2.3, 8)), marble)
    col.position.set(Math.cos(a) * 3.3, 1.2, Math.sin(a) * 2.6)
    const capital = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.22, 0.16, 0.14, 8)), gold)
    capital.position.set(Math.cos(a) * 3.3, 2.38, Math.sin(a) * 2.6)
    group.add(col, capital)
  }
  const door = new THREE.Mesh(
    pool.geo(new THREE.BoxGeometry(1.1, 1.7, 0.12)),
    pool.std('#4a3a28', { roughness: 0.7, emissive: '#8a6a20', emissiveIntensity: 0.08 }),
  )
  door.position.set(0, 1.15, 1.86)
  const bannerL = new THREE.Mesh(pool.geo(new THREE.PlaneGeometry(0.45, 1.1)), gold)
  bannerL.position.set(-1.6, 1.6, 1.82)
  const bannerR = bannerL.clone()
  bannerR.position.x = 1.6
  const inner = new THREE.Mesh(
    pool.geo(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12)),
    pool.std('#e4c36a', { emissive: '#8a6a20', emissiveIntensity: 0.35 }),
  )
  inner.position.set(0, 0.36, -0.4)
  group.add(floor, steps, hall, roof, door, bannerL, bannerR, inner)
  enableShadows(group)
  return group
}

export function makeTower(pool: ResourcePool): THREE.Group {
  const group = new THREE.Group()
  const stone = pool.std('#b9b09d', { flatShading: true })
  const shaft = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.7, 0.85, 4.4, 8)), stone)
  shaft.position.y = 2.2
  const band = new THREE.Mesh(pool.geo(new THREE.TorusGeometry(0.78, 0.07, 6, 12)), pool.std('#efe6cf', { roughness: 0.5 }))
  band.rotation.x = Math.PI / 2
  band.position.y = 3.4
  const window = new THREE.Mesh(
    pool.geo(new THREE.BoxGeometry(0.28, 0.42, 0.08)),
    pool.std('#ffe0a3', { emissive: '#c9a05a', emissiveIntensity: 0.25 }),
  )
  window.position.set(0, 3.1, 0.72)
  const cap = new THREE.Mesh(pool.geo(new THREE.ConeGeometry(1, 1.1, 8)), pool.std('#7d4d3b', { flatShading: true }))
  cap.position.y = 4.9
  group.add(shaft, band, window, cap)
  enableShadows(group)
  return group
}

export function makeWater(pool: ResourcePool, size: number, color: string): THREE.Mesh {
  const geo = pool.geo(new THREE.PlaneGeometry(size, size, 18, 18))
  const mat = pool.mat(
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      roughness: 0.14,
      metalness: 0.28,
    }),
  )
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true
  return mesh
}

export function makeWaterfall(pool: ResourcePool, color: string): THREE.Group {
  const group = new THREE.Group()
  const mat = pool.mat(
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      roughness: 0.15,
      depthWrite: false,
    }),
  )
  for (let i = 0; i < 3; i += 1) {
    const sheet = new THREE.Mesh(pool.geo(new THREE.PlaneGeometry(1.3, 6.5, 1, 8)), mat)
    sheet.position.set((i - 1) * 0.28, -2.4, 0)
    sheet.rotation.y = (i - 1) * 0.08
    group.add(sheet)
  }
  const foam = new THREE.Mesh(
    pool.geo(new THREE.CircleGeometry(1.15, 12)),
    pool.mat(new THREE.MeshStandardMaterial({ color: '#d8f4ff', transparent: true, opacity: 0.35, roughness: 0.2 })),
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(0, -5.4, 0.4)
  foam.userData.ignoreCamera = true
  const lip = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(1.8, 0.22, 0.55)), pool.std('#7a6b5b', { flatShading: true }))
  lip.position.set(0, 0.7, -0.1)
  group.add(foam, lip)
  return group
}

export function makeSwitch(pool: ResourcePool, accent: string): THREE.Group {
  const group = new THREE.Group()
  const pedestal = new THREE.Mesh(pool.geo(new THREE.CylinderGeometry(0.38, 0.46, 0.55, 8)), pool.std('#8b8374', { flatShading: true }))
  const ring = new THREE.Mesh(pool.geo(new THREE.TorusGeometry(0.28, 0.03, 6, 14)), pool.std(accent, { emissive: accent, emissiveIntensity: 0.2 }))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.48
  const gem = new THREE.Mesh(
    pool.geo(new THREE.OctahedronGeometry(0.18)),
    pool.std(accent, { emissive: accent, emissiveIntensity: 0.45, roughness: 0.25 }),
  )
  gem.position.y = 0.42
  pedestal.position.y = 0.2
  group.add(pedestal, ring, gem)
  group.userData.gem = gem
  return group
}

export function makePlate(pool: ResourcePool, accent: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    pool.geo(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12)),
    pool.std(accent, { emissive: accent, emissiveIntensity: 0.2, roughness: 0.4 }),
  )
  mesh.userData.ignoreCamera = true
  return mesh
}

export function addStalactites(
  parent: THREE.Object3D,
  pool: ResourcePool,
  theme: WorldTheme,
  count: number,
  rng: SeededRandom,
): void {
  if (count <= 0) return
  const geo = pool.geo(new THREE.ConeGeometry(0.18, 1.1, 6))
  const mat = pool.std(theme.rock, { flatShading: true, roughness: 0.94 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(rng.range(-12, 12), rng.range(5.4, 7.4), rng.range(-10, 10))
    dummy.rotation.set(Math.PI, rng.range(0, Math.PI), 0)
    dummy.scale.setScalar(rng.range(0.7, 1.6))
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.castShadow = true
  parent.add(mesh)
}

export function addPathStones(parent: THREE.Object3D, pool: ResourcePool, points: { x: number; z: number; y: number }[]): void {
  const geo = pool.geo(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 6))
  const mat = pool.std('#9a9384', { roughness: 0.92, flatShading: true })
  for (const point of points) {
    const slab = new THREE.Mesh(geo, mat)
    slab.position.set(point.x, point.y + 0.03, point.z)
    slab.userData.ignoreCamera = true
    parent.add(slab)
  }
}

export function makePlatformMesh(pool: ResourcePool, size: Vec3, kind: string): THREE.Mesh {
  const colors: Record<string, string> = {
    stone: '#9b9486',
    wood: '#8a5a38',
    crystal: '#7de7ff',
    bridge: '#a06a40',
    gold: '#e6c56a',
  }
  const extras = kind === 'crystal' ? { emissive: '#2ec4d6', emissiveIntensity: 0.25 } : {}
  const mesh = new THREE.Mesh(pool.geo(new THREE.BoxGeometry(size.x, size.y, size.z)), pool.std(colors[kind] ?? '#9b9486', extras))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function addPollen(parent: THREE.Object3D, pool: ResourcePool, color: string, count: number): THREE.Points {
  const geo = pool.geo(new THREE.BufferGeometry())
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 40
    positions[i * 3 + 1] = Math.random() * 10 + 1
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = pool.mat(new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 0.65, depthWrite: false }))
  const points = new THREE.Points(geo, mat)
  parent.add(points)
  return points
}

export function colliderForObject(center: Vec3, size: Vec3, solid = true): Collider {
  const box = boxFromCenter(center, size)
  return { kind: 'box', min: box.min, max: box.max, solid }
}
