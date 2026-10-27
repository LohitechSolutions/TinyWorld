import * as THREE from 'three'
import { allWorldsComplete, canReadyPortal, computeObjective, crystalTotals } from './progression'
import { AudioManager } from './AudioManager'
import { InputManager } from './InputManager'
import { PlayerController } from './PlayerController'
import { PlayerMesh } from './PlayerMesh'
import { ThirdPersonCamera } from './ThirdPersonCamera'
import { raiseTarget, buildWorld, type BuiltWorld } from './WorldBuilder'
import { shortestAngle } from './math'
import { qualityProfile } from './quality'
import type { GameEvent, SaveData, Settings, Vec3, WorldDef } from './types'

export type EngineInspect = {
  x: number
  y: number
  z: number
  yaw: number
  cameraYaw: number
  onGround: boolean
  worldId: string | null
  crystals: string[]
  puzzles: string[]
  portalReady: boolean
  completed: boolean
  fps: number
  quality: string
  secrets: string[]
  cameraDist: number
  cameraBlocked: boolean
}

export class GameEngine {
  canvas: HTMLCanvasElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  clock = new THREE.Clock()
  input = new InputManager()
  audio: AudioManager
  player = new PlayerController()
  explorer: PlayerMesh
  follow = new ThirdPersonCamera()
  world: BuiltWorld | null = null
  settings: Settings
  paused = false
  disposed = false
  raf = 0
  onEvent: (event: GameEvent) => void
  sequence: Record<string, string[]> = {}
  plates: Record<string, Set<string>> = {}
  checkpoint: Vec3
  completeFired = false
  lastPrompt: string | null = null
  lastObjective = ''
  playerVec = new THREE.Vector3()
  hemi: THREE.HemisphereLight | null = null
  sun: THREE.DirectionalLight | null = null
  fill: THREE.PointLight | null = null
  onResize: () => void
  onVisibility: () => void
  save: SaveData
  def: WorldDef | null = null
  frames = 0
  fpsClock = 0
  fps = 0
  bursts: { mesh: THREE.Mesh; age: number }[] = []
  stepClock = 0
  lastYaw = 0

  constructor(canvas: HTMLCanvasElement, settings: Settings, save: SaveData, onEvent: (event: GameEvent) => void) {
    this.canvas = canvas
    this.settings = settings
    this.save = save
    this.onEvent = onEvent
    this.audio = new AudioManager(settings)
    this.checkpoint = { x: 0, y: 2, z: 0 }

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) throw new Error('WebGL is unavailable in this browser.')

