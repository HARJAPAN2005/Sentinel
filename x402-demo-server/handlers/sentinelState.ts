export type SentinelDecision = 'approved' | 'blocked';

export type PolicyTrace = {
  label: string;
  passed: boolean;
  detail?: string;
};

export type SentinelEvent = {
  id: string;
  timestamp: string;
  agentId: string;
  endpoint: string;
  priceMicroUsdc: number;
  decision: SentinelDecision;
  reason: string;
  paymentChallengeCreated: boolean;
  walletSignatureRequested: boolean;
  settled: boolean;
  txId?: string;
  explorerUrl?: string;
};

export type SentinelPolicy = {
  agentId: string;
  taskBudgetMicroUsdc: number;
  spentMicroUsdc: number;
  allowlistedEndpoints: string[];
  trustScore: number;
  demoMode: 'safe' | 'full';
};

const DEFAULT_AGENT_ID = 'demo-agent-1';
const SAFE_BUDGET_MICRO_USDC = 15000;   // $0.015 — lets guardrail settle, blocks cold-email
const FULL_BUDGET_MICRO_USDC = 40000;   // $0.040 — lets guardrail + cold-email settle, blocks premium-research
const DEFAULT_TRUST_SCORE = 70;
const ALLOWLIST = new Set(['guardrail-check', 'cold-email']);

const policy: SentinelPolicy = {
  agentId: DEFAULT_AGENT_ID,
  taskBudgetMicroUsdc: SAFE_BUDGET_MICRO_USDC,
  spentMicroUsdc: 0,
  allowlistedEndpoints: Array.from(ALLOWLIST),
  trustScore: DEFAULT_TRUST_SCORE,
  demoMode: 'safe',
};

const events: SentinelEvent[] = [];

function clampTrustScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function addEvent(event: Omit<SentinelEvent, 'id' | 'timestamp'>) {
  const nextEvent: SentinelEvent = {
    ...event,
    id: `evt-${Date.now()}-${events.length + 1}`,
    timestamp: new Date().toISOString(),
  };
  events.unshift(nextEvent);
  events.splice(25);
  return nextEvent;
}

export function getSentinelStatus() {
  return {
    policy: {
      ...policy,
      remainingBudgetMicroUsdc: Math.max(0, policy.taskBudgetMicroUsdc - policy.spentMicroUsdc),
    },
    events,
  };
}

export function resetSentinelState() {
  policy.spentMicroUsdc = 0;
  policy.trustScore = DEFAULT_TRUST_SCORE;
  events.length = 0;
  return getSentinelStatus();
}

export function setDemoMode(mode: 'safe' | 'full') {
  policy.demoMode = mode;
  policy.taskBudgetMicroUsdc = mode === 'full' ? FULL_BUDGET_MICRO_USDC : SAFE_BUDGET_MICRO_USDC;
  policy.spentMicroUsdc = 0;
  policy.trustScore = DEFAULT_TRUST_SCORE;
  events.length = 0;
  console.log(`[SENTINEL] Demo mode set to "${mode}" — budget: $${(policy.taskBudgetMicroUsdc / 1e6).toFixed(3)}`);
}

export function evaluatePolicy(endpoint: string, priceMicroUsdc: number, agentId = DEFAULT_AGENT_ID) {
  if (!ALLOWLIST.has(endpoint)) {
    policy.trustScore = clampTrustScore(policy.trustScore - 10);
    const event = addEvent({
      agentId,
      endpoint,
      priceMicroUsdc,
      decision: 'blocked',
      reason: 'endpoint not allow-listed',
      paymentChallengeCreated: false,
      walletSignatureRequested: false,
      settled: false,
    });
    return { approved: false, reason: event.reason, policy, event };
  }

  if (policy.spentMicroUsdc + priceMicroUsdc > policy.taskBudgetMicroUsdc) {
    policy.trustScore = clampTrustScore(policy.trustScore - 8);
    const event = addEvent({
      agentId,
      endpoint,
      priceMicroUsdc,
      decision: 'blocked',
      reason: 'would exceed task budget',
      paymentChallengeCreated: false,
      walletSignatureRequested: false,
      settled: false,
    });
    return { approved: false, reason: event.reason, policy, event };
  }

  return { approved: true, reason: 'within policy', policy };
}

export function recordPaymentSettled(
  endpoint: string,
  priceMicroUsdc: number,
  agentId = DEFAULT_AGENT_ID,
  txId?: string,
) {
  policy.spentMicroUsdc += priceMicroUsdc;
  policy.trustScore = clampTrustScore(policy.trustScore + 2);

  const explorerUrl = txId
    ? `https://lora.algokit.io/testnet/transaction/${txId}`
    : undefined;

  return addEvent({
    agentId,
    endpoint,
    priceMicroUsdc,
    decision: 'approved',
    reason: 'payment settled',
    paymentChallengeCreated: true,
    walletSignatureRequested: true,
    settled: true,
    txId,
    explorerUrl,
  });
}

export function formatMicroUsdc(amount: number) {
  return `$${(amount / 1_000_000).toFixed(3)}`;
}
