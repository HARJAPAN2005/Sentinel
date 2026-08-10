import { motion } from 'framer-motion'

interface DepressButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

const variantStyles: Record<string, string> = {
  primary: '',
  secondary: 'bg-transparent !text-paper border-graphite !shadow-[3px_3px_0_0_#6B6A5F] active:!shadow-[1px_1px_0_0_#6B6A5F]',
  danger: '!bg-block-red !text-paper !border-ink-navy',
}

export function DepressButton({ label, onClick, disabled, variant = 'primary' }: DepressButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { y: 3, x: 3 }}
      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
      className={`depress-btn px-5 py-2.5 text-sm ${variantStyles[variant] || ''}`}
    >
      {label}
    </motion.button>
  )
}
