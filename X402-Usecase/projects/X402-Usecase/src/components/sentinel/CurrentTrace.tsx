import { useEffect, useRef, useState } from 'react'

interface CurrentTraceProps {
  /** 'idle' = not yet run, 'settled' = payment completed, 'blocked' = policy denied */
  state: 'idle' | 'settled' | 'blocked'
  endpoint: string
  reason?: string
  explorerUrl?: string
  /** Actual latency in ms — used to match stroke draw to real payment time */
  latencyMs?: number
  /** Whether this trace card is currently the "active" (most recent) one */
  isActive?: boolean
  /** Index in the stack — drives Z-axis depth offset */
  stackIndex?: number
}

export function CurrentTrace({
  state,
  endpoint,
  reason,
  explorerUrl,
  latencyMs = 800,
  isActive = false,
  stackIndex = 0,
}: CurrentTraceProps) {
  const [sparking, setSparking] = useState(false)
  const [showGhost, setShowGhost] = useState(false)
  const lineRef = useRef<SVGLineElement>(null)
  const ghostRef = useRef<SVGLineElement>(null)

  useEffect(() => {
    if (state === 'blocked') {
      setSparking(true)
      const sparkTimer = setTimeout(() => {
        setSparking(false)
        setShowGhost(true)
      }, 350)
      return () => clearTimeout(sparkTimer)
    }
    if (state === 'settled') {
      setShowGhost(false)
    }
    return undefined
  }, [state, endpoint])

  if (state === 'idle') return null

  const isSettled = state === 'settled'

  // Clamp latency draw duration: min 400ms, max 2400ms
  const drawDur = Math.max(400, Math.min(2400, latencyMs))

  /*
    3D spatial-depth treatment (antigravity-design-expert spatial technique):
    CSS perspective + rotateX gives each trace card a shallow circuit-board tilt.
    Active (most recent) card pops forward on Z — no blur, no shadow softness,
    hard-edge only. stackIndex drives the depth recession.
    0 = deepest back,  isActive = comes forward.
  */
  const depthScale   = isActive ? 1.0  : 1 - stackIndex * 0.025
  const rotateX      = isActive ? 0    : 2 + stackIndex * 1.5  // deg — shallow tilt
  const translateZ   = isActive ? 12   : -stackIndex * 10       // px
  const borderOpacity = isActive ? 0.6  : 0.25 + stackIndex * 0.05

  return (
    <div
      style={{
        perspective: '800px',
        perspectiveOrigin: '50% 40%',
      }}
    >
      <div
        className="py-3 px-3 bg-ink-navy border border-graphite relative overflow-hidden my-1 transition-transform duration-300"
        style={{
          borderColor: `rgba(107,106,95,${borderOpacity})`,
          transform: `rotateX(${rotateX}deg) translateZ(${translateZ}px) scale(${depthScale})`,
          transformStyle: 'preserve-3d',
          transformOrigin: '50% 50%',
          // Active trace: 1px hard highlight border on top edge, no glow
          ...(isActive
            ? { borderTopColor: isSettled ? '#3C5A78' : '#A9412C', borderTopWidth: '2px' }
            : {}),
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between font-ledger text-xs mb-3">
          <span className="text-graphite tracking-wide">AGENT :: 0x8F2A</span>
          <span
            className={`font-bold tracking-widest uppercase ${
              isSettled ? 'text-settle-blue' : 'text-block-red'
            }`}
          >
            {isSettled ? 'CIRCUIT COMPLETE' : 'CIRCUIT BROKEN'}
          </span>
          <span className="text-graphite tracking-wide">{endpoint}</span>
        </div>

        {/* SVG Circuit Board Trace */}
        <div className="relative h-8 flex items-center">
          <svg
            className="w-full overflow-visible"
            viewBox="0 0 300 16"
            preserveAspectRatio="none"
            style={{ height: '16px' }}
          >
            {/* PCB pad at origin */}
            <rect x="0" y="4" width="8" height="8" fill="#E7E4D8" opacity="0.8" />

            {/* Background rail — dashed, permanent */}
            <line
              x1="8" y1="8" x2="300" y2="8"
              stroke="#6B6A5F"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />

            {/* ── SETTLED: full animated draw ── */}
            {isSettled && (
              <line
                ref={lineRef}
                x1="8" y1="8" x2="300" y2="8"
                stroke="#3C5A78"
                strokeWidth="3"
                strokeDasharray="300"
                strokeDashoffset="300"
                strokeLinecap="square"
                style={{
                  animation: `trace-draw ${drawDur}ms ease-out forwards`,
                }}
              />
            )}

            {/* ── BLOCKED: partial draw then cut ── */}
            {!isSettled && (
              <>
                {/* Traveled portion — draws to 55% then fades */}
                <line
                  x1="8" y1="8" x2="165" y2="8"
                  stroke="#A9412C"
                  strokeWidth="3"
                  strokeDasharray="160"
                  strokeDashoffset="160"
                  strokeLinecap="square"
                  style={{ animation: 'trace-deny 500ms ease-out forwards' }}
                />

                {/* "Never traveled" remainder — appears after deny as dashed ghost */}
                {showGhost && (
                  <line
                    ref={ghostRef}
                    x1="165" y1="8" x2="300" y2="8"
                    stroke="#A9412C"
                    strokeWidth="1.5"
                    strokeDasharray="6 8"
                    strokeLinecap="square"
                    style={{ animation: 'trace-ghost 300ms ease-out 400ms both' }}
                  />
                )}

                {/* Spark burst at interception point */}
                {sparking && (
                  <g transform="translate(165,8)">
                    {/* 4 spark rays */}
                    {[0, 45, 90, 135].map((angle) => (
                      <line
                        key={angle}
                        x1="0" y1="0"
                        x2={Math.cos((angle * Math.PI) / 180) * 10}
                        y2={Math.sin((angle * Math.PI) / 180) * 10}
                        stroke="#A9412C"
                        strokeWidth="2"
                        style={{ animation: 'spark 300ms ease-out forwards' }}
                      />
                    ))}
                    <circle r="3" fill="#A9412C" style={{ animation: 'spark 300ms ease-out forwards' }} />
                  </g>
                )}
              </>
            )}

            {/* PCB pad at destination */}
            <rect x="292" y="4" width="8" height="8"
              fill={isSettled ? '#3C5A78' : '#6B6A5F'}
              opacity={isSettled ? '0.8' : '0.3'}
            />
          </svg>
        </div>

        {/* Status line */}
        <div className="mt-2 text-xs font-ledger flex items-center justify-between">
          {isSettled ? (
            <>
              <span className="text-settle-blue">
                ✓ On-chain USDC transferred
                {latencyMs && (
                  <span className="text-graphite ml-2">({latencyMs}ms)</span>
                )}
              </span>
              {explorerUrl && (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-link">
                  View Tx ↗
                </a>
              )}
            </>
          ) : (
            <>
              <span className="text-block-red">
                ⚡ {reason || 'Policy firewall triggered'}
              </span>
              <span className="text-graphite opacity-50">0.000 USDC</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
