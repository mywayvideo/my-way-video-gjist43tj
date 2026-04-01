import { useState, useCallback } from 'react'
import { playSmoothSound } from '@/utils/sound'

export function useHeartAnimation() {
  const [isAnimating, setIsAnimating] = useState(false)

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true)
    playSmoothSound()
    setTimeout(() => setIsAnimating(false), 700)
  }, [])

  return { isAnimating, triggerAnimation }
}
