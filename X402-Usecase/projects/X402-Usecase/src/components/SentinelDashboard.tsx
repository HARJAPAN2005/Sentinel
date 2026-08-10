import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Variants } from 'framer-motion'
import { motion } from 'framer-motion'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  callColdEmail,
  callGuardrailCheck,
  callPremiumResearch,
  fetchSentinelStatus,
  resetSentinel,
  setDemoMode,
  type SentinelStepResponse,
} from '../utils/sentinelApi'
import { clearAllWalletSessions } from '../utils/walletSession'
import { DepressButton } from './sentinel/DepressButton'
import { LedgerRow, LedgerState } from './sentinel/LedgerRow'
import { BreakerSwitch } from './sentinel/BreakerSwitch'
import { CurrentTrace } from './sentinel/CurrentTrace'
import { Stamp } from './sentinel/Stamp'

type Step = {
  id: string
  name: string
  endpoint: string
  price: string
  purpose: string
  state: LedgerState
  detail: string
  latencyMs?: number
  response?: any
}

const EXPLORER_BASE = 'https://lora.algokit.io/testnet/transaction'

const initialSteps: Step[] = [
  {
    id: 'guardrail',
    name: 'Prompt Risk Scan',
    endpoint: '/guardrail-check',
    price: '$0.010',
    purpose: 'Inspect risky agent instructions for injection vectors.',
    state: 'ready',
    detail: 'Awaiting policy evaluation',
  },
  {
    id: 'email',
    name: 'Outbound Generator',
    endpoint: '/cold-email',
    price: '$0.020',
    purpose: 'Generate sales copy if task budget permits.',
    state: 'ready',
    detail: 'Awaiting policy evaluation',
  },
  {
    id: 'research',
    name: 'Premium Research',
    endpoint: '/premium-research',
    price: '$0.050',
    purpose: 'Unapproved endpoint test for policy enforcement.',
    state: 'ready',
    detail: 'Awaiting policy evaluation',
  },
]

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function formatMicro(micro: number) {
  return `$${(micro / 1_000_000).toFixed(3)}`
}

function getExplorerUrl(txId?: string) {
  return txId ? `${EXPLORER_BASE}/${txId}` : ''
}

// Panel entrance stagger: 80ms × panel number (1-indexed), sharp ease-out
const panelVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: (panelNum: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: (panelNum - 1) * 0.08,
      duration: 0.24,
      ease: 'easeOut', // sharp ease-out, no drift
    },
  }),
}

