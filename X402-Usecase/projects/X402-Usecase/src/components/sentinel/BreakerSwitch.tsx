import { motion } from 'framer-motion'

interface BreakerSwitchProps {
  label: string
  on: boolean
  /** If true, the switch trips with a visible flick animation */
  tripped?: boolean
}

export function BreakerSwitch({ label, on, tripped }: BreakerSwitchProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* Physical switch housing */}
      <div className={`breaker-switch ${on ? 'breaker-on' : 'breaker-off'}`}>
        <motion.div
          className="breaker-handle"
          animate={{
            left: on ? 18 : 2,
          }}
          transition={
            tripped
              ? { type: 'spring', stiffness: 800, damping: 10 } // hard snap
              : { type: 'spring', stiffness: 300, damping: 25 }  // smooth
          }
        />
      </div>

      {/* Label */}
      <span className={`font-ledger text-xs tracking-wide ${on ? 'text-paper' : 'text-block-red'}`}>
        /{label}
      </span>

      {/* Status indicator */}
      <span className={`font-ledger text-xs uppercase tracking-widest ${on ? 'text-settle-blue' : 'text-block-red'}`}>
        {on ? 'on' : 'off'}
      </span>
    </div>
  )
}
