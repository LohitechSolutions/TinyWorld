import { useGameStore } from '../store/gameStore'
import { getWorld } from '../worlds'
import { Button } from './Button'

function useTouchHint(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900
}

export function HUD() {
  const currentWorld = useGameStore((state) => state.currentWorld)
  const save = useGameStore((state) => state.save)
  const objective = useGameStore((state) => state.objective)
  const prompt = useGameStore((state) => state.prompt)
  const notes = useGameStore((state) => state.notifications)
  const go = useGameStore((state) => state.go)
  const world = currentWorld ? getWorld(currentWorld) : null
  const progress = currentWorld ? save.worlds[currentWorld] : null
  const crystals = progress?.crystals.filter((id) => world?.collectibles.some((item) => item.id === id && !item.hidden)).length ?? 0
  const hint = useTouchHint() ? 'tap E' : 'E'

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="chip">
          <strong>{world?.name ?? 'Tiny Worlds'}</strong>
          <div className="muted">
            Crystals {crystals}/{world?.requiredCrystals ?? 0}
          </div>
          <div className="crystal-pips" aria-hidden>
            {Array.from({ length: world?.requiredCrystals ?? 0 }, (_, index) => (
              <span key={index} className={index < crystals ? 'pip on' : 'pip'} />
            ))}
          </div>
        </div>
        <Button variant="ghost" onClick={() => go('paused')} aria-label="Pause">
          Pause
        </Button>
      </div>
      <div className="hud-objective" style={{ marginTop: 12 }}>
        <div className="chip objective">{objective}</div>
      </div>
      {prompt ? <div className="prompt">{prompt.includes('(E)') ? prompt.replace('(E)', `(${hint})`) : prompt}</div> : null}
      <div className="notes" aria-live="polite">
        {notes.map((note) => (
          <div className={`note ${note.tone}`} key={note.id}>
            <strong>{note.title}</strong>
            {note.body ? <div className="muted">{note.body}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
