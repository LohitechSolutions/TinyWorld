import * as THREE from 'three'
import { addClouds, addDistantIslands, addInstancedTrees, buildIslandMesh, buildUnderside, scatterPoints } from './EnvironmentBuilder'
import { SeededRandom } from './math'
import { ResourcePool } from './resources'
import { createHeightSampler } from './terrain'
import { verdantIsle } from '../worlds/verdantIsle'

export class MenuScene {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
  pool = new ResourcePool()
  clock = new THREE.Clock()
  raf = 0
  disposed = false
  reduced = false
  onResize: () => void
  canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, reducedMotion: boolean) {
    this.canvas = canvas
    this.reduced = reducedMotion
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setClearColor('#8bd9f5', 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene.background = new THREE.Color('#8bd9f5')
    this.scene.fog = new THREE.Fog('#b9e7f6', 18, 70)
    const sampler = createHeightSampler({
      ...verdantIsle.island!,
      radius: 7.4,
      center: { x: 0, z: 0 },
      baseHeight: 1.4,
    })
    const land = buildIslandMesh(sampler, this.pool, verdantIsle.theme, 'medium')
    const under = buildUnderside(sampler, this.pool, verdantIsle.theme)
    const rng = new SeededRandom(3)
    this.scene.add(land, under)
    addInstancedTrees(this.scene, this.pool, scatterPoints(sampler, 16, rng, [{ x: 0, z: 0, r: 1.5 }]), verdantIsle.theme, rng)
    addDistantIslands(this.scene, this.pool, verdantIsle.theme, rng)
    addClouds(this.scene, this.pool, rng)
    this.scene.add(new THREE.HemisphereLight('#c8efff', '#4c9b68', 0.8))
    const sun = new THREE.DirectionalLight('#ffe0a3', 1.3)
    sun.position.set(-8, 14, 6)
    this.scene.add(sun)
    this.camera.position.set(14, 8.4, 16)
    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.resize()
    this.start()
  }

  start(): void {
    const loop = () => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(loop)
      const t = this.clock.getElapsedTime()
      const speed = this.reduced ? 0.03 : 0.12
      this.camera.position.x = Math.cos(t * speed) * 15.5
      this.camera.position.z = Math.sin(t * speed) * 15.5
      this.camera.position.y = 7.8 + Math.sin(t * 0.22) * 0.35
      this.camera.lookAt(0, 0.45, 0)
      this.renderer.render(this.scene, this.camera)
    }
    this.raf = requestAnimationFrame(loop)
  }

  resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth
    const height = this.canvas.clientHeight || window.innerHeight
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    this.pool.dispose()
    this.renderer.dispose()
  }
}
