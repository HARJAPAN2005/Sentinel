import { motion } from 'framer-motion'

interface StampProps {
  state: 'settled' | 'blocked'
  label?: string
}

export function Stamp({ state, label }: StampProps) {
  const isBlocked = state === 'blocked'
  const text = label || (isBlocked ? 'BLOCKED' : 'SETTLED')

  return (
    <motion.div
      initial={{ scale: 1.35, opacity: 0, rotate: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: isBlocked ? -6 : -3,
      }}
      transition={{
        type: 'spring',
        stiffness: isBlocked ? 420 : 300,
        damping: isBlocked ? 14 : 20,
      }}
      className={`stamp ${isBlocked ? 'stamp-blocked' : 'stamp-settled'}`}
    >
      {text}
    </motion.div>
  )
}
