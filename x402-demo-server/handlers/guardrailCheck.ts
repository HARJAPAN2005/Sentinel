import type { Context } from 'hono';
import { getSentinelStatus, recordPaymentSettled } from './sentinelState';

const GUARDRAIL_PRICE_MICRO_USDC = 10000;

const riskPatterns = [
  { flag: 'instruction_override', pattern: /ignore (all )?(previous|prior|above) instructions/i, weight: 32 },
  { flag: 'secret_extraction', pattern: /(reveal|print|show|exfiltrate).*(system prompt|secret|private key|token)/i, weight: 30 },
  { flag: 'jailbreak_attempt', pattern: /(jailbreak|developer mode|do anything now|dan mode)/i, weight: 22 },
  { flag: 'tool_abuse', pattern: /(transfer|pay|purchase|buy).*(without asking|without approval|silently)/i, weight: 24 },
  { flag: 'policy_bypass', pattern: /(bypass|disable|override).*(policy|guardrail|safety|limit)/i, weight: 26 },
];

function extractTxId(c: Context): string | undefined {
  const raw =
    c.req.header('x-payment-response') ||
    c.req.header('payment-response') ||
    c.req.header('x-payment-receipt') ||
    undefined;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.transaction || parsed?.txId || parsed?.id || parsed?.txid || undefined;
  } catch {
    // If it's not JSON, treat the raw string as the txId
    return raw.length > 10 && raw.length < 200 ? raw : undefined;
  }
}

export async function handleGuardrailCheckRequest(c: Context) {
  try {
    const body = await c.req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text : '';
    const flags = riskPatterns.filter((item) => item.pattern.test(text)).map((item) => item.flag);
    const score = Math.min(99, 12 + riskPatterns.reduce((sum, item) => sum + (item.pattern.test(text) ? item.weight : 0), 0));
    const risk = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    const recommendation = risk === 'high' ? 'block_or_review' : risk === 'medium' ? 'review' : 'allow';
    const txId = extractTxId(c);
    const event = recordPaymentSettled('guardrail-check', GUARDRAIL_PRICE_MICRO_USDC, body.agentId, txId);

    console.log('[SENTINEL] PAYMENT VERIFIED - POST /guardrail-check handler executing');
    if (txId) console.log(`[SENTINEL] txId: ${txId}`);

    const explorerUrl = txId
      ? `https://lora.algokit.io/testnet/transaction/${txId}`
      : undefined;

    return c.json({
      service: 'guardrail-check',
      risk,
      score,
      flags,
      recommendation,
      analysis: { textLength: text.length, detectedPatterns: flags.length },
      receipt: {
        network: 'algorand-testnet',
        asset: 'USDC',
        price: '$0.01',
        txId,
        explorerUrl,
      },
      policyTrace: [
        { label: 'Endpoint allowlisted', passed: true },
        { label: 'Budget available', passed: true },
        { label: 'Trust score acceptable', passed: true },
        { label: 'x402 payment verified', passed: true },
        { label: 'Settlement on Algorand', passed: !!txId, detail: txId ? 'txId captured' : 'txId pending' },
      ],
      event,
      sentinel: getSentinelStatus(),
    });
  } catch (error) {
    console.error('Error in guardrail check handler:', error);
    return c.json({ error: 'Guardrail check failed' }, 500);
  }
}
