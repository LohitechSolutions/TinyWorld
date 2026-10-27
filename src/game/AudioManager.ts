import { clamp } from './math'
import type { Settings } from './types'

type Tone = {
  freq: number
  dur: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

export class AudioManager {
  context: AudioContext | null = null
  master: GainNode | null = null
  music: GainNode | null = null
  sfx: GainNode | null = null
  settings: Settings
  started = false
  muted = false
  paused = false
  worldId = 'verdant-isle'
  timers: number[] = []
  nodes: AudioNode[] = []

  constructor(settings: Settings) {
    this.settings = settings
  }

  applySettings(settings: Settings): void {
    this.settings = settings
    this.syncGains()
  }

  unlock(): void {
    if (this.started) return
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    this.context = new Ctor()
    this.master = this.context.createGain()
    this.music = this.context.createGain()
    this.sfx = this.context.createGain()
    this.music.connect(this.master)
    this.sfx.connect(this.master)
    this.master.connect(this.context.destination)
    this.started = true
    this.syncGains()
    void this.context.resume()
    this.startAmbience()
  }

  setWorld(worldId: string): void {
    if (this.worldId === worldId) return
    this.worldId = worldId
    if (this.started) this.restartAmbience()
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    this.syncGains()
  }

  syncGains(): void {
    if (!this.master || !this.music || !this.sfx) return
    const master = this.muted ? 0 : clamp(this.settings.masterVolume, 0, 1)
    this.master.gain.value = master
    const music = clamp(this.settings.musicVolume, 0, 1)
    this.music.gain.value = this.paused ? music * 0.16 : music
    this.sfx.gain.value = clamp(this.settings.sfxVolume, 0, 1)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.syncGains()
  }

  restartAmbience(): void {
    for (const id of this.timers) window.clearInterval(id)
    this.timers = []
    for (const node of this.nodes) {
      try {
        const source = node as OscillatorNode
        if (typeof source.stop === 'function') source.stop()
      } catch {
        // already stopped
      }
      try {
        node.disconnect()
      } catch {
        // already disconnected
      }
    }
    this.nodes = []
    this.startAmbience()
  }

  playUi(): void {
    this.playTones([{ freq: 620, dur: 0.07, type: 'triangle', gain: 0.08 }])
  }

  playCollect(): void {
    this.playTones([
      { freq: 740, dur: 0.09, type: 'sine', gain: 0.09 },
      { freq: 980, dur: 0.14, type: 'sine', gain: 0.08, delay: 0.07 },
      { freq: 1240, dur: 0.18, type: 'triangle', gain: 0.05, delay: 0.14 },
    ])
  }

  playSecret(): void {
    this.playTones([
      { freq: 520, dur: 0.12, type: 'sine', gain: 0.08 },
      { freq: 780, dur: 0.16, type: 'triangle', gain: 0.07, delay: 0.1 },
      { freq: 1040, dur: 0.22, type: 'sine', gain: 0.06, delay: 0.2 },
    ])
  }

  playSwitch(): void {
    this.playTones([
      { freq: 196, dur: 0.12, type: 'triangle', gain: 0.045 },
      { freq: 98, dur: 0.2, type: 'sine', gain: 0.06, delay: 0.02 },
    ])
  }

  playPuzzle(): void {
    this.playTones([
      { freq: 392, dur: 0.14, type: 'sine', gain: 0.07 },
      { freq: 494, dur: 0.16, type: 'sine', gain: 0.07, delay: 0.12 },
      { freq: 587, dur: 0.22, type: 'triangle', gain: 0.06, delay: 0.24 },
    ])
  }

  playPortal(): void {
    this.playTones([
      { freq: 220, dur: 0.4, type: 'sine', gain: 0.07 },
      { freq: 330, dur: 0.45, type: 'triangle', gain: 0.05, delay: 0.1 },
      { freq: 495, dur: 0.55, type: 'sine', gain: 0.04, delay: 0.22 },
    ])
  }

  playLand(): void {
    this.playTones([{ freq: 110, dur: 0.08, type: 'sine', gain: 0.05 }])
  }

  playFootstep(): void {
    this.playTones([{ freq: 82 + Math.random() * 18, dur: 0.05, type: 'triangle', gain: 0.028 }])
  }

  playFall(): void {
    this.playTones([
      { freq: 240, dur: 0.18, type: 'sine', gain: 0.05 },
      { freq: 140, dur: 0.22, type: 'triangle', gain: 0.04, delay: 0.08 },
    ])
  }

  playWrong(): void {
    this.playTones([
      { freq: 196, dur: 0.1, type: 'triangle', gain: 0.03 },
      { freq: 147, dur: 0.16, type: 'sine', gain: 0.03, delay: 0.08 },
    ])
  }

  dispose(): void {
    for (const id of this.timers) window.clearInterval(id)
    this.timers = []
    for (const node of this.nodes) {
      try {
        node.disconnect()
      } catch {
        // already disconnected
      }
    }
    this.nodes = []
    if (this.context) {
      void this.context.close()
      this.context = null
    }
    this.started = false
  }

  playTones(tones: Tone[]): void {
    if (!this.context || !this.sfx) return
    const ctx = this.context
    for (const tone of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = tone.type ?? 'sine'
      osc.frequency.value = tone.freq
      const start = ctx.currentTime + (tone.delay ?? 0)
      const peak = tone.gain ?? 0.06
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur)
      osc.connect(gain)
      gain.connect(this.sfx)
      osc.start(start)
      osc.stop(start + tone.dur + 0.02)
    }
  }

  startAmbience(): void {
    if (!this.context || !this.music) return
    const ctx = this.context
    const pad = (freq: number, type: OscillatorType, gainValue: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = type
      osc.frequency.value = freq
      filter.type = 'lowpass'
      filter.frequency.value = 720
      gain.gain.value = gainValue
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.music!)
      osc.start()
      this.nodes.push(osc, gain, filter)
    }

    const beds =
      this.worldId === 'crystal-caverns'
        ? [
            [98, 'sine', 0.03],
            [147, 'triangle', 0.014],
            [196, 'sine', 0.01],
          ]
        : this.worldId === 'sky-temple'
          ? [
              [130.81, 'sine', 0.032],
              [196, 'triangle', 0.014],
              [261.63, 'sine', 0.01],
            ]
          : [
              [110, 'sine', 0.035],
              [164.81, 'triangle', 0.018],
              [220, 'sine', 0.012],
            ]
    for (const [freq, type, gain] of beds) {
      pad(Number(freq), type as OscillatorType, Number(gain))
    }

    const noise = ctx.createBufferSource()
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
    noise.buffer = buffer
    noise.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 420
    noiseFilter.Q.value = 0.7
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.02
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.music)
    noise.start()
    this.nodes.push(noise, noiseFilter, noiseGain)

    const id = window.setInterval(() => {
      if (!this.started || this.settings.reducedMotion) return
      const base = 196 + Math.floor(Math.random() * 4) * 49
      this.playSoftNote(base)
    }, 6400)
    this.timers.push(id)
  }

  playSoftNote(freq: number): void {
    if (!this.context || !this.music) return
    const osc = this.context.createOscillator()
    const gain = this.context.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = this.context.currentTime
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.035, start + 0.4)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.8)
    osc.connect(gain)
    gain.connect(this.music)
    osc.start(start)
    osc.stop(start + 3)
  }
}
