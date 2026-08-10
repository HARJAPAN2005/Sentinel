import type { Context } from 'hono';
import { getSentinelStatus, recordPaymentSettled } from './sentinelState';

const COLD_EMAIL_PRICE_MICRO_USDC = 20000;

export async function handleColdEmailRequest(c: Context) {
  try {
    const body = await c.req.json().catch(() => ({}));
    const leadName = clean(body.leadName, 'there');
    const leadCompany = clean(body.leadCompany, 'your team');
    const leadRole = clean(body.leadRole, 'leader');
    const painPoint = clean(body.painPoint, 'manual outbound workflows');
    const txId = c.req.header('x-payment-response') || c.req.header('payment-response') || undefined;
    const event = recordPaymentSettled('cold-email', COLD_EMAIL_PRICE_MICRO_USDC, body.agentId, txId);

    console.log('[SENTINEL] PAYMENT VERIFIED - POST /cold-email handler executing');

    return c.json({
      service: 'cold-email',
      subject: `Reducing ${painPoint} at ${leadCompany}`,
      body:
        `Hi ${leadName},\n\n` +
        `I noticed ${leadCompany} may be dealing with ${painPoint}. ` +
        `Sentinel helps agent workflows stay inside approved spend policies while still using paid x402 APIs on demand.\n\n` +
        `Would it be useful to compare where agent API spend is being approved, blocked, and settled?\n\n` +
        `Best,\nSentinel`,
      receipt: {
        network: 'algorand-testnet',
        asset: 'USDC',
        price: '$0.02',
        txId,
      },
      event,
      sentinel: getSentinelStatus(),
    });
  } catch (error) {
    console.error('Error in cold email handler:', error);
    return c.json({ error: 'Cold email generation failed' }, 500);
  }
}

function clean(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