const SentinelDashboard: React.FC<{ onConnectWallet: () => void }> = ({ onConnectWallet }) => {
  const { activeAddress, activeWallet, signTransactions } = useWallet()
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')
  const [demoModeState, setDemoModeState] = useState<'safe' | 'full'>('safe')
  const prevTrustScore = useRef<number | null>(null)

  const signer = useMemo(() => {
    if (!activeAddress || !signTransactions) return null
    return { address: activeAddress, activeWallet, signTransactions }
  }, [activeAddress, activeWallet, signTransactions])

  const loadStatus = async () => {
    try {
      setStatus(await fetchSentinelStatus())
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => { loadStatus() }, [])

  const updateStep = (id: string, patch: Partial<Step>) => {
    setSteps((cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const handleReset = async () => {
    setError('')
    setSteps(initialSteps)
    try { setStatus(await resetSentinel()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not reset Sentinel state') }
  }

  const handleDisconnect = async () => {
    setError('')
    clearAllWalletSessions()
    if (activeWallet && typeof activeWallet.disconnect === 'function') {
      try { await activeWallet.disconnect() } catch { /* ignore */ }
    }
    window.location.reload()
  }

  const handleDemoModeToggle = async () => {
    const next = demoModeState === 'safe' ? 'full' : 'safe'
    try {
      await setDemoMode(next)
      setDemoModeState(next)
      setSteps(initialSteps)
      setStatus(await fetchSentinelStatus())
    } catch {
      setError('Failed to switch demo mode')
    }
  }

  const runStep = async (id: string, label: string, fn: (w: any) => Promise<SentinelStepResponse>) => {
    if (!signer) return
    updateStep(id, { state: 'checking', detail: 'Evaluating allowlist, budget, and trust parameters...' })
    await pause(400)
    updateStep(id, { state: 'signing', detail: 'Sentinel approved — awaiting wallet signature via x402...' })

    const t0 = Date.now()
    const result = await fn(signer)
    const latencyMs = Date.now() - t0
    const body = result.data

    if (result.status === 403) {
      updateStep(id, {
        state: 'blocked',
        latencyMs,
        detail: `${body.reason || 'Blocked by Sentinel policy'} — no wallet challenge created`,
        response: body,
      })
    } else if (result.ok) {
      updateStep(id, {
        state: 'settled',
        latencyMs,
        detail: `${label} verified & settled on Algorand TestNet`,
        response: body,
      })
    } else {
      updateStep(id, { state: 'failed', latencyMs, detail: `Network/Protocol error: HTTP ${result.status}`, response: body })
    }

    if (body?.sentinel) setStatus(body.sentinel)
    else await loadStatus()
    await pause(500)
  }

  const handleRunTask = async () => {
    if (!signer) {
      setError('Connect an Algorand TestNet wallet to execute payments.')
      return
    }
    setRunning(true)
    setError('')
    setSteps(initialSteps)
    prevTrustScore.current = status?.policy?.trustScore ?? null

    try {
      await resetSentinel()
      await runStep('guardrail', 'Prompt Risk Scan', callGuardrailCheck)
      await runStep('email', 'Outbound Generator', callColdEmail)
      await runStep('research', 'Premium Research', callPremiumResearch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed')
    } finally {
      setRunning(false)
      await loadStatus()
    }
  }

  const policy   = status?.policy
  const events   = status?.events || []
  const taskBudget = policy?.taskBudgetMicroUsdc ?? 15000
  const spent      = policy?.spentMicroUsdc ?? 0
  const remaining  = policy?.remainingBudgetMicroUsdc ?? taskBudget
  const trustScore = policy?.trustScore ?? 70
  const allowlist: string[] = policy?.allowlistedEndpoints || ['guardrail-check', 'cold-email']

  // Circuit Trace: build list of resolved steps + compute stack index for depth
  const resolvedSteps = steps.filter((s) => s.state === 'settled' || s.state === 'blocked')
  const lastResolvedId = resolvedSteps[resolvedSteps.length - 1]?.id

  const researchStep = steps.find((s) => s.id === 'research')

  return (
    <main className="min-h-screen bg-ink-navy text-paper p-4 md:p-8 font-body">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <motion.header
          custom={0}
          initial="hidden"
          animate="visible"
          variants={panelVariants}
          className="border-b border-graphite/40 pb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-ledger text-xs uppercase tracking-widest text-brass border border-brass/40 px-2 py-0.5">
                AUDITOR'S LEDGER // REVISION 2.6
              </span>
              <span className="font-ledger text-xs text-graphite">NET :: ALGORAND TESTNET</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-paper uppercase">
              Sentinel <span className="text-graphite font-normal text-3xl">/ Policy Engine</span>
            </h1>
            <p className="font-body text-graphite text-sm mt-1 max-w-2xl">
              Autonomous agent spend governance with real-time x402 micro-settlements. Unapproved calls are physical line-item blocks.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Switcher */}
            <div className="border border-graphite/40 bg-ink-navy px-3 py-1.5 flex items-center gap-2 font-ledger text-xs">
              <span className="text-graphite">MODE:</span>
              <button
                onClick={handleDemoModeToggle}
                disabled={running}
                className={`font-mono uppercase font-bold px-2 py-0.5 border ${
                  demoModeState === 'safe' ? 'border-brass text-brass' : 'border-settle-blue text-settle-blue'
                }`}
              >
                {demoModeState === 'safe' ? 'SAFE (1 SETTLE / 2 BLOCKS)' : 'FULL (2 SETTLES / 1 BLOCK)'}
              </button>
            </div>

            <DepressButton
              label={activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'CONNECT WALLET'}
              onClick={onConnectWallet}
              variant="secondary"
            />
            {activeAddress && (
              <DepressButton label="DISCONNECT" onClick={handleDisconnect} disabled={running} variant="danger" />
            )}
            <DepressButton label="RESET" onClick={handleReset} disabled={running} variant="secondary" />
            <DepressButton
              label={running ? 'EXECUTING...' : 'RUN AGENT TASK'}
              onClick={handleRunTask}
              disabled={running || !activeAddress}
              variant="primary"
            />
          </div>
        </motion.header>

        {/* Error Banner */}
        {error && (
          <div className="border border-block-red bg-block-red/10 p-3 text-xs font-ledger text-block-red flex justify-between items-center">
            <span>ERROR :: {error}</span>
            <button onClick={() => setError('')} className="hover:underline">DISMISS</button>
          </div>
        )}

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* COLUMN 1: Policy + Breaker Rail (4 cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Panel 01: Spend Policy Parameters */}
            <motion.div custom={1} initial="hidden" animate="visible" variants={panelVariants} className="panel p-5 space-y-4">
              <h2 className="font-display font-bold text-sm text-graphite uppercase tracking-widest border-b border-graphite/30 pb-2">
                01. Spend Policy Parameters
              </h2>
              <div className="space-y-3 font-ledger text-xs">
                <div className="flex justify-between items-center hairline pb-2">
                  <span className="text-graphite">TASK BUDGET</span>
                  <span className="font-bold text-paper text-sm">{formatMicro(taskBudget)}</span>
                </div>
                <div className="flex justify-between items-center hairline pb-2">
                  <span className="text-graphite">CURRENT SPENT</span>
                  <span className="font-bold text-block-red text-sm">{formatMicro(spent)}</span>
                </div>
                <div className="flex justify-between items-center hairline pb-2">
                  <span className="text-graphite">REMAINING CREDIT</span>
                  <span className="font-bold text-settle-blue text-sm">{formatMicro(remaining)}</span>
                </div>
                {/* Trust Score — hard bar, no rounded edges */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-graphite">TRUST SCORE RATING</span>
                    <span className="font-bold text-paper">{trustScore} / 100</span>
                  </div>
                  <div className="h-2 w-full bg-ink-navy border border-graphite/40">
                    <div
                      className={`h-full transition-all duration-500 ${
                        trustScore >= 60 ? 'bg-settle-blue' : trustScore >= 40 ? 'bg-brass' : 'bg-block-red'
                      }`}
                      style={{ width: `${trustScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Panel 02: Allowlist Breaker Rail */}
            <motion.div custom={2} initial="hidden" animate="visible" variants={panelVariants} className="panel p-5 space-y-4">
              <h2 className="font-display font-bold text-sm text-graphite uppercase tracking-widest border-b border-graphite/30 pb-2">
                02. Allowlist Breaker Rail
              </h2>
              <p className="font-body text-xs text-graphite">
                Physical endpoints toggled active. Unregistered routes trip safety breakers instantly.
              </p>
              <div className="space-y-1">
                <BreakerSwitch label="guardrail-check" on={allowlist.includes('guardrail-check')} />
                <BreakerSwitch label="cold-email" on={allowlist.includes('cold-email')} />
                <BreakerSwitch
                  label="premium-research"
                  on={false}
                  tripped={researchStep?.state === 'blocked'}
                />
              </div>
            </motion.div>

            {/* Middleware Stack — not numbered (it's reference, not a panel) */}
            <motion.div custom={3} initial="hidden" animate="visible" variants={panelVariants} className="panel p-4 font-ledger text-xs text-graphite space-y-2">
              <div className="text-paper font-bold uppercase">Middleware Stack Order:</div>
              <div className="space-y-1 border-l border-graphite/30 pl-3">
                <div>1. CORS &amp; Preflight</div>
                <div>2. Request Logger</div>
                <div className="text-block-red font-bold">3. SENTINEL GUARD (Policy Check)</div>
                <div>4. x402 Payment Middleware</div>
                <div>5. Route Handler</div>
              </div>
            </motion.div>
          </div>

          {/* COLUMN 2: Payment Execution Sequence (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <motion.div custom={3} initial="hidden" animate="visible" variants={panelVariants} className="panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-graphite/30 pb-2">
                <h2 className="font-display font-bold text-sm text-graphite uppercase tracking-widest">
                  03. Payment Execution Sequence
                </h2>
                <span className="font-ledger text-xs text-brass">LIVE CHRONOLOGY</span>
              </div>
              <div className="space-y-1">
                {steps.map((step, idx) => (
                  <LedgerRow
                    key={step.id}
                    index={idx + 1}
                    name={step.name}
                    endpoint={step.endpoint}
                    price={step.price}
                    purpose={step.purpose}
                    state={step.state}
                    detail={step.detail}
                    response={step.response}
                    policyTrace={step.response?.policyTrace}
                    txId={step.response?.receipt?.txId || step.response?.event?.txId}
                    delay={idx}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* COLUMN 3: Circuit Trace + Audit Trail (3 cols) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Panel 04: Circuit Trace — 3D depth stack */}
            <motion.div custom={4} initial="hidden" animate="visible" variants={panelVariants} className="panel p-4 space-y-2">
              <h2 className="font-display font-bold text-sm text-graphite uppercase tracking-widest border-b border-graphite/30 pb-2">
                04. Circuit Trace
              </h2>

              {resolvedSteps.length === 0 ? (
                <p className="font-ledger text-xs text-graphite py-4 text-center">
                  Execute task sequence to observe real-time circuit trace.
                </p>
              ) : (
                // Stacked depth: first resolved = deepest (index 0), last = active (pops forward)
                // We reverse so latest is on top in DOM order, then use stackIndex from bottom
                resolvedSteps.map((s, i) => {
                  const stackIndex = resolvedSteps.length - 1 - i   // 0 = active (last resolved)
                  const isActive   = s.id === lastResolvedId
                  return (
                    <CurrentTrace
                      key={s.id}
                      state={s.state as 'settled' | 'blocked'}
                      endpoint={s.endpoint}
                      reason={s.response?.reason}
                      explorerUrl={getExplorerUrl(s.response?.receipt?.txId || s.response?.event?.txId)}
                      latencyMs={s.latencyMs}
                      isActive={isActive}
                      stackIndex={stackIndex}
                    />
                  )
                })
              )}
            </motion.div>

            {/* Panel 05: Audit Trail Ledger */}
            <motion.div custom={5} initial="hidden" animate="visible" variants={panelVariants} className="panel p-4 space-y-3">
              <h2 className="font-display font-bold text-sm text-graphite uppercase tracking-widest border-b border-graphite/30 pb-2">
                05. Audit Trail Ledger
              </h2>
              {events.length === 0 ? (
                <p className="font-ledger text-xs text-graphite">No stamped entries yet.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-auto pr-1">
                  {events.map((evt: any) => (
                    <div key={evt.id} className="hairline pb-2 font-ledger text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-paper font-bold">{evt.endpoint}</span>
                        <Stamp state={evt.settled ? 'settled' : 'blocked'} />
                      </div>
                      <div className="text-graphite">{evt.reason}</div>
                      {evt.txId && (
                        <a
                          href={getExplorerUrl(evt.txId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="explorer-link block"
                        >
                          View Tx: {evt.txId.slice(0, 12)}...
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-graphite/30 pt-4 font-ledger text-xs text-graphite flex flex-col md:flex-row justify-between items-center gap-2">
          <div>SENTINEL X402 AGENT FIREWALL // ALGORAND TESTNET</div>
          <div>POWERED BY GOPLAUSIBLE FACILITATOR &amp; LUTE WALLET</div>
        </footer>

      </div>
    </main>
  )
}

export default SentinelDashboard
