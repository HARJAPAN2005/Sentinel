import { motion, useAnimation } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface BreakerSwitchProps {
  label: string
  on: boolean
  /** First time this switch was denied — fires the trip animation */
  tripped?: boolean
}

export function BreakerSwitch({ label, on, tripped }: BreakerSwitchProps) {
  const controls = useAnimation()
  const rowControls = useAnimation()
  const prevOn = useRef(on)
  const trippedOnce = useRef(false)
  const [showSpark, setShowSpark] = useState(false)

  useEffect(() => {
    const wasOn = prevOn.current
    prevOn.current = on

    if (wasOn !== on) {
      // Overshoot bounce: go past target by 4px, then settle
      controls.start({
        left: on
          // Bounce to 22px then settle to 18px
          ? [2, 22, 14, 18]
          // Bounce to -2px then settle to 2px
          : [18, -2, 6, 2],
        transition: {
          duration: 0.28,
          times: [0, 0.45, 0.75, 1],
          ease: 'easeOut',
        },
      })
    }
  }, [on, controls])

  useEffect(() => {
    if (tripped && !trippedOnce.current) {
      trippedOnce.current = true
      // Shake the whole row
      rowControls.start({
        x: [0, -4, 4, -3, 3, -1, 1, 0],
        transition: { duration: 0.32, ease: 'easeOut' },
      })
      // Show spark icon briefly
      setShowSpark(true)
      setTimeout(() => setShowSpark(false), 500)
    }
  }, [tripped, rowControls])

  return (
    <motion.div animate={rowControls} className="flex items-center gap-3 py-1.5">
      {/* Switch housing */}
      <div
        className="breaker-switch"
        style={{ border: `2px solid ${on ? '#3C5A78' : '#A9412C'}` }}
        aria-checked={on}
        role="switch"
      >
        <motion.div
          className="breaker-handle"
          initial={{ left: on ? 18 : 2 }}
          animate={controls}
          style={{
            backgroundColor: on ? '#3C5A78' : '#A9412C',
            borderColor:     on ? '#3C5A78' : '#A9412C',
          }}
        />
      </div>

      {/* Endpoint label */}
      <span className={`font-ledger text-xs tracking-wide ${on ? 'text-paper' : 'text-block-red/70'}`}>
        /{label}
      </span>

      {/* Status badge — always monospace */}
      <span
        className={`font-ledger text-xs uppercase tracking-widest ${
          on ? 'text-settle-blue' : 'text-block-red'
        }`}
      >
        {on ? 'ON' : 'OFF'}
      </span>

      {/* Trip spark — appears only once on first denied attempt */}
      {showSpark && (
        <span
          aria-hidden="true"
          className="font-ledger text-block-red text-xs"
          style={{ animation: 'flash-red 500ms ease-out' }}
        >
          ⚡ TRIPPED
        </span>
      )}
    </motion.div>
  )
}
