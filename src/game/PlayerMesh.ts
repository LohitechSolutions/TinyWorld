import * as THREE from 'three'
import { damp } from './math'

export type AnimState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land' | 'interact' | 'pickup' | 'respawn'

export class PlayerMesh {
  group: THREE.Group
  leftArm: THREE.Group
  rightArm: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
  cloak: THREE.Mesh
  body: THREE.Group
  head: THREE.Group
  lantern: THREE.Mesh
  staff: THREE.Group
  light: THREE.PointLight
  state: AnimState = 'idle'
  phase = 0
  swing = 0
  squat = 0
  interactHold = 0
  landHold = 0
  pickupHold = 0
  respawnHold = 0
  breath = 0
  bob = 0
  lean = 0

  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'explorer'

    const skin = new THREE.MeshStandardMaterial({ color: 0xf3c4a0, roughness: 0.52 })
    const tunic = new THREE.MeshStandardMaterial({ color: 0x3a7a68, roughness: 0.62 })
    const cloak = new THREE.MeshStandardMaterial({ color: 0x1f4a44, roughness: 0.74, side: THREE.DoubleSide })
    const cloth = new THREE.MeshStandardMaterial({ color: 0x6cebff, roughness: 0.34, emissive: 0x176878, emissiveIntensity: 0.28 })
    const pack = new THREE.MeshStandardMaterial({ color: 0x6a4630, roughness: 0.82 })
    const hair = new THREE.MeshStandardMaterial({ color: 0x2f1d16, roughness: 0.86 })
    const boot = new THREE.MeshStandardMaterial({ color: 0x32241c, roughness: 0.8 })
    const eye = new THREE.MeshStandardMaterial({ color: 0x16110f, roughness: 0.28 })
    const belt = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.68 })
    const gold = new THREE.MeshStandardMaterial({ color: 0xe6c56a, roughness: 0.38, metalness: 0.42 })
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5334, roughness: 0.78 })
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a3826, roughness: 0.86 })

    this.body = new THREE.Group()
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.38, 6, 12), tunic)
    torso.position.y = 0.78
    torso.castShadow = true
    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 10), tunic)
    hips.scale.set(1.12, 0.7, 0.9)
    hips.position.y = 0.54
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.03, 8, 16), belt)
    sash.rotation.x = Math.PI / 2
    sash.position.y = 0.58
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), gold)
    buckle.position.set(0, 0.58, 0.205)
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.06), leather)
    pouch.position.set(0.16, 0.54, 0.12)
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 14, Math.PI * 1.2), cloth)
    scarf.position.set(0, 1.02, 0.02)
    scarf.rotation.x = 0.35
    this.body.add(torso, hips, sash, buckle, pouch, scarf)

    this.head = new THREE.Group()
    this.head.position.y = 1.18
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.198, 16, 14), skin)
    skull.castShadow = true
    const haircap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), hair)
    haircap.scale.set(1.18, 0.56, 1.1)
    haircap.position.set(0, 0.1, -0.015)
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.228, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), cloak)
    hood.position.set(0, 0.07, -0.04)
    const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.28), cloak)
    cowl.position.set(0, -0.02, -0.02)
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), eye)
    leftEye.position.set(-0.062, 0.018, 0.172)
    const rightEye = leftEye.clone()
    rightEye.position.x = 0.062
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.016, 0.02), hair)
    brow.position.set(0, 0.055, 0.168)
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), skin)
    nose.position.set(0, -0.018, 0.188)
    nose.scale.set(0.68, 0.52, 0.72)
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), new THREE.MeshStandardMaterial({ color: 0xb27870, roughness: 0.55 }))
    mouth.position.set(0, -0.068, 0.168)
    this.head.add(skull, haircap, hood, cowl, leftEye, rightEye, brow, nose, mouth)
    this.body.add(this.head)

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.18), pack)
    backpack.position.set(0, 0.82, -0.24)
    backpack.castShadow = true
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), leather)
    flap.position.set(0, 0.96, -0.16)
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 8), cloth)
    roll.rotation.z = Math.PI / 2
    roll.position.set(0, 1.0, -0.24)
    const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.12, 8), gold)
    flask.position.set(0.12, 0.78, -0.32)
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.26, 0.028), pack)
    strapL.position.set(-0.12, 0.86, -0.08)
    const strapR = strapL.clone()
    strapR.position.x = 0.12
    this.body.add(backpack, flap, roll, flask, strapL, strapR)

    this.lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffe0a3, emissive: 0xf0b24a, emissiveIntensity: 0.85, roughness: 0.28 }),
    )
    this.lantern.position.set(-0.22, 0.62, 0.14)
    const lanternCage = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.01, 6, 10), gold)
    lanternCage.position.copy(this.lantern.position)
    lanternCage.rotation.x = Math.PI / 2
    this.body.add(this.lantern, lanternCage)

    this.light = new THREE.PointLight(0xffd27a, 0.55, 4.2)
    this.light.position.set(-0.22, 0.64, 0.16)
    this.body.add(this.light)

    this.cloak = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.62, 8, 1, true), cloak)
    this.cloak.position.set(0, 0.58, -0.14)
    this.cloak.rotation.x = 0.18
    this.body.add(this.cloak)

    this.staff = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.05, 6), wood)
    pole.position.y = -0.28
    const tip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.055, 0),
      new THREE.MeshStandardMaterial({ color: 0x6cebff, emissive: 0x2ec4d6, emissiveIntensity: 0.7, roughness: 0.22 }),
    )
    tip.position.y = 0.28
    this.staff.add(pole, tip)
    this.staff.position.set(0.28, 0.72, 0.08)

    this.leftArm = this.makeLimb(skin, leather, false)
    this.rightArm = this.makeLimb(skin, leather, false)
    this.leftArm.position.set(-0.26, 0.94, 0)
    this.rightArm.position.set(0.26, 0.94, 0)
    this.rightArm.add(this.staff)
    this.leftLeg = this.makeLimb(tunic, boot, true)
    this.rightLeg = this.makeLimb(tunic, boot, true)
    this.leftLeg.position.set(-0.09, 0.5, 0)
    this.rightLeg.position.set(0.09, 0.5, 0)
    this.group.add(this.body, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg)
  }

  makeLimb(upper: THREE.Material, lower: THREE.Material, leg: boolean): THREE.Group {
    const group = new THREE.Group()
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(leg ? 0.066 : 0.05, leg ? 0.2 : 0.18, 5, 8), upper)
    a.position.y = -0.15
    a.castShadow = true
    const b = new THREE.Mesh(new THREE.SphereGeometry(leg ? 0.078 : 0.048, 8, 6), lower)
    b.position.y = -0.3
    b.scale.set(leg ? 1.22 : 1, leg ? 0.7 : 1, leg ? 1.32 : 1)
    if (leg) {
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.16), lower)
      sole.position.set(0, -0.34, 0.03)
      group.add(a, b, sole)
    } else {
      group.add(a, b)
    }
    return group
  }

  triggerPickup(): void {
    this.pickupHold = 0.46
  }

  triggerRespawn(): void {
    this.respawnHold = 0.5
  }

  update(
    dt: number,
    moving: boolean,
    running: boolean,
    onGround: boolean,
    vy: number,
    interacting: boolean,
    justLanded = false,
    turnRate = 0,
  ): void {
    if (interacting) this.interactHold = 0.38
    if (justLanded) this.landHold = 0.18
    this.interactHold = Math.max(0, this.interactHold - dt)
    this.landHold = Math.max(0, this.landHold - dt)
    this.pickupHold = Math.max(0, this.pickupHold - dt)
    this.respawnHold = Math.max(0, this.respawnHold - dt)
    this.breath += dt

    let next: AnimState = 'idle'
    if (this.respawnHold > 0) next = 'respawn'
    else if (this.pickupHold > 0) next = 'pickup'
    else if (this.interactHold > 0) next = 'interact'
    else if (!onGround && vy > 1.2) next = 'jump'
    else if (!onGround) next = 'fall'
    else if (this.landHold > 0) next = 'land'
    else if (moving && running) next = 'run'
    else if (moving) next = 'walk'
    this.state = next

    const cadence = this.state === 'run' ? 13.4 : this.state === 'walk' ? 8.5 : 2.1
    this.phase += dt * cadence
    const amp = this.state === 'run' ? 0.64 : this.state === 'walk' ? 0.4 : this.state === 'idle' ? 0.05 : 0
    const want = Math.sin(this.phase) * amp
    this.swing = damp(this.swing, want, 15, dt)

    let leftArm = -this.swing
    let rightArm = this.swing * 0.9
    if (this.state === 'interact' || this.state === 'pickup') {
      leftArm = -1.15
      rightArm = -0.85
    } else if (this.state === 'jump') {
      leftArm = -0.7
      rightArm = 0.55
    } else if (this.state === 'fall') {
      leftArm = 0.35
      rightArm = -0.25
    } else if (this.state === 'respawn') {
      leftArm = -0.4
      rightArm = -0.35
    }
    this.leftArm.rotation.x = damp(this.leftArm.rotation.x, leftArm, 16, dt)
    this.rightArm.rotation.x = damp(this.rightArm.rotation.x, rightArm, 16, dt)
    this.leftLeg.rotation.x = damp(
      this.leftLeg.rotation.x,
      this.state === 'jump' || this.state === 'fall' ? -0.4 : this.state === 'land' || this.state === 'respawn' ? 0.35 : this.swing,
      14,
      dt,
    )
    this.rightLeg.rotation.x = damp(
      this.rightLeg.rotation.x,
      this.state === 'jump' || this.state === 'fall' ? 0.2 : this.state === 'land' || this.state === 'respawn' ? 0.2 : -this.swing,
      14,
      dt,
    )

    const squatWant =
      this.state === 'land' || this.state === 'respawn'
        ? 0.07
        : this.state === 'run' || this.state === 'walk'
          ? Math.abs(Math.sin(this.phase)) * (this.state === 'run' ? 0.045 : 0.026)
          : 0
    this.squat = damp(this.squat, squatWant, 13, dt)
    const breathe = this.state === 'idle' ? Math.sin(this.breath * 2.05) * 0.014 : 0
    this.bob = damp(this.bob, this.state === 'pickup' ? 0.04 : 0, 10, dt)
    this.body.position.y = this.squat + breathe + this.bob
    this.body.rotation.x = damp(
      this.body.rotation.x,
      this.state === 'fall' ? clampTiny(-vy * 0.016) : this.state === 'walk' || this.state === 'run' ? 0.055 : this.state === 'pickup' ? -0.12 : 0,
      10,
      dt,
    )
    const turn = Math.max(-1.2, Math.min(1.2, turnRate))
    const leanWant = this.state === 'idle' ? turn * 0.28 : this.state === 'walk' || this.state === 'run' ? turn * 0.16 : 0
    this.lean = damp(this.lean, leanWant, 8, dt)
    this.body.rotation.y = this.lean * 0.35
    this.body.rotation.z = damp(this.body.rotation.z, -this.lean * 0.2, 8, dt)
    this.head.rotation.x = damp(this.head.rotation.x, this.state === 'jump' ? -0.1 : this.state === 'pickup' ? 0.18 : 0.02 + breathe * 2, 8, dt)
    this.head.rotation.y = damp(this.head.rotation.y, this.state === 'idle' ? this.lean * 0.45 : 0, 7, dt)
    this.cloak.rotation.x = (this.state === 'run' ? 0.34 : 0.18) + Math.sin(this.phase * 0.5 + this.breath) * 0.08
    this.lantern.position.y = 0.62 + Math.sin(this.breath * 3) * 0.01
    this.light.intensity = 0.45 + Math.sin(this.breath * 4) * 0.08
    this.staff.rotation.z = damp(this.staff.rotation.z, this.state === 'interact' || this.state === 'pickup' ? -0.45 : 0.18, 10, dt)
    const fade = this.state === 'respawn' ? 0.55 + this.respawnHold : 1
    this.group.scale.setScalar(damp(this.group.scale.x, fade, 10, dt))
  }

  dispose(): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry.dispose()
        const material = mesh.material
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else material.dispose()
      }
    })
  }
}

function clampTiny(value: number): number {
  return Math.min(0.22, Math.max(-0.32, value))
}
