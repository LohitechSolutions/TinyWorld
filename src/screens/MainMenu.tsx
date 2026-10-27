import { useEffect, useRef } from 'react'
import { Button } from '../components/Button'
import { SafeImage } from '../components/SafeImage'
import { useGameStore } from '../store/gameStore'
import { getWorld } from '../worlds'

export function MainMenu() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const go = useGameStore((state) => state.go)
  const hasContinue = useGameStore((state) => state.hasContinue)
  const continueGame = useGameStore((state) => state.continueGame)
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion)
  const lastWorld = useGameStore((state) => state.save.lastWorld)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let scene: { dispose: () => void } | null = null
    void import('../game/MenuScene').then(({ MenuScene }) => {
      if (cancelled || !canvas.isConnected) return
      scene = new MenuScene(canvas, reducedMotion)
    })
    return () => {
      cancelled = true
      scene?.dispose()
    }
  }, [reducedMotion])

  return (
    <section className="screen menu">
      <div className="menu-bg">
        <SafeImage className="menu-art" src="./assets/images/key-art.jpg" alt="" />
        <div className="canvas-host">
          <canvas ref={canvasRef} />
        </div>
        <div className="menu-vignette" />
      </div>
      <div className="panel menu-panel">
        <span className="menu-kicker">A miniature odyssey</span>
        <SafeImage className="menu-logo" src="./assets/images/logo-emblem.jpg" alt="Tiny Worlds emblem" />
        <h1>Tiny Worlds</h1>
        <p className="subtitle">Lost Dimensions</p>
        {hasContinue && lastWorld ? (
          <p className="muted save-hint">Continue from {getWorld(lastWorld).name}</p>
        ) : null}
        <div className="stack">
          <Button variant="primary" onClick={() => go('worlds')}>
            Play
          </Button>
          {hasContinue ? <Button onClick={() => continueGame()}>Continue</Button> : null}
          <div className="row">
            <Button variant="ghost" onClick={() => go('howto')}>
              How to Play
            </Button>
            <Button variant="ghost" onClick={() => go('settings')}>
              Settings
            </Button>
          </div>
          <Button variant="ghost" onClick={() => go('credits')}>
            Credits
          </Button>
        </div>
      </div>
    </section>
  )
}
