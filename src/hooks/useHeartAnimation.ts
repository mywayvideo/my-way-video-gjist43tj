import { useState, useCallback } from 'react'
import { playCrystalSound } from '@/utils/sound'

export function useHeartAnimation() {
  const [isAnimating, setIsAnimating] = useState(false)

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true)
    playCrystalSound()
    setTimeout(() => setIsAnimating(false), 700)
  }, [])

  return { isAnimating, triggerAnimation }
}
