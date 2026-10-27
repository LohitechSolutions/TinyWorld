import { Button } from '../components/Button'
import { useGameStore } from '../store/gameStore'

export function HowToPlayScreen() {
  const go = useGameStore((state) => state.go)
  const touch = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720)

  return (
    <section className="screen sheet">
      <div className="panel sheet-card">
        <h1>How to Play</h1>
        <p className="muted">A quiet adventure of walking, noticing, and waking old light.</p>
        <div className="howto-grid">
          <div className="howto-card">
            <h2>Desktop</h2>
            <div className="keys">
              <span className="kbd">W</span>
              <span className="kbd">A</span>
              <span className="kbd">S</span>
              <span className="kbd">D</span>
            </div>
            <p>
              <span className="kbd">Shift</span> run · <span className="kbd">Space</span> jump · <span className="kbd">E</span> interact ·{' '}
              <span className="kbd">Esc</span> pause
            </p>
            <p className="muted">Drag to look. Movement follows the camera.</p>
          </div>
          <div className="howto-card">
            <h2>Touch</h2>
            <p>Left joystick walks. Push farther to run.</p>
            <p>Jump and E sit on the right. Drag the sky to look.</p>
            {touch ? <p className="muted">This device is using touch controls in play.</p> : null}
          </div>
        </div>
        <h2>Exploration</h2>
        <ul>
          <li>Collect glowing energy crystals. Hidden ones reward curiosity.</li>
          <li>Ancient switches raise bridges. Pressure plates open secret paths.</li>
          <li>Crystal nodes must be awakened in a remembered order.</li>
          <li>When the isle is ready, activate the portal to restore the world.</li>
          <li>If you slip from an island, you return to the last checkpoint.</li>
        </ul>
        <Button variant="primary" onClick={() => go('menu')}>
          Return
        </Button>
      </div>
    </section>
  )
}
