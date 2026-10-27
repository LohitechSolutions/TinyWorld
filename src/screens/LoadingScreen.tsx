import { useEffect } from 'react'
import { SafeImage } from '../components/SafeImage'
import { useGameStore } from '../store/gameStore'

const IMAGES = [
  './assets/images/key-art.jpg',
  './assets/images/logo-emblem.jpg',
  './assets/images/world-verdant.jpg',
  './assets/images/world-caverns.jpg',
  './assets/images/world-temple.jpg',
]

function loadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = src
  })
}

export function LoadingScreen() {
  const setBoot = useGameStore((state) => state.setBoot)
  const finishBoot = useGameStore((state) => state.finishBoot)
  const failBoot = useGameStore((state) => state.failBoot)
  const progress = useGameStore((state) => state.bootProgress)
  const message = useGameStore((state) => state.bootMessage)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setBoot(0.1, 'Checking the sky…')
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) {
        failBoot('WebGL is required to explore Tiny Worlds. Please enable hardware acceleration or try another browser.')
        return
      }
      setBoot(0.25, 'Gathering illustrated memories…')
      for (let i = 0; i < IMAGES.length; i += 1) {
        await loadImage(IMAGES[i])
        if (!alive) return
        setBoot(0.25 + ((i + 1) / IMAGES.length) * 0.55, 'Gathering illustrated memories…')
      }
      setBoot(0.9, 'Opening the first door…')
      await new Promise((resolve) => window.setTimeout(resolve, 220))
      if (!alive) return
      finishBoot()
    }
    void run()
    return () => {
      alive = false
    }
  }, [failBoot, finishBoot, setBoot])

  return (
    <section
      className="screen boot"
      style={{ backgroundImage: 'linear-gradient(180deg, rgba(16,29,37,0.32), rgba(16,29,37,0.8)), url(./assets/images/key-art.jpg)' }}
    >
      <div className="panel boot-inner">
        <SafeImage className="boot-logo" src="./assets/images/logo-emblem.jpg" alt="Tiny Worlds emblem" />
        <h1>Tiny Worlds</h1>
        <p className="subtitle">Lost Dimensions</p>
        <p className="muted">{message}</p>
        <div className="progress" aria-label="Loading progress">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
    </section>
  )
}
