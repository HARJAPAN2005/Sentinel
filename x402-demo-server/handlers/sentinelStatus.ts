import type { Context } from 'hono';
import { getSentinelStatus, resetSentinelState, setDemoMode } from './sentinelState';

export function handleSentinelStatusRequest(c: Context) {
  return c.json(getSentinelStatus());
}

export function handleSentinelResetRequest(c: Context) {
  return c.json(resetSentinelState());
}

export async function handleSentinelDemoModeRequest(c: Context) {
  const body = await c.req.json().catch(() => ({}));
  const mode = body?.mode === 'full' ? 'full' : 'safe';
  setDemoMode(mode);
  return c.json({ mode, status: getSentinelStatus() });
}
