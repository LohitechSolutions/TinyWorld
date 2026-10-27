import { Button } from '../components/Button'
import { useGameStore } from '../store/gameStore'

type Props = {
  ending?: boolean
}

export function WorldCompleteScreen({ ending = false }: Props) {
  const stats = useGameStore((state) => state.lastCompletion)
  const startWorld = useGameStore((state) => state.startWorld)
  const go = useGameStore((state) => state.go)

  if (!stats) {
    return (
      <section className="screen sheet">
        <div className="panel sheet-card">
          <h1>Restored</h1>
          <Button onClick={() => go('worlds')}>World selection</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="screen sheet">
        <div className={`panel sheet-card${ending ? ' ending' : ''}`}>
        <h1>{ending ? 'The dimensions remember' : `${stats.worldName} restored`}</h1>
        <p className="muted">
          {ending
            ? 'Every isle is alight again. The little explorer can walk them whenever the sky calls.'
            : 'The portal folds the distance. Another world waits if you wish to continue.'}
        </p>
        <div className="complete-stats">
          <div className="stat">
            <strong>Crystals</strong>
            <div>
              {stats.crystals}/{stats.crystalTotal}
            </div>
          </div>
          <div className="stat">
            <strong>Secrets</strong>
            <div>
              {stats.secrets}/{stats.secretTotal}
            </div>
          </div>
          <div className="stat">
            <strong>Mechanisms</strong>
            <div>{stats.puzzles}</div>
          </div>
        </div>
        <div className="stack">
          {stats.nextWorld && !ending ? (
            <Button variant="primary" onClick={() => startWorld(stats.nextWorld!)}>
              Continue
            </Button>
          ) : null}
          <Button onClick={() => go('worlds')}>World selection</Button>
          <Button variant="ghost" onClick={() => go('menu')}>
            Main menu
          </Button>
        </div>
      </div>
    </section>
  )
}
