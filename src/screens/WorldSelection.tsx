import { Button } from '../components/Button'
import { SafeImage } from '../components/SafeImage'
import { isWorldUnlocked } from '../game/progression'
import { useGameStore } from '../store/gameStore'
import { WORLD_LIST } from '../worlds'

const TONES = ['verdant', 'cavern', 'temple']

export function WorldSelection() {
  const save = useGameStore((state) => state.save)
  const startWorld = useGameStore((state) => state.startWorld)
  const go = useGameStore((state) => state.go)

  return (
    <section className="screen sheet">
      <div className="panel sheet-card" style={{ width: 'min(1080px, calc(100% - 24px))' }}>
        <h1>Choose a World</h1>
        <p className="subtitle" style={{ textAlign: 'center' }}>
          Restore the lost dimensions one island at a time.
        </p>
        <div className="worlds">
          {WORLD_LIST.map((world, index) => {
            const unlocked = isWorldUnlocked(save, world.id)
            const progress = save.worlds[world.id]
            const crystals = progress.crystals.filter((id) => world.collectibles.some((item) => item.id === id && !item.hidden)).length
            const requirement =
              index === 0 ? 'Open from the first meadow' : `Complete ${WORLD_LIST[index - 1].name} to unlock`
            const status = progress.completed ? 'Restored' : unlocked ? 'Unlocked' : 'Locked'
            return (
              <button
                key={world.id}
                className={`panel world-card ${unlocked ? '' : 'locked'}`}
                disabled={!unlocked}
                onClick={() => unlocked && startWorld(world.id)}
              >
                <SafeImage src={world.preview} alt="" fallback={TONES[index] ?? 'verdant'} />
                <div>
                  <span className={`badge ${progress.completed ? 'restored' : unlocked ? '' : 'locked'}`}>{status}</span>
                  <h2 style={{ margin: '6px 0 2px' }}>{world.name}</h2>
                  <p className="world-sub">{world.subtitle}</p>
                  <p className="muted">{world.description}</p>
                  <div className="meter" aria-hidden>
                    <span style={{ width: `${(crystals / Math.max(1, world.requiredCrystals)) * 100}%` }} />
                  </div>
                  <p>
                    Crystals {crystals}/{world.requiredCrystals}
                    {progress.secrets.length ? ` · Secrets ${progress.secrets.length}` : ''}
                  </p>
                  {!unlocked ? <p className="muted">{requirement}</p> : <p className="muted">{unlocked && !progress.completed ? 'Enter this isle' : 'Revisit the restored isle'}</p>}
                </div>
              </button>
            )
          })}
        </div>
        <Button variant="ghost" onClick={() => go('menu')}>
          Back
        </Button>
      </div>
    </section>
  )
}
