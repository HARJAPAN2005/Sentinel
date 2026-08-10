import { useEffect, useState } from 'react'

interface CurrentTraceProps {
  state: 'idle' | 'settled' | 'blocked'
  endpoint: string
  reason?: string
  txId?: string
  explorerUrl?: string
}

export function CurrentTrace({ state, endpoint, reason, explorerUrl }: CurrentTraceProps) {
  const [sparking, setSparking] = useState(false)

  useEffect(() => {
    if (state === 'blocked') {
      setSparking(true)
      const timer = setTimeout(() => setSparking(false), 400)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [state, endpoint])

  if (state === 'idle') return null

  const isSettled = state === 'settled'

  return (
    <div className="py-3 px-3 bg-ink-navy border border-graphite/30 relative overflow-hidden my-2">
      <div className="flex items-center justify-between font-ledger text-xs mb-2">
        <span className="text-graphite">AGENT :: 0x8F2A...</span>
        <span className={isSettled ? 'text-settle-blue font-bold' : 'text-block-red font-bold'}>
          {isSettled ? 'CURRENT SETTLED' : 'CURRENT DENIED'}
        </span>
        <span className="text-graphite">ENDPOINT :: {endpoint}</span>
      </div>

      {/* SVG Trace line */}
      <div className="relative h-6 flex items-center">
        <svg className="w-full h-4 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 10">
          {/* Background rail */}
          <line x1="0" y1="5" x2="100" y2="5" stroke="#6B6A5F" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />

          {/* Animated line */}
          <line
            x1="0"
            y1="5"
            x2={isSettled ? '100' : '55'}
            y2="5"
            stroke={isSettled ? '#3C5A78' : '#A9412C'}
            strokeWidth="2.5"
            className={isSettled ? 'animate-trace-draw' : 'animate-trace-snap'}
            strokeDasharray="100"
          />

          {/* Connection terminal dots */}
          <circle cx="0" cy="5" r="3" fill="#E7E4D8" />
          <circle cx="100" cy="5" r="3" fill={isSettled ? '#3C5A78' : '#6B6A5F'} />

          {/* Denial break spark dot */}
          {!isSettled && (
            <circle cx="55" cy="5" r="4" fill="#A9412C" className={sparking ? 'animate-spark' : ''} />
          )}
        </svg>
      </div>

      <div className="mt-2 text-xs font-ledger flex items-center justify-between">
        {isSettled ? (
          <>
            <span className="text-settle-blue">✓ Circuit Complete — On-chain USDC Transferred</span>
            {explorerUrl && (
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-link">
                View Tx ↗
              </a>
            )}
          </>
        ) : (
          <>
            <span className="text-block-red">⚡ Circuit Broken — {reason || 'Policy Firewall Triggered'}</span>
            <span className="text-graphite opacity-60">0.000 USDC Transferred</span>
          </>
        )}
      </div>
    </div>
  )
}
