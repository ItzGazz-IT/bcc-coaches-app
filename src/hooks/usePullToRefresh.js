import { useEffect, useRef, useState } from 'react'

export function usePullToRefresh(onRefresh) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const isPullingRef = useRef(false)

  useEffect(() => {
    let touchStartY = 0
    let currentY = 0
    const threshold = 80 // Pull distance needed to trigger refresh

    const handleTouchStart = (e) => {
      // Only start pull if at top of page
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY
        startY.current = touchStartY
        isPullingRef.current = true
      }
    }

    const handleTouchMove = (e) => {
      if (!isPullingRef.current) return

      currentY = e.touches[0].clientY
      const distance = currentY - touchStartY

      // Only allow pulling down
      if (distance > 0 && window.scrollY === 0) {
        setIsPulling(true)
        setPullDistance(Math.min(distance, 120)) // Cap at 120px
        
        // Prevent default scroll behavior when pulling
        if (distance > 10) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return

      const distance = pullDistance

      if (distance >= threshold) {
        // Trigger refresh
        setPullDistance(threshold)
        try {
          await onRefresh()
        } finally {
          setTimeout(() => {
            setIsPulling(false)
            setPullDistance(0)
          }, 500)
        }
      } else {
        // Didn't pull far enough, reset
        setIsPulling(false)
        setPullDistance(0)
      }

      isPullingRef.current = false
    }

    // Add listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, onRefresh])

  return { isPulling, pullDistance }
}
