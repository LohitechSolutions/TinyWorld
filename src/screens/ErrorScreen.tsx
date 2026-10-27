import { useGameStore } from '../store/gameStore'

export function ErrorScreen() {
  const message = useGameStore((state) => state.errorMessage)
  return (
    <section className="screen sheet">
      <div className="panel sheet-card">
        <h1>The sky would not open</h1>
        <p>{message ?? 'Something prevented Tiny Worlds from starting.'}</p>
        <p className="muted">Refresh the page after enabling WebGL or hardware acceleration.</p>
      </div>
    </section>
  )
}
