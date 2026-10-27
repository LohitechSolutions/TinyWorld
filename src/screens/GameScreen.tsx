import { useEffect, useRef, useState } from 'react'
import { HUD } from '../components/HUD'
import { TouchControls } from '../components/TouchControls'
import { GameEngine } from '../game/GameEngine'
import type { InputManager } from '../game/InputManager'
import { SCREENS } from '../game/types'
import { useGameStore } from '../store/gameStore'
import { getWorld } from '../worlds'
import { PauseScreen } from './PauseScreen'
import { SettingsScreen } from './SettingsScreen'
import { WorldCompleteScreen } from './WorldCompleteScreen'

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [touchInput, setTouchInput] = useState<InputManager | null>(null)
  const currentWorld = useGameStore((state) => state.currentWorld)
  const screen = useGameStore((state) => state.screen)
  const settings = useGameStore((state) => state.settings)
  const go = useGameStore((state) => state.go)
  const addPlayTime = useGameStore((state) => state.addPlayTime)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentWorld) return
    const store = useGameStore.getState()
    let engine: GameEngine
    try {
      engine = new GameEngine(canvas, store.settings, store.save, (event) => {
        const next = useGameStore.getState()
        const world = getWorld(currentWorld)
        if (event.type === 'collect') next.collect(world, event.id, Boolean(event.hidden), event.name)
        if (event.type === 'puzzle') next.solvePuzzle(world, event.id, event.title)
        if (event.type === 'prompt') next.setPrompt(event.text)
        if (event.type === 'objective') next.setObjective(event.text)
        if (event.type === 'checkpoint') next.setCheckpoint(currentWorld, event.position)
        if (event.type === 'portal-ready') next.markPortalReady(world)
        if (event.type === 'world-complete') next.completeWorld(world, event.stats)
        if (event.type === 'notify' && event.title && event.body !== undefined && event.tone !== 'info') {
          next.notify({ title: event.title, body: event.body, tone: event.tone })
        }
        if (event.type === 'notify' && event.tone === 'info' && event.title) {
          next.notify({ title: event.title, body: event.body, tone: 'info' })
        }
      })
      engine.loadWorld(getWorld(currentWorld), store.save)
      engine.start()
      engineRef.current = engine
      queueMicrotask(() => setTouchInput(engine.input))
    } catch (error) {
      store.failBoot(error instanceof Error ? error.message : 'The world failed to open.')
      return
    }

    const onPause = () => {
      const next = useGameStore.getState()
      if (next.screen === SCREENS.PLAYING) {
        next.go(SCREENS.PAUSED)
        engine.setPaused(true)
      } else if (next.screen === SCREENS.PAUSED) {
        next.go(SCREENS.PLAYING)
        engine.setPaused(false)
      }
    }
    window.addEventListener('tiny-worlds-pause', onPause)
    const timer = window.setInterval(() => addPlayTime(5), 5000)

    return () => {
      window.removeEventListener('tiny-worlds-pause', onPause)
      window.clearInterval(timer)
      engine.dispose()
      engineRef.current = null
      setTouchInput(null)
    }
  }, [addPlayTime, currentWorld])

  useEffect(() => {
    engineRef.current?.setPaused(screen !== SCREENS.PLAYING)
  }, [screen])

  useEffect(() => {
    engineRef.current?.applySettings(settings)
  }, [settings])

  const unlock = () => engineRef.current?.unlockAudio()

  return (
    <section className="screen" onPointerDown={unlock}>
      <div className="canvas-host">
        <canvas ref={canvasRef} />
      </div>
      {screen === SCREENS.PLAYING ? <HUD /> : null}
      {screen === SCREENS.PLAYING ? <TouchControls input={touchInput} /> : null}
      {screen === SCREENS.PAUSED ? (
        <PauseScreen
          onResume={() => {
            go(SCREENS.PLAYING)
            engineRef.current?.setPaused(false)
          }}
          onRestart={() => {
            engineRef.current?.restartCheckpoint()
            go(SCREENS.PLAYING)
            engineRef.current?.setPaused(false)
          }}
        />
      ) : null}
      {screen === SCREENS.SETTINGS ? (
        <SettingsScreen
          onBack={() => {
            go(currentWorld ? SCREENS.PAUSED : SCREENS.MENU)
          }}
        />
      ) : null}
      {screen === SCREENS.COMPLETE ? <WorldCompleteScreen /> : null}
      {screen === SCREENS.ENDING ? <WorldCompleteScreen ending /> : null}
    </section>
  )
}
