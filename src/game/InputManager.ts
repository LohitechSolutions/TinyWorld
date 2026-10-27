export type InputSnapshot = {
  moveX: number
  moveZ: number
  run: boolean
  jumpHeld: boolean
  jumpPressed: boolean
  interactPressed: boolean
  lookX: number
  lookY: number
  pausePressed: boolean
}

export class InputManager {
  keys = new Set<string>()
  pointerIds = new Set<number>()
  dragging = false
  lastX = 0
  lastY = 0
  lookX = 0
  lookY = 0
  jumpPressed = false
  interactPressed = false
  pausePressed = false
  touchMoveX = 0
  touchMoveZ = 0
  touchRun = false
  enabled = true
  target: HTMLElement | null = null

  onKeyDown: (event: KeyboardEvent) => void
  onKeyUp: (event: KeyboardEvent) => void
  onPointerDown: (event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerUp: (event: PointerEvent) => void
  onContext: (event: Event) => void

  constructor() {
    this.onKeyDown = (event) => this.handleKey(event, true)
    this.onKeyUp = (event) => this.handleKey(event, false)
    this.onPointerDown = (event) => this.handlePointerDown(event)
    this.onPointerMove = (event) => this.handlePointerMove(event)
    this.onPointerUp = (event) => this.handlePointerUp(event)
    this.onContext = (event) => event.preventDefault()
  }

  attach(target: HTMLElement): void {
    this.target = target
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    target.addEventListener('contextmenu', this.onContext)
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
    if (this.target) {
      this.target.removeEventListener('pointerdown', this.onPointerDown)
      this.target.removeEventListener('contextmenu', this.onContext)
    }
    this.target = null
    this.keys.clear()
  }

  setTouchMove(x: number, z: number, run: boolean): void {
    this.touchMoveX = x
    this.touchMoveZ = z
    this.touchRun = run
  }

  tapJump(): void {
    this.jumpPressed = true
  }

  tapInteract(): void {
    this.interactPressed = true
  }

  consume(): InputSnapshot {
    let keyX = 0
    let keyZ = 0
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) keyX += 1
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) keyX -= 1
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) keyZ += 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) keyZ -= 1

    let moveX = keyX + this.touchMoveX
    let moveZ = keyZ + this.touchMoveZ
    const mag = Math.hypot(moveX, moveZ)
    if (mag > 1) {
      moveX /= mag
      moveZ /= mag
    }

    const snapshot: InputSnapshot = {
      moveX: this.enabled ? moveX : 0,
      moveZ: this.enabled ? moveZ : 0,
      run: this.enabled && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchRun),
      jumpHeld: this.enabled && (this.keys.has('Space') || this.jumpPressed),
      jumpPressed: this.enabled && this.jumpPressed,
      interactPressed: this.enabled && this.interactPressed,
      lookX: this.enabled ? this.lookX : 0,
      lookY: this.enabled ? this.lookY : 0,
      pausePressed: this.pausePressed,
    }

    this.lookX = 0
    this.lookY = 0
    this.jumpPressed = false
    this.interactPressed = false
    this.pausePressed = false
    return snapshot
  }

  handleKey(event: KeyboardEvent, down: boolean): void {
    if (event.repeat && down) return
    const code = event.code
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      event.preventDefault()
    }
    if (down) this.keys.add(code)
    else this.keys.delete(code)
    if (down && code === 'Space') this.jumpPressed = true
    if (down && code === 'KeyE') this.interactPressed = true
    if (down && code === 'Escape') this.pausePressed = true
  }

  handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') return
    const target = event.target as HTMLElement | null
    if (target && target.closest('[data-ui]')) return
    this.dragging = true
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.pointerIds.add(event.pointerId)
  }

  handlePointerMove(event: PointerEvent): void {
    if (!this.dragging || !this.pointerIds.has(event.pointerId)) return
    this.lookX += event.clientX - this.lastX
    this.lookY += event.clientY - this.lastY
    this.lastX = event.clientX
    this.lastY = event.clientY
  }

  handlePointerUp(event: PointerEvent): void {
    this.pointerIds.delete(event.pointerId)
    if (this.pointerIds.size === 0) this.dragging = false
  }
}
