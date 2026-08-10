import type { Context } from 'hono';

export function handlePremiumResearchRequest(c: Context) {
  return c.json(
    {
      error: 'Premium research should be blocked by Sentinel before this handler runs.',
      paymentCreated: false,
    },
    500
  );
}
