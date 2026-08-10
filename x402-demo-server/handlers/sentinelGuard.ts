import type { Context, Next } from 'hono';
import { evaluatePolicy, getSentinelStatus } from './sentinelState';

export function sentinelGuard(endpoint: string, priceMicroUsdc: number) {
  return async (c: Context, next: Next) => {
    const body = await readBodySafely(c);
    const agentId = typeof body?.agentId === 'string' ? body.agentId : 'demo-agent-1';
    const decision = evaluatePolicy(endpoint, priceMicroUsdc, agentId);

    if (!decision.approved) {
      console.log(`[SENTINEL] BLOCKED ${endpoint}: ${decision.reason}`);
      const status = getSentinelStatus();
      const isAllowlisted = status.policy.allowlistedEndpoints.includes(endpoint);
      const budgetRemaining = status.policy.taskBudgetMicroUsdc - status.policy.spentMicroUsdc;
      const budgetOk = budgetRemaining >= priceMicroUsdc;

      return c.json(
        {
          approved: false,
          reason: decision.reason,
          endpoint,
          agentId,
          priceMicroUsdc,
          paymentCreated: false,
          walletSignatureRequested: false,
          policyTrace: [
            { label: 'Endpoint allowlisted', passed: isAllowlisted },
            {
              label: 'Budget available',
              passed: budgetOk,
              detail: budgetOk
                ? undefined
                : `need $${(priceMicroUsdc / 1e6).toFixed(3)}, have $${(budgetRemaining / 1e6).toFixed(3)}`,
            },
            { label: 'Trust score acceptable', passed: status.policy.trustScore >= 30 },
          ],
          sentinel: status,
        },
        403
      );
    }

    console.log(`[SENTINEL] APPROVED ${endpoint}: payment challenge may be created`);
    await next();
  };
}

async function readBodySafely(c: Context) {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    return undefined;
  }
  try {
    return await c.req.raw.clone().json();
  } catch {
    return undefined;
  }
}
