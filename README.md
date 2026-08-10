# 🛡️ Sentinel — Governed Pay-Per-Call for AI Agents

> **The policy and audit layer for x402 agent payments on Algorand.**  
> Not just pay-per-call. **Governed** pay-per-call.

[![Algorand TestNet](https://img.shields.io/badge/Algorand-TestNet-00D4FF?logo=algorand)](https://testnet.algoexplorer.io)
[![x402 Protocol](https://img.shields.io/badge/x402-Protocol-6B48FF)](https://x402.org)
[![USDC](https://img.shields.io/badge/USDC-ASA%2010458941-2775CA)](https://www.circle.com/en/usdc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What Is Sentinel?

Sentinel is an **agent spend policy firewall** built on top of the x402 payment protocol for Algorand.

Every AI agent that calls paid APIs faces the same unresolved problem: **who decides what the agent is allowed to pay for?**

Without Sentinel:
```
Agent Request → 402 Challenge → Wallet Signs → (hope it was appropriate)
```

With Sentinel:
```
Agent Request → Policy Check → DENIED (403, no payment created)
                             → APPROVED → 402 → Wallet Signs → USDC Settled on Algorand
```

The critical difference: **denied requests never become payment challenges**. There is no wallet popup. There is no transaction. The Algorand explorer shows nothing — because nothing happened.

---

## Live Demo Flow

Click **Run Agent Task** and watch:

| Step | Endpoint | Price | Result |
|---|---|---|---|
| 1 | `/guardrail-check` | $0.01 | ✅ **Settled** — real USDC payment on Algorand TestNet, explorer link provided |
| 2 | `/cold-email` | $0.02 | 🚫 **Blocked** — would exceed $0.015 task budget, no payment created |
| 3 | `/premium-research` | $0.05 | 🚫 **Blocked** — endpoint not in allowlist, no payment created |

**The hero proof:** Open the Algorand TestNet explorer. The guardrail-check USDC transfer exists. The cold-email and premium-research transfers do not exist — because Sentinel stopped them before they were ever created.

---

## Architecture

### Middleware Stack (Order Matters)

```
CORS → Logger → Sentinel Guard → x402 Payment Middleware → Route Handler
                    ↓
              Policy Check
              ├── Endpoint allowlisted?  NO → 403 BLOCKED (no payment created)
              ├── Budget available?      NO → 403 BLOCKED (no payment created)
              └── Trust score OK?       YES → x402 proceeds
                                              ↓
                                        402 Challenge sent to client
                                              ↓
                                        Client signs with wallet
                                              ↓
                                        GoPlausible Facilitator verifies
                                              ↓
                                        USDC settled on Algorand TestNet
                                              ↓
                                        200 + receipt + txId
```

### Policy Engine

```typescript
// Every request evaluated before payment middleware
evaluatePolicy(endpoint, priceMicroUsdc, agentId) → {
  approved: boolean
  reason: string
  policyTrace: [
    { label: 'Endpoint allowlisted', passed: boolean },
    { label: 'Budget available',     passed: boolean, detail?: string },
    { label: 'Trust score OK',       passed: boolean },
  ]
}
```

The trust score adjusts dynamically:
- **+2** per approved and settled payment
- **−8** per budget violation
- **−10** per unapproved endpoint attempt

### Event Audit Trail

Every request — approved or blocked — is recorded:

```typescript
type SentinelEvent = {
  endpoint: string
  decision: 'approved' | 'blocked'
  reason: string
  paymentChallengeCreated: boolean   // false for blocked
  walletSignatureRequested: boolean  // false for blocked
  settled: boolean                   // false for blocked
  txId?: string                      // only for settled
  explorerUrl?: string               // Lora testnet link
}
```

---

## Project Structure

```
sentinel-app/
├── x402-demo-server/          # Hono resource server (TypeScript)
│   ├── handlers/
│   │   ├── sentinelState.ts   # Policy engine + event log
│   │   ├── sentinelGuard.ts   # Middleware: runs before x402
│   │   ├── guardrailCheck.ts  # Prompt risk scanner ($0.01)
│   │   ├── coldEmail.ts       # Outbound generator ($0.02)
│   │   ├── premiumResearch.ts # Blocked endpoint ($0.05)
│   │   └── sentinelStatus.ts  # Status + reset + demo-mode
│   ├── endpoints.config.ts    # x402 payment configuration
│   └── index.ts               # Server entry + route registration
│
└── X402-Usecase/
    └── projects/X402-Usecase/
        └── src/
            ├── components/
            │   └── SentinelDashboard.tsx  # Main agent console UI
            └── utils/
                ├── sentinelApi.ts         # API client
                └── weatherApi.ts          # x402 fetch wrapper
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Protocol** | x402 (`@x402/hono`, `@x402/core`, `@x402/avm`) |
| **Network** | Algorand TestNet |
| **Settlement Asset** | USDC (ASA ID: `10458941`) |
| **Facilitator** | GoPlausible (`https://facilitator.goplausible.xyz`) |
| **Backend** | Hono + TypeScript + Node.js |
| **Frontend** | React 18 + Vite + TypeScript |
| **Wallet** | Lute Browser Extension via `@txnlab/use-wallet-react` v4 |
| **Explorer** | Lora by AlgoKit (`lora.algokit.io/testnet`) |

---

## API Endpoints

### Sentinel-Protected (Sentinel Guard + x402)

| Method | Route | Price | Description |
|---|---|---|---|
| `POST` | `/guardrail-check` | $0.01 USDC | Prompt injection + risk scanner. Returns risk score, flags, recommendation. |
| `POST` | `/cold-email` | $0.02 USDC | Outbound email generator. Blocked in safe demo mode (budget exceeded). |
| `POST` | `/premium-research` | $0.05 USDC | Always blocked — not on allowlist. Proves allowlist enforcement. |

### x402 Only (No Sentinel)

| Method | Route | Price | Description |
|---|---|---|---|
| `GET` | `/weather` | $0.005 USDC | Original starter endpoint |
| `POST` | `/meme-generate` | $0.10 USDC | AI meme generator |

### Public (No Payment)

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/info` | Endpoint registry |
| `GET` | `/sentinel/status` | Live policy state + event log |
| `POST` | `/sentinel/reset` | Reset budget + trust score |
| `POST` | `/sentinel/demo-mode` | Switch `safe` / `full` demo mode |

---

## Quickstart

### Prerequisites

- Node.js 18+
- [Lute Wallet](https://lute.app/) browser extension
- Algorand TestNet wallet with:
  - TestNet ALGO (from [TestNet Dispenser](https://bank.testnet.algorand.network/))
  - TestNet USDC (ASA 10458941 — opt in via Lute, then get from a TestNet faucet)

### 1. Clone

```bash
git clone https://github.com/HARJAPAN2005/sentinel.git
cd sentinel/sentinel-app
```

### 2. Backend Setup

```bash
cd x402-demo-server
npm install
cp .env.example .env
```

Edit `.env`:
```env
AVM_ADDRESS=YOUR_ALGORAND_TESTNET_ADDRESS
FACILITATOR_URL=https://facilitator.goplausible.xyz
PORT=4021
```

Start:
```bash
npm start
```

Verify:
```bash
curl http://localhost:4021/health
```

### 3. Frontend Setup

```bash
cd ../X402-Usecase/projects/X402-Usecase
npm install
cp .env.example .env.local
```

`.env.local` defaults are pre-configured for localhost. Start:

```bash
npm run dev
```

Open `http://localhost:5173`

### 4. Run the Demo

1. Click **Connect Wallet** → Choose **Lute** → Approve connection
2. Select demo mode: **🔒 Safe** (1 settlement + 2 blocks) or **🚀 Full** (2 settlements + 1 block)
3. Click **▶ Run Agent Task**
4. Watch the policy evaluation, payment flow, and on-chain settlement in real time
5. Click **View on Algorand Explorer ↗** on the settled step

---

## Demo Modes

| Mode | Budget | guardrail-check | cold-email | premium-research |
|---|---|---|---|---|
| 🔒 **Safe** | $0.015 | ✅ Settled ($0.01) | 🚫 Blocked (over budget) | 🚫 Blocked (not allowlisted) |
| 🚀 **Full** | $0.040 | ✅ Settled ($0.01) | ✅ Settled ($0.02) | 🚫 Blocked (not allowlisted) |

---

## Guardrail Check — Risk Patterns

The `/guardrail-check` endpoint uses NLP pattern matching to score prompt injection risk:

| Flag | Pattern | Weight |
|---|---|---|
| `instruction_override` | "ignore previous instructions" | 32 |
| `secret_extraction` | "reveal system prompt / private key" | 30 |
| `policy_bypass` | "bypass safety limits" | 26 |
| `tool_abuse` | "purchase without approval" | 24 |
| `jailbreak_attempt` | "developer mode / DAN mode" | 22 |

Risk score ≥ 70 → `high` → `block_or_review`  
Risk score ≥ 40 → `medium` → `review`  
Risk score < 40 → `low` → `allow`

The demo prompt intentionally triggers 3 flags (score: 98, risk: `high`).

---

## The On-Chain Proof

After running the demo:

1. Note the `txId` from the guardrail-check receipt
2. Open: `https://lora.algokit.io/testnet/transaction/<txId>`
3. You will see: USDC transfer from your wallet to `AVM_ADDRESS`
4. Search for `cold-email` or `premium-research` transactions: **none exist**

The absence of transactions for blocked calls is the proof that Sentinel worked.

---

## Mainnet Readiness

Sentinel is production-ready with two configuration changes:

```env
# Switch from TestNet to MainNet
VITE_ALGOD_SERVER=https://mainnet-api.algonode.cloud
VITE_ALGOD_NETWORK=mainnet

# Use MainNet USDC (ASA ID: 31566704)
# Update endpoints.config.ts asset ID
```

The policy engine, middleware ordering, and audit trail are identical in both environments.

---

## Security Architecture

Sentinel enforces security at the infrastructure layer, not the application layer:

- **Pre-payment enforcement**: Policy runs in `sentinelGuard` middleware, which executes before `paymentMiddleware`. A blocked request cannot reach x402.
- **No credit risk**: Denied requests consume zero USDC. Budget enforcement is exact.
- **Audit immutability**: The on-chain record for approved payments is permanently verifiable. The absence of records for blocked payments is equally verifiable.
- **Trust score isolation**: Each agent session carries an independent trust score. Policy tightens automatically as violations accumulate.

> **What Sentinel does not claim**: Full protocol security, replay attack prevention, or cryptographic agent identity. Those are facilitator and protocol-layer concerns. Sentinel's scope is spend policy enforcement and audit at the resource server layer.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Built for HackNite Code Royale 2026 · x402 + Algorand Track

> *"The policy and audit layer for x402 agent payments on Algorand."*
