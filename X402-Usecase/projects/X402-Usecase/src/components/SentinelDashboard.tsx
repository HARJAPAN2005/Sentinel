import React, { useEffect, useMemo, useRef, useState } from 'react'
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

// ─── Types ──────────────────────────────────────────────────────────────────

type StepState = 'ready' | 'checking' | 'signing' | 'settled' | 'blocked' | 'failed'

type Step = {
  id: string
  name: string
  endpoint: string
  price: string
  purpose: string
  state: StepState
  detail: string
  response?: any
}

type PolicyTrace = { label: string; passed: boolean; detail?: string }

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPLORER_BASE = 'https://lora.algokit.io/testnet/transaction'

const initialSteps: Step[] = [
  {
    id: 'guardrail',
    name: 'Prompt Risk Scan',
    endpoint: '/guardrail-check',
    price: '$0.01',
    purpose: 'Check a risky agent instruction before it continues.',
    state: 'ready',
    detail: 'Awaiting policy evaluation',
  },
  {
    id: 'email',
    name: 'Outbound Generator',
    endpoint: '/cold-email',
    price: '$0.02',
    purpose: 'Generate a paid sales artifact if budget allows.',
    state: 'ready',
    detail: 'Awaiting policy evaluation',
  },
  {
    id: 'research',
    name: 'Premium Research',
    endpoint: '/premium-research',
    price: '$0.05',
    purpose: 'Deliberately unapproved endpoint for allowlist proof.',
    state: 'ready',
    detail: 'Awaiting policy evaluation',
  },
]

const stateClasses: Record<StepState, string> = {
  ready: 'border-slate-700 bg-slate-900 text-slate-200',
  checking: 'border-amber-400 bg-amber-950 text-amber-100',
  signing: 'border-sky-400 bg-sky-950 text-sky-100',
  settled: 'border-emerald-400 bg-emerald-950 text-emerald-100',
  blocked: 'border-red-400 bg-red-950 text-red-100',
  failed: 'border-rose-400 bg-rose-950 text-rose-100',
}

