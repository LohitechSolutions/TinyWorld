import { Button } from '../components/Button'
import { useGameStore } from '../store/gameStore'

type Props = {
  onResume: () => void
  onRestart: () => void
}

export function PauseScreen({ onResume, onRestart }: Props) {
  const go = useGameStore((state) => state.go)
  return (
    <section className="screen sheet">
      <div className="panel sheet-card">
        <h1>Paused</h1>
        <p className="muted">The wind waits with you.</p>
        <div className="stack">
          <Button variant="primary" onClick={onResume}>
            Resume
          </Button>
          <Button onClick={onRestart}>Restart checkpoint</Button>
          <Button variant="ghost" onClick={() => go('settings')}>
            Settings
          </Button>
          <Button variant="ghost" onClick={() => go('worlds')}>
            World selection
          </Button>
          <Button variant="ghost" onClick={() => go('menu')}>
            Main menu
          </Button>
        </div>
      </div>
    </section>
  )
}