    const profile = qualityProfile(settings.quality)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: profile.antialias,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor('#8bd9f5')
    this.renderer.shadowMap.enabled = settings.quality !== 'low'
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220)
    this.explorer = new PlayerMesh()
    this.scene.add(this.explorer.group)

    this.onResize = () => this.resize()
    this.onVisibility = () => {
      if (document.hidden) this.clock.getDelta()
    }
    window.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.input.attach(canvas)
    this.resize()
  }

  loadWorld(def: WorldDef, save: SaveData): void {
    this.clearWorld()
    this.def = def
    this.save = structuredClone(save) as SaveData
    this.completeFired = save.worlds[def.id].completed
    this.sequence = {}
    this.plates = {}
    const progress = save.worlds[def.id]
    this.world = buildWorld(def, progress, this.settings.quality)
    if (import.meta.env.DEV) {
      ;(window as unknown as { __TW?: { inspect: () => EngineInspect } }).__TW = {
        inspect: () => this.inspect(),
      }
    }
    this.scene.add(this.world.group)
    this.setupLighting(def)
    const spawn = progress.checkpoint ?? def.spawn
    this.checkpoint = { ...spawn }
    this.player.reset(spawn)
    this.playerVec.set(spawn.x, spawn.y, spawn.z)
    if (def.id === 'sky-temple') {
      this.follow.yaw = 0.04
      this.follow.pitch = 0.34
      this.follow.distance = 10.4
      this.follow.lookBias.set(0, 0.45, -2.2)
    } else if (def.id === 'verdant-isle') {
      this.follow.yaw = 0.85
      this.follow.pitch = 0.38
      this.follow.distance = 9.2
      this.follow.lookBias.set(0, 0, 0)
    } else {
      this.follow.yaw = 0.2
      this.follow.pitch = 0.36
      this.follow.distance = 9.2
      this.follow.lookBias.set(0, 0, 0)
    }
    this.follow.snapTo(this.playerVec)
    this.explorer.group.position.copy(this.playerVec)
    this.lastYaw = this.player.yaw
    this.audio.setWorld(def.id)
    this.lastObjective = ''
    this.emitObjective()
    this.onEvent({ type: 'ready' })
  }

  setupLighting(def: WorldDef): void {
    this.scene.background = new THREE.Color(def.theme.sky)
    this.scene.fog = new THREE.Fog(def.theme.fog, def.theme.fogNear, def.theme.fogFar)
    this.renderer.setClearColor(def.theme.sky)
    if (this.hemi) this.scene.remove(this.hemi)
    if (this.sun) this.scene.remove(this.sun)
    if (this.fill) this.scene.remove(this.fill)
    this.hemi = new THREE.HemisphereLight(def.theme.hemiSky, def.theme.hemiGround, 0.72)
    this.sun = new THREE.DirectionalLight(def.theme.sunColor, def.theme.sunIntensity)
    this.sun.position.set(def.theme.sunDir.x * 40, def.theme.sunDir.y * 40, def.theme.sunDir.z * 40)
    const profile = qualityProfile(this.settings.quality)
    this.sun.castShadow = profile.shadows
    this.sun.shadow.mapSize.set(profile.shadowMap, profile.shadowMap)
    this.sun.shadow.camera.near = 2
    this.sun.shadow.camera.far = 90
    this.sun.shadow.camera.left = -28
    this.sun.shadow.camera.right = 28
    this.sun.shadow.camera.top = 28
    this.sun.shadow.camera.bottom = -28
    this.sun.shadow.bias = -0.0008
    this.fill = new THREE.PointLight(def.theme.accent, def.id === 'crystal-caverns' ? 3.2 : 0.85, 20)
    this.fill.position.set(0, 5, 0)
    this.scene.add(this.hemi, this.sun, this.fill)
    this.renderer.shadowMap.enabled = qualityProfile(this.settings.quality).shadows
    this.resize()
  }

  start(): void {
    if (this.raf) return
    this.clock.start()
    const loop = () => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(loop)
      this.tick()
    }
    this.raf = requestAnimationFrame(loop)
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    this.input.enabled = !paused
    this.audio.setPaused(paused)
  }

  applySettings(settings: Settings): void {
    this.settings = settings
    this.audio.applySettings(settings)
    const profile = qualityProfile(settings.quality)
    if (this.sun) this.sun.castShadow = profile.shadows
    this.renderer.shadowMap.enabled = profile.shadows
    this.resize()
  }

  restartCheckpoint(): void {
    if (!this.def) return
    this.player.reset(this.checkpoint)
    this.playerVec.set(this.checkpoint.x, this.checkpoint.y, this.checkpoint.z)
    this.follow.snapTo(this.playerVec)
  }

  unlockAudio(): void {
    this.audio.unlock()
  }

  resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth
    const height = this.canvas.clientHeight || window.innerHeight
    const profile = qualityProfile(this.settings.quality)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatioCap))
    this.renderer.toneMappingExposure = profile.exposure
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const input = this.input.consume()
    if (input.pausePressed) {
      this.onEvent({ type: 'notify', title: this.paused ? 'Resumed' : 'Paused', body: '', tone: 'info' })
      window.dispatchEvent(new CustomEvent('tiny-worlds-pause'))
    }
    if (!this.world || !this.def) {
      this.renderer.render(this.scene, this.camera)
      return
    }
    if (!this.paused && !document.hidden) {
      this.follow.applyLook(input.lookX, input.lookY, this.settings, dt)
      this.player.update(dt, input, this.follow.yaw, {
        sampler: this.world.sampler,
        colliders: this.world.colliders,
        spawn: this.checkpoint,
        fallY: this.world.def.fallY,
      })
      if (this.player.justFell) {
        this.audio.playFall()
        this.explorer.triggerRespawn()
        this.onEvent({ type: 'fell' })
        this.onEvent({ type: 'notify', title: 'The isle caught you', body: 'Returned to the last checkpoint.', tone: 'info' })
      }
      if (this.player.justLanded) this.audio.playLand()
      if (this.player.onGround && this.player.moving(input)) {
        this.stepClock += dt * (input.run ? 2.1 : 1.4)
        if (this.stepClock > 0.36) {
          this.stepClock = 0
          this.audio.playFootstep()
        }
      } else {
        this.stepClock = 0
      }

      this.playerVec.set(this.player.position.x, this.player.position.y, this.player.position.z)
      this.explorer.group.position.copy(this.playerVec)
      const turnRate = shortestAngle(this.lastYaw, this.player.yaw) / Math.max(dt, 0.001)
      this.lastYaw = this.player.yaw
      this.explorer.group.rotation.y = this.player.yaw
      if (this.fill) this.fill.position.set(this.playerVec.x, this.playerVec.y + 2.4, this.playerVec.z)
      this.explorer.update(
        dt,
        this.player.moving(input),
        input.run,
        this.player.onGround,
        this.player.velocity.y,
        this.player.interacting,
        this.player.justLanded,
        turnRate,
      )
      this.world.tick(this.clock.elapsedTime, dt, qualityProfile(this.settings.quality).waterWaves)
      this.tickBursts(dt)
      this.handleInteractions(input.interactPressed)
      this.emitObjective()
    }
    this.follow.update(dt, this.playerVec, this.camera, this.world.blockers, this.settings.reducedMotion)
    this.renderer.render(this.scene, this.camera)
    this.frames += 1
    this.fpsClock += dt
    if (this.fpsClock >= 0.5) {
      this.fps = this.frames / this.fpsClock
      this.frames = 0
      this.fpsClock = 0
    }
  }

  inspect(): EngineInspect {
    const progress = this.def ? this.save.worlds[this.def.id] : null
    return {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
      yaw: this.player.yaw,
      cameraYaw: this.follow.yaw,
      onGround: this.player.onGround,
      worldId: this.def?.id ?? null,
      crystals: progress?.crystals ?? [],
      puzzles: progress?.puzzles ?? [],
      portalReady: progress?.portalReady ?? false,
      completed: progress?.completed ?? false,
      fps: this.fps,
      quality: this.settings.quality,
      secrets: progress?.secrets ?? [],
      cameraDist: this.follow.followDist,
      cameraBlocked: this.follow.blocked,
    }
  }

  handleInteractions(interact: boolean): void {
    if (!this.world || !this.def) return
    const pos = this.player.position
    let nearest: (typeof this.world.interactables)[number] | null = null
    let best = Infinity
    const portalReady = this.world.portalMesh.userData.ready === true
    for (const item of this.world.interactables) {
      if (!item.active) continue
      const dist = Math.hypot(pos.x - item.position.x, pos.z - item.position.z)
      const vertical = Math.abs(pos.y - item.position.y)
      const score = dist + (item.kind === 'portal' && !portalReady ? 0.7 : 0)
      if (dist < item.radius && vertical < 2.4 && score < best) {
        best = score
        nearest = item
      }
    }

    const prompt = nearest
      ? nearest.kind === 'collectible'
        ? `Collect ${nearest.label}`
        : nearest.kind === 'portal'
          ? this.world.portalMesh.userData.ready
            ? 'Activate the portal (E)'
            : 'The portal is still sleeping'
          : `${nearest.label} (E)`
      : null
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt
      this.onEvent({ type: 'prompt', text: prompt })
    }

    if (nearest?.kind === 'collectible' && best < 1.2) {
      this.collect(nearest.id)
      return
    }

    if (nearest?.kind === 'plate' && nearest.puzzleId) {
      this.pressPlate(nearest.puzzleId, nearest.id)
    }

    if (!interact || !nearest) return

    if (nearest.kind === 'sign') {
      this.onEvent({ type: 'notify', title: nearest.label, body: nearest.body ?? '', tone: 'info' })
      return
    }
    if (nearest.kind === 'switch' && nearest.puzzleId) this.solveSwitch(nearest.puzzleId)
    if (nearest.kind === 'node' && nearest.puzzleId && nearest.nodeId) this.solveNode(nearest.puzzleId, nearest.nodeId)
    if (nearest.kind === 'portal') this.tryComplete()
  }

  collect(id: string): void {
    if (!this.world || !this.def) return
    const live = this.world.collectibles.find((item) => item.def.id === id)
    if (!live || live.taken) return
    live.taken = true
    live.mesh.visible = false
    const interactable = this.world.interactables.find((item) => item.id === id)
    if (interactable) interactable.active = false
    const progress = this.save.worlds[this.def.id]
    if (!progress.crystals.includes(id)) progress.crystals.push(id)
    if (live.def.hidden && !progress.secrets.includes(id)) progress.secrets.push(id)
    this.checkpoint = { ...this.player.position }
    if (live.def.hidden) this.audio.playSecret()
    else this.audio.playCollect()
    this.explorer.triggerPickup()
    this.spawnBurst(live.def.position, live.def.color)
    this.onEvent({
      type: 'collect',
      id,
      kind: live.def.kind,
      name: live.def.name,
      hidden: live.def.hidden,
    })
    this.onEvent({ type: 'checkpoint', position: { ...this.checkpoint } })
    this.refreshPortal()
  }

  solveSwitch(puzzleId: string): void {
    if (!this.world || !this.def) return
    const puzzle = this.def.puzzles.find((item) => item.id === puzzleId)
    const progress = this.save.worlds[this.def.id]
    if (!puzzle || progress.puzzles.includes(puzzleId)) return
    progress.puzzles.push(puzzleId)
    const interactable = this.world.interactables.find((item) => item.puzzleId === puzzleId && item.kind === 'switch')
    if (interactable) interactable.active = false
    if (puzzle.targetId) raiseTarget(this.world, puzzle.targetId)
    if (puzzleId === 'plate-cave') this.revealCaveCrystal()
    this.audio.playSwitch()
    this.checkpoint = { ...this.player.position }
    this.onEvent({ type: 'puzzle', id: puzzleId, title: puzzle.title })
    this.onEvent({ type: 'checkpoint', position: { ...this.checkpoint } })
    this.refreshPortal()
  }

  pressPlate(puzzleId: string, plateId: string): void {
    if (!this.world || !this.def) return
    const progress = this.save.worlds[this.def.id]
    if (progress.puzzles.includes(puzzleId)) return
    const puzzle = this.def.puzzles.find((item) => item.id === puzzleId)
    if (!puzzle?.plates) return
    if (!this.plates[puzzleId]) this.plates[puzzleId] = new Set()
    this.plates[puzzleId].add(plateId)
    if (this.plates[puzzleId].size < puzzle.plates.length) return
    progress.puzzles.push(puzzleId)
    for (const plate of this.world.interactables.filter((item) => item.puzzleId === puzzleId)) plate.active = false
    if (puzzle.targetId) raiseTarget(this.world, puzzle.targetId)
    if (puzzleId === 'plate-cave') this.revealCaveCrystal()
    this.audio.playPuzzle()
    this.checkpoint = { ...this.player.position }
    this.onEvent({ type: 'puzzle', id: puzzleId, title: puzzle.title })
    this.onEvent({ type: 'checkpoint', position: { ...this.checkpoint } })
    this.refreshPortal()
  }

  solveNode(puzzleId: string, nodeId: string): void {
    if (!this.world || !this.def) return
    const progress = this.save.worlds[this.def.id]
    if (progress.puzzles.includes(puzzleId)) return
    const puzzle = this.def.puzzles.find((item) => item.id === puzzleId)
    if (!puzzle?.order) return
    const path = this.sequence[puzzleId] ?? []
    const expected = puzzle.order[path.length]
    if (nodeId !== expected) {
      this.sequence[puzzleId] = []
      this.audio.playWrong()
      this.onEvent({ type: 'notify', title: 'The lights fade', body: 'That was not the remembered order.', tone: 'info' })
      return
    }
    path.push(nodeId)
    this.sequence[puzzleId] = path
    this.audio.playSwitch()
    if (path.length < puzzle.order.length) {
      this.onEvent({ type: 'notify', title: 'The crystal answers', body: `${path.length}/${puzzle.order.length}`, tone: 'puzzle' })
      return
    }
    progress.puzzles.push(puzzleId)
    for (const node of this.world.interactables.filter((item) => item.puzzleId === puzzleId)) node.active = false
    this.audio.playPuzzle()
    this.checkpoint = { ...this.player.position }
    this.onEvent({ type: 'puzzle', id: puzzleId, title: puzzle.title })
    this.onEvent({ type: 'checkpoint', position: { ...this.checkpoint } })
    this.refreshPortal()
  }

  revealCaveCrystal(): void {
    if (!this.world) return
    const secret = this.world.collectibles.find((item) => item.def.id === 'c-cave')
    if (secret && !secret.taken) secret.mesh.visible = true
    const rock = this.world.hiddenByPuzzle.get('cave-rock')
    if (rock) rock.visible = false
  }

  refreshPortal(): void {
    if (!this.world || !this.def) return
    const progress = this.save.worlds[this.def.id]
    if (canReadyPortal(this.def, progress)) {
      if (!progress.portalReady) {
        progress.portalReady = true
        this.audio.playPortal()
        this.onEvent({ type: 'portal-ready' })
      }
      this.world.portalMesh.userData.ready = true
    }
    if (progress.completed) this.world.portalMesh.userData.ready = true
  }

  syncSave(save: SaveData): void {
    this.save = save
    this.refreshPortal()
  }

  tryComplete(): void {
    if (!this.world || !this.def || this.completeFired) return
    const progress = this.save.worlds[this.def.id]
    if (!progress.portalReady && !canReadyPortal(this.def, progress)) {
      this.onEvent({
        type: 'notify',
        title: 'The portal waits',
        body: 'Recover the crystals and finish the isle’s mechanisms.',
        tone: 'info',
      })
      return
    }
    this.completeFired = true
    this.world.portalMesh.userData.ready = true
    this.audio.playPortal()
    const totals = crystalTotals(this.def)
    const crystals = progress.crystals.filter((id) => this.def!.collectibles.some((item) => item.id === id && !item.hidden)).length
    const secrets = this.def.collectibles.filter((item) => item.hidden && progress.crystals.includes(item.id)).length
    this.onEvent({
      type: 'world-complete',
      stats: {
        worldId: this.def.id,
        worldName: this.def.name,
        crystals,
        crystalTotal: totals.required,
        secrets,
        secretTotal: totals.secrets,
        puzzles: progress.puzzles.length,
        nextWorld: this.def.unlocks ?? null,
        allComplete: allWorldsComplete({
          ...this.save,
          completedWorlds: Array.from(new Set([...this.save.completedWorlds, this.def.id])),
        }),
      },
    })
  }

  emitObjective(): void {
    if (!this.def) return
    const text = computeObjective(this.def, this.save.worlds[this.def.id])
    if (text !== this.lastObjective) {
      this.lastObjective = text
      this.onEvent({ type: 'objective', text })
    }
  }

  spawnBurst(position: Vec3, color: string): void {
    if (this.settings.reducedMotion) return
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.035, 8, 18),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }),
    )
    mesh.position.set(position.x, position.y, position.z)
    mesh.rotation.x = Math.PI / 2
    this.scene.add(mesh)
    this.bursts.push({ mesh, age: 0 })
  }

  tickBursts(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i]
      burst.age += dt
      const t = burst.age / 0.55
      burst.mesh.scale.setScalar(1 + t * 2.4)
      const mat = burst.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.7 * (1 - t))
      if (burst.age > 0.55) {
        this.scene.remove(burst.mesh)
        burst.mesh.geometry.dispose()
        mat.dispose()
        this.bursts.splice(i, 1)
      }
    }
  }

  clearBursts(): void {
    for (const burst of this.bursts) {
      this.scene.remove(burst.mesh)
      burst.mesh.geometry.dispose()
      ;(burst.mesh.material as THREE.Material).dispose()
    }
    this.bursts = []
  }

  clearWorld(): void {
    this.clearBursts()
    if (!this.world) return
    this.scene.remove(this.world.group)
    this.world.dispose()
    this.world = null
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.raf = 0
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.input.detach()
    this.clearWorld()
    this.explorer.dispose()
    this.audio.dispose()
    this.renderer.dispose()
    if (import.meta.env.DEV) {
      delete (window as unknown as { __TW?: unknown }).__TW
    }
  }
}