const stateLabel: Record<StepState, string> = {
  ready: 'Ready',
  checking: 'Policy Check',
  signing: 'x402 Payment',
  settled: 'Settled ✓',
  blocked: 'Blocked',
  failed: 'Failed',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function formatMicro(micro: number) {
  return `$${(micro / 1_000_000).toFixed(3)}`
}

function budgetPercent(policy: any) {
  const budget = policy?.taskBudgetMicroUsdc || 15000
  const spent = policy?.spentMicroUsdc || 0
  return Math.min(100, Math.round((spent / budget) * 100))
}

function budgetBarColor(pct: number) {
  if (pct >= 85) return 'bg-red-400'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-emerald-400'
}

function explorerUrl(txId?: string) {
  return txId ? `${EXPLORER_BASE}/${txId}` : ''
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? 'text-emerald-300' : 'text-slate-100'}`}>{value}</span>
    </div>
  )
}

function PolicyTraceRow({ trace }: { trace: PolicyTrace }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`mt-0.5 shrink-0 ${trace.passed ? 'text-emerald-400' : 'text-red-400'}`}>
        {trace.passed ? '✓' : '✗'}
      </span>
      <span className={trace.passed ? 'text-slate-300' : 'text-red-200'}>
        {trace.label}
        {trace.detail && <span className="ml-1 text-slate-500">— {trace.detail}</span>}
      </span>
    </div>
  )
}

function StepCard({ step }: { step: Step }) {
  const [expanded, setExpanded] = useState(false)
  const txId = step.response?.receipt?.txId || step.response?.event?.txId
  const url = explorerUrl(txId)
  const policyTrace: PolicyTrace[] = step.response?.policyTrace || []

  return (
    <div className={`rounded border p-4 transition-all duration-500 ${stateClasses[step.state]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
            {initialSteps.findIndex((s) => s.id === step.id) + 1}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{step.name}</h3>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                step.state === 'settled' ? 'bg-emerald-800 text-emerald-200' :
                step.state === 'blocked' ? 'bg-red-900 text-red-200' :
                step.state === 'checking' ? 'bg-amber-900 text-amber-200' :
                step.state === 'signing' ? 'bg-sky-900 text-sky-200' :
                'bg-slate-800 text-slate-300'
              }`}>
                {stateLabel[step.state]}
              </span>
            </div>
            <p className="mt-0.5 text-xs opacity-70">{step.purpose}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-sm font-bold">{step.price}</div>
          <div className="text-xs opacity-50">{step.endpoint}</div>
        </div>
      </div>

      <p className="mt-3 text-xs opacity-80">{step.detail}</p>

      {/* Explorer link for settled */}
      {step.state === 'settled' && (
        <div className="mt-3 rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2">
          <p className="text-xs font-medium text-emerald-300">On-chain proof: payment settled on Algorand TestNet</p>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400 underline hover:text-emerald-200">
              View on Algorand Explorer ↗
            </a>
          ) : (
            <p className="mt-1 text-xs text-emerald-500">Settlement verified by x402 facilitator</p>
          )}
        </div>
      )}

      {/* Block proof */}
      {step.state === 'blocked' && (
        <div className="mt-3 rounded border border-red-800 bg-red-900/30 px-3 py-2">
          <p className="text-xs font-medium text-red-300">No explorer link — Sentinel blocked payment before transaction creation</p>
          <p className="mt-0.5 text-xs text-red-500">No wallet prompt. No transaction. No on-chain activity.</p>
        </div>
      )}

      {/* Policy trace */}
      {policyTrace.length > 0 && (
        <div className="mt-3 space-y-1 rounded border border-slate-700 bg-slate-900/60 px-3 py-2">
          <p className="mb-1.5 text-xs font-medium text-slate-400">Policy Evaluation</p>
          {policyTrace.map((t, i) => <PolicyTraceRow key={i} trace={t} />)}
        </div>
      )}

      {/* Response JSON toggle */}
      {step.response && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="mt-3 text-xs opacity-50 hover:opacity-80 transition-opacity"
        >
          {expanded ? '▲ Hide' : '▼ Show'} raw response
        </button>
      )}
      {expanded && step.response && (
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/40 p-3 text-xs text-slate-300">
          {JSON.stringify(step.response, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ProofPanel({ events }: { events: any[] }) {
  const settled = events.filter((e) => e.settled)
  const blocked = events.filter((e) => !e.settled)

  if (!events.length) return null

  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
        Approved vs Blocked Proof
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-2 text-xs font-medium text-emerald-400">On-Chain Payments</p>
          {settled.length === 0 ? (
            <p className="text-xs text-slate-600">None yet</p>
          ) : settled.map((e) => (
            <div key={e.id} className="mb-2 rounded border border-emerald-800 bg-emerald-950/40 px-2 py-2">
              <p className="text-xs font-medium text-emerald-300">{e.endpoint}</p>
              <p className="text-xs text-emerald-500">{formatMicro(e.priceMicroUsdc)} — settled</p>
              {e.txId && (
                <a href={explorerUrl(e.txId)} target="_blank" rel="noopener noreferrer"
                  className="mt-0.5 block text-xs text-emerald-400 underline hover:text-emerald-200">
                  View on Explorer ↗
                </a>
              )}
              {!e.txId && <p className="mt-0.5 text-xs text-emerald-600">Payment verified by x402</p>}
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-red-400">Blocked Before Payment</p>
          {blocked.length === 0 ? (
            <p className="text-xs text-slate-600">None yet</p>
          ) : blocked.map((e) => (
            <div key={e.id} className="mb-2 rounded border border-red-900 bg-red-950/40 px-2 py-2">
              <p className="text-xs font-medium text-red-300">{e.endpoint}</p>
              <p className="text-xs text-red-500">{e.reason}</p>
              <p className="mt-0.5 text-xs text-red-700">No explorer link possible</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SentinelDashboard: React.FC<{ onConnectWallet: () => void }> = ({ onConnectWallet }) => {
  const { activeAddress, activeWallet, signTransactions } = useWallet()
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')
  const [demoMode, setDemoModeState] = useState<'safe' | 'full'>('safe')
  const prevTrustScore = useRef<number | null>(null)

  const signer = useMemo(() => {
    if (!activeAddress || !signTransactions) return null
    return { address: activeAddress, activeWallet, signTransactions }
  }, [activeAddress, activeWallet, signTransactions])

  const loadStatus = async () => {
    try { setStatus(await fetchSentinelStatus()) } catch { setStatus(null) }
  }

  useEffect(() => { loadStatus() }, [])

  const updateStep = (id: string, patch: Partial<Step>) => {
    setSteps((cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const handleReset = async () => {
    setError('')
    setSteps(initialSteps)
    try { setStatus(await resetSentinel()) } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset Sentinel')
    }
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
    const next = demoMode === 'safe' ? 'full' : 'safe'
    try {
      await setDemoMode(next)
      setDemoModeState(next)
      setSteps(initialSteps)
      setStatus(await fetchSentinelStatus())
    } catch (err) {
      setError('Could not switch demo mode')
    }
  }

  const runStep = async (id: string, label: string, fn: (w: any) => Promise<SentinelStepResponse>) => {
    if (!signer) return
    updateStep(id, { state: 'checking', detail: 'Sentinel evaluating endpoint and budget policy…' })
    await pause(450)
    updateStep(id, { state: 'signing', detail: 'Sentinel approved — x402 payment challenge created, awaiting wallet signature…' })

    const result = await fn(signer)
    const body = result.data

    if (result.status === 403) {
      updateStep(id, {
        state: 'blocked',
        detail: `${body.reason || 'Blocked by Sentinel'} — no wallet prompt, no transaction created`,
        response: body,
      })
    } else if (result.ok) {
      const txId = body?.receipt?.txId || body?.event?.txId
      updateStep(id, {
        state: 'settled',
        detail: `${label} settled on Algorand TestNet`,
        response: body,
      })
    } else {
      updateStep(id, { state: 'failed', detail: `HTTP ${result.status}`, response: body })
    }

    if (body?.sentinel) setStatus(body.sentinel)
    else await loadStatus()
    await pause(600)
  }

  const handleRunTask = async () => {
    if (!signer) { setError('Connect a TestNet wallet before running the agent task.'); return }
    setRunning(true)
    setError('')
    setSteps(initialSteps)
    prevTrustScore.current = status?.policy?.trustScore ?? null

    try {
      await resetSentinel()
      await runStep('guardrail', 'Prompt risk scan', callGuardrailCheck)
      await runStep('email', 'Outbound generator', callColdEmail)
      await runStep('research', 'Premium research', callPremiumResearch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sentinel run failed')
    } finally {
      setRunning(false)
      await loadStatus()
    }
  }

  const policy = status?.policy
  const events = status?.events || []
  const pct = budgetPercent(policy)
  const trustScore = policy?.trustScore ?? 70
  const trustDiff = prevTrustScore.current !== null && !running
    ? trustScore - prevTrustScore.current : null

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5">

        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-red-300">x402 Algorand Agent Infrastructure</p>
            <h1 className="text-3xl font-bold">Sentinel</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Programmable spend control for autonomous agents — real x402 payments on Algorand TestNet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Demo mode toggle */}
            <div className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-1.5">
              <span className="text-xs text-slate-400">Demo:</span>
              <button
                onClick={handleDemoModeToggle}
                disabled={running}
                className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                  demoMode === 'safe'
                    ? 'bg-amber-800 text-amber-200'
                    : 'bg-emerald-800 text-emerald-200'
                }`}
              >
                {demoMode === 'safe' ? '🔒 Safe (1 settlement)' : '🚀 Full (2 settlements)'}
              </button>
            </div>

            <button className="btn btn-sm border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={onConnectWallet}>
              {activeAddress ? `${activeAddress.slice(0, 10)}…${activeAddress.slice(-4)}` : 'Connect Wallet'}
            </button>
            {activeAddress && (
              <button className="btn btn-sm border-rose-700 bg-rose-950 text-rose-300 hover:bg-rose-900" onClick={handleDisconnect} disabled={running}>
                Disconnect
              </button>
            )}
            <button className="btn btn-sm border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={handleReset} disabled={running}>
              Reset
            </button>
            <button className="btn btn-sm border-emerald-400 bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={handleRunTask} disabled={running || !activeAddress}>
              {running ? '⏳ Running…' : '▶ Run Agent Task'}
            </button>
          </div>
        </header>

        {/* Error bar */}
        {error && (
          <div className="flex items-start justify-between rounded border border-red-500 bg-red-950 px-4 py-3 text-sm text-red-100">
            <span>{error}</span>
            <button className="ml-4 shrink-0 text-red-300 hover:text-red-100" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* Main grid */}
        <section className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">

          {/* ── Policy Panel ── */}
          <aside className="flex flex-col gap-4">
            <div className="rounded border border-slate-800 bg-slate-900 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Policy</h2>
              <div className="mt-4 space-y-3">
                <Metric label="Task Budget" value={formatMicro(policy?.taskBudgetMicroUsdc ?? 15000)} />
                <Metric label="Spent" value={formatMicro(policy?.spentMicroUsdc ?? 0)} />
                <Metric label="Remaining" value={formatMicro(policy?.remainingBudgetMicroUsdc ?? 15000)} highlight />

                {/* Budget burn bar */}
                <div className="pt-1">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                    <span>Budget Burn</span>
                    <span className={pct >= 85 ? 'text-red-400 font-bold' : pct >= 50 ? 'text-amber-400' : 'text-emerald-400'}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${budgetBarColor(pct)} ${pct >= 85 ? 'animate-pulse' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Trust score */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Trust Score</span>
                    <div className="flex items-center gap-2">
                      {trustDiff !== null && trustDiff !== 0 && (
                        <span className={`text-xs font-bold ${trustDiff > 0 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                          {trustDiff > 0 ? `+${trustDiff}` : trustDiff}
                        </span>
                      )}
                      <span className={`font-mono text-lg font-bold ${
                        trustScore >= 60 ? 'text-emerald-300' :
                        trustScore >= 40 ? 'text-amber-300' : 'text-red-300'
                      }`}>
                        {trustScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        trustScore >= 60 ? 'bg-emerald-400' :
                        trustScore >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${trustScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Allowlist */}
            <div className="rounded border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">Allowlist</h2>
              <div className="space-y-1.5">
                {(policy?.allowlistedEndpoints || ['guardrail-check', 'cold-email']).map((ep: string) => (
                  <div key={ep} className="flex items-center gap-2 rounded bg-emerald-950 px-2 py-1.5 text-xs text-emerald-300">
                    <span className="text-emerald-500">✓</span>
                    <span className="font-mono">/{ep}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded bg-red-950/40 px-2 py-1.5 text-xs text-red-400">
                  <span className="text-red-600">✗</span>
                  <span className="font-mono">/premium-research</span>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Agent Workflow ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Agent Workflow</h2>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">TestNet</span>
            </div>
            {steps.map((step) => <StepCard key={step.id} step={step} />)}

            {/* Middleware architecture note */}
            <div className="rounded border border-slate-800 bg-slate-900/60 px-4 py-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">Middleware Order</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                {['CORS', 'Logger', 'Sentinel Guard', 'x402 Middleware', 'Handler'].map((item, i, arr) => (
                  <React.Fragment key={item}>
                    <span className={`rounded px-2 py-0.5 ${item === 'Sentinel Guard' ? 'bg-red-900/60 text-red-300 font-semibold' : 'bg-slate-800 text-slate-300'}`}>
                      {item}
                    </span>
                    {i < arr.length - 1 && <span className="text-slate-600">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-600">Denied requests return 403 before reaching x402 — no payment ever created</p>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="flex flex-col gap-4">

            {/* Proof panel */}
            <ProofPanel events={events} />

            {/* Payment Ledger */}
            <div className="rounded border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">Payment Ledger</h2>
              {events.length === 0 ? (
                <p className="text-xs text-slate-600">No events yet — run the agent task to see the audit trail.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event: any) => (
                    <div
                      key={event.id}
                      className={`rounded border px-3 py-2 text-xs ${
                        event.settled
                          ? 'border-emerald-800 bg-emerald-950/40'
                          : 'border-red-900 bg-red-950/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium text-slate-200">{event.endpoint}</span>
                        <span className={`font-semibold ${event.settled ? 'text-emerald-400' : 'text-red-400'}`}>
                          {event.settled ? 'settled' : 'blocked'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-500">{event.reason}</div>
                      {event.txId && (
                        <a
                          href={explorerUrl(event.txId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-emerald-400 underline hover:text-emerald-200"
                        >
                          View on Explorer ↗
                        </a>
                      )}
                      <div className="mt-0.5 text-slate-600">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default SentinelDashboard
