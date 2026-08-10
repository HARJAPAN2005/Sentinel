import { motion } from 'framer-motion'
import { useState } from 'react'

interface DepressButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

const VARIANT_STYLE: Record<string, React.CSSProperties> = {
  primary:   { background: '#E7E4D8', color: '#12161C', border: '2px solid #12161C' },
  secondary: { background: 'transparent', color: '#E7E4D8', border: '2px solid #6B6A5F' },
  danger:    { background: '#A9412C', color: '#E7E4D8', border: '2px solid #12161C' },
}
const SHADOW_REST: Record<string, string> = {
  primary:   '4px 4px 0 0 #12161C',
  secondary: '3px 3px 0 0 #6B6A5F',
  danger:    '4px 4px 0 0 #12161C',
}
const SHADOW_PRESS: Record<string, string> = {
  primary:   '1px 1px 0 0 #12161C',
  secondary: '1px 1px 0 0 #6B6A5F',
  danger:    '1px 1px 0 0 #12161C',
}

export function DepressButton({ label, onClick, disabled, variant = 'primary' }: DepressButtonProps) {
  const [pressed, setPressed] = useState(false)

  const handleMouseDown = () => { if (!disabled) setPressed(true) }
  const handleMouseUp   = () => { setPressed(false) }

  const handleClick = () => {
    if (disabled) return
    // Mechanical click: instant snap to 1px shadow, then release
    setPressed(true)
    setTimeout(() => setPressed(false), 80)
    onClick()
  }

  const style: React.CSSProperties = {
    ...VARIANT_STYLE[variant],
    // Hard instant shadow snap on press — NO transition, that's the point
    boxShadow: pressed ? SHADOW_PRESS[variant] : SHADOW_REST[variant],
    transform: pressed ? 'translateY(3px) translateX(3px)' : 'none',
    // Instant for press, 80ms for release — feels mechanical
    transition: pressed
      ? 'none'
      : 'box-shadow 80ms ease-out, transform 80ms ease-out',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontSize: '0.78rem',
    padding: '0.5rem 1.25rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    userSelect: 'none',
  }

  return (
    <button
      style={style}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      disabled={disabled}
    >
      {label}
    </button>
  )
}
