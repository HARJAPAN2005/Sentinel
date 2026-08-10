import { motion, useAnimation } from 'framer-motion'
import { useEffect, useState } from 'react'

interface StampProps {
  state: 'settled' | 'blocked'
  label?: string
}

export function Stamp({ state, label }: StampProps) {
  const isBlocked = state === 'blocked'
  const text = label || (isBlocked ? 'BLOCKED' : 'SETTLED')
  const controls = useAnimation()
  const [showBleed, setShowBleed] = useState(false)

  useEffect(() => {
    // Sequence: slam in → at peak impact, fire the ink-bleed sweep
    const seq = async () => {
      await controls.start({
        scale: 1,
        opacity: 1,
        rotate: isBlocked ? -6 : -3,
        transition: {
          type: 'spring',
          stiffness: isBlocked ? 420 : 300,
          damping:   isBlocked ? 14  : 20,
        },
      })
      // Ink-bleed fires at the exact moment the spring settles
      setShowBleed(true)
      setTimeout(() => setShowBleed(false), 180)
    }
    seq()
  }, [state]) // re-run if state changes

  return (
    <motion.div
      initial={{ scale: 1.35, opacity: 0, rotate: 0 }}
      animate={controls}
      className={`stamp ${isBlocked ? 'stamp-blocked' : 'stamp-settled'} relative overflow-hidden`}
      style={{
        // Subtle parent flash behind blocked stamp
        ...(isBlocked ? { animation: showBleed ? 'flash-red 200ms ease-out' : undefined } : {}),
      }}
    >
      {text}

      {/*
        Ink-bleed sweep — a thin light stripe that scans across the
        stamp face on impact. Linear-gradient mask, 150ms, no blur.
        Only visible during the 180ms bleed window.
      */}
      {showBleed && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: isBlocked
              ? 'linear-gradient(105deg, transparent 35%, rgba(169,65,44,0.45) 50%, transparent 65%)'
              : 'linear-gradient(105deg, transparent 35%, rgba(60,90,120,0.40) 50%, transparent 65%)',
            backgroundSize: '300% 100%',
            animation: 'ink-bleed 150ms linear',
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  )
}
