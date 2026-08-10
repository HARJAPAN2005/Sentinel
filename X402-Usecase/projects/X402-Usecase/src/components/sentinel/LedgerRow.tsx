import React from 'react'
import { motion } from 'framer-motion'
import { Stamp } from './Stamp'

export type LedgerState = 'ready' | 'checking' | 'signing' | 'settled' | 'blocked' | 'failed'

interface PolicyTrace {
  label: string
  passed: boolean
  detail?: string
}

interface LedgerRowProps {
  index: number
  name: string
  endpoint: string
  price: string
  purpose: string
  state: LedgerState
  detail: string
  policyTrace?: PolicyTrace[]
  txId?: string
  explorerUrl?: string
  response?: any
  delay?: number
}

const EXPLORER_BASE = 'https://lora.algokit.io/testnet/transaction'

function getExplorerUrl(txId?: string) {
  return txId ? `${EXPLORER_BASE}/${txId}` : ''
}

export function LedgerRow({
  index,
  name,
  endpoint,
  price,
  purpose,
  state,
  detail,
  policyTrace,
  txId,
  response,
  delay = 0,
}: LedgerRowProps) {
  const [expanded, setExpanded] = React.useState(false)
  const resolvedTxId = txId || response?.receipt?.txId || response?.event?.txId

  const isTerminal = state === 'settled' || state === 'blocked' || state === 'failed'

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.15, duration: 0.3, ease: 'easeOut' }}
      className={`hairline py-4 ${state === 'blocked' ? 'animate-flash-red' : ''}`}
    >
      {/* Main ledger line — number | name | stamp | price */}
      <div className="flex items-start gap-4">
        {/* Row number — justified, ledger style */}
        <span className="font-ledger text-graphite text-sm w-6 text-right shrink-0 pt-0.5">
          {index}.
        </span>

        {/* Name + endpoint + purpose */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display font-semibold text-paper text-sm tracking-wide">
              {name}
            </h3>
            {isTerminal && <Stamp state={state === 'settled' ? 'settled' : 'blocked'} />}
            {!isTerminal && state !== 'ready' && (
              <span className="font-ledger text-brass text-xs uppercase tracking-widest">
                {state === 'checking' ? '◆ evaluating' : '◆ signing'}
              </span>
            )}
          </div>
          <p className="font-body text-graphite text-xs mt-1">{purpose}</p>
        </div>

        {/* Price + endpoint — flush right, monospace */}
        <div className="text-right shrink-0">
          <div className="font-ledger font-bold text-paper text-sm">{price}</div>
          <div className="font-ledger text-graphite text-xs">{endpoint}</div>
        </div>
      </div>

      {/* Detail line */}
      <div className="ml-10 mt-2">
        <p className="font-body text-graphite text-xs">{detail}</p>
      </div>

      {/* Settlement proof */}
      {state === 'settled' && (
        <div className="ml-10 mt-3 border-l-2 border-settle-blue pl-3">
          <p className="font-body text-settle-blue text-xs font-medium">
            On-chain proof — payment settled on Algorand TestNet
          </p>
          {resolvedTxId ? (
            <a
              href={getExplorerUrl(resolvedTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link mt-1 inline-block"
            >
              View on Algorand Explorer ↗
            </a>
          ) : (
            <p className="font-ledger text-graphite text-xs mt-1">
              Settlement verified by x402 facilitator
            </p>
          )}
        </div>
      )}

      {/* Block proof */}
      {state === 'blocked' && (
        <div className="ml-10 mt-3 border-l-2 border-block-red pl-3">
          <p className="font-body text-block-red text-xs font-medium">
            No explorer link — Sentinel blocked payment before transaction creation
          </p>
          <p className="font-ledger text-graphite text-xs mt-0.5">
            No wallet prompt · No transaction · No on-chain activity
          </p>
        </div>
      )}

      {/* Policy trace */}
      {policyTrace && policyTrace.length > 0 && (
        <div className="ml-10 mt-3 space-y-1">
          {policyTrace.map((t, i) => (
            <div key={i} className="flex items-center gap-2 font-ledger text-xs">
              <span className={t.passed ? 'text-settle-blue' : 'text-block-red'}>
                {t.passed ? '✓' : '✗'}
              </span>
              <span className={t.passed ? 'text-graphite' : 'text-block-red'}>
                {t.label}
              </span>
              {t.detail && (
                <span className="text-graphite opacity-50">— {t.detail}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Raw response toggle */}
      {response && (
        <>
          <button
            onClick={() => setExpanded((x) => !x)}
            className="ml-10 mt-2 font-ledger text-xs text-graphite opacity-40 hover:opacity-70 transition-opacity"
          >
            {expanded ? '▲ hide response' : '▼ show response'}
          </button>
          {expanded && (
            <pre className="ml-10 mt-2 p-3 bg-ink-navy border border-graphite/20 font-ledger text-xs text-graphite overflow-auto max-h-48">
              {JSON.stringify(response, null, 2)}
            </pre>
          )}
        </>
      )}
    </motion.div>
  )
}
