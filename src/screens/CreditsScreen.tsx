import { Button } from '../components/Button'
import { useGameStore } from '../store/gameStore'

export function CreditsScreen() {
  const go = useGameStore((state) => state.go)
  return (
    <section className="screen sheet">
      <div className="panel sheet-card">
        <h1>Credits</h1>
        <p>
          <strong>Tiny Worlds: Lost Dimensions</strong> is a self-contained browser exploration game built with React, Vite, and
          Three.js.
        </p>
        <p>Worlds, characters, music, and mechanisms are generated locally. No account or backend is required.</p>
        <p className="muted">Explore slowly. The islands keep their secrets for the curious.</p>
        <Button variant="primary" onClick={() => go('menu')}>
          Return
        </Button>
      </div>
    </section>
  )
}
