import { useRef } from 'react'
import type { InputManager } from '../game/InputManager'
import { useGameStore } from '../store/gameStore'

type Props = {
  input: InputManager | null
}

export function TouchControls({ input }: Props) {
  const origin = useRef({ x: 0, y: 0 })
  const knob = useRef<HTMLDivElement>(null)
  const sensitivity = useGameStore((state) => state.settings.touchSensitivity)

  const reset = () => {
    if (knob.current) knob.current.style.transform = 'translate(0,0)'
    input?.setTouchMove(0, 0, false)
  }

  return (
    <div className="touch" data-ui>
      <div
        className="joystick"
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          const rect = event.currentTarget.getBoundingClientRect()
          origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId) || !input) return
          const dx = (event.clientX - origin.current.x) * sensitivity
          const dy = (event.clientY - origin.current.y) * sensitivity
          const max = 48
          const mag = Math.hypot(dx, dy)
          const nx = mag > 0 ? dx / mag : 0
          const ny = mag > 0 ? dy / mag : 0
          const clamped = Math.min(max, mag)
          if (knob.current) {
            knob.current.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`
          }
          input.setTouchMove(nx * Math.min(1, mag / 36), -ny * Math.min(1, mag / 36), mag > 40)
        }}
        onPointerUp={reset}
        onPointerCancel={reset}
      >
        <div className="knob" ref={knob} />
      </div>
      <div className="touch-btns">
        <button className="btn" aria-label="Interact" onPointerDown={() => input?.tapInteract()}>
          E
        </button>
        <button className="btn primary" aria-label="Jump" onPointerDown={() => input?.tapJump()}>
          Jump
        </button>
      </div>
    </div>
  )
}
