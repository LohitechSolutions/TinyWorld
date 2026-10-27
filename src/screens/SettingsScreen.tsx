import { useState } from 'react'
import { Button } from '../components/Button'
import type { QualityLevel } from '../game/types'
import { useGameStore } from '../store/gameStore'

type Props = {
  onBack?: () => void
}

export function SettingsScreen({ onBack }: Props) {
  const settings = useGameStore((state) => state.settings)
  const updateSettings = useGameStore((state) => state.updateSettings)
  const resetSave = useGameStore((state) => state.resetSave)
  const go = useGameStore((state) => state.go)
  const [confirm, setConfirm] = useState(false)

  return (
    <section className="screen sheet">
      <div className="panel sheet-card">
        <h1>Settings</h1>
        <label className="field">
          Master volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.masterVolume}
            onChange={(event) => updateSettings({ masterVolume: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          Music
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.musicVolume}
            onChange={(event) => updateSettings({ musicVolume: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          Sound effects
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.sfxVolume}
            onChange={(event) => updateSettings({ sfxVolume: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          Camera sensitivity
          <input
            type="range"
            min={0.3}
            max={2.4}
            step={0.05}
            value={settings.cameraSensitivity}
            onChange={(event) => updateSettings({ cameraSensitivity: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          Touch sensitivity
          <input
            type="range"
            min={0.4}
            max={2}
            step={0.05}
            value={settings.touchSensitivity}
            onChange={(event) => updateSettings({ touchSensitivity: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          Graphics quality
          <select
            value={settings.quality}
            onChange={(event) => updateSettings({ quality: event.target.value as QualityLevel })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="field">
          <span>
            <input
              type="checkbox"
              checked={settings.invertY}
              onChange={(event) => updateSettings({ invertY: event.target.checked })}
            />{' '}
            Invert look Y
          </span>
        </label>
        <label className="field">
          <span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => updateSettings({ reducedMotion: event.target.checked })}
            />{' '}
            Reduced motion
          </span>
        </label>
        <div className="stack">
          {!confirm ? (
            <Button variant="ghost" onClick={() => setConfirm(true)}>
              Reset local save
            </Button>
          ) : (
            <Button
              onClick={() => {
                resetSave()
                setConfirm(false)
              }}
            >
              Confirm reset
            </Button>
          )}
          <Button variant="primary" onClick={() => (onBack ? onBack() : go('menu'))}>
            Done
          </Button>
        </div>
      </div>
    </section>
  )
}
