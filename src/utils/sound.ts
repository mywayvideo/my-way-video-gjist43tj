export const playCrystalSound = () => {
  const audio = new Audio('/sounds/crystal-toast.mp3')
  audio.volume = 0.6
  audio.play().catch(() => {
    // Fallback to Web Audio API if audio file fails to load or play
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()

      // Main clear tone
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(2000, ctx.currentTime)

      // Subtle harmonic for richness
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(4000, ctx.currentTime)

      // Envelope: attack 0.05s, sustain 0.4s, release 0.25s (Total 0.7s)
      gain1.gain.setValueAtTime(0, ctx.currentTime)
      gain1.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05)
      gain1.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.45)
      gain1.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.7)

      gain2.gain.setValueAtTime(0, ctx.currentTime)
      gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05)
      gain2.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.45)
      gain2.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.7)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      osc1.start(ctx.currentTime)
      osc2.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.7)
      osc2.stop(ctx.currentTime + 0.7)
    } catch (e) {
      // Ignore errors
    }
  })
}

// Preserve existing exports in case they are used elsewhere
export const playCoinSound = playCrystalSound
