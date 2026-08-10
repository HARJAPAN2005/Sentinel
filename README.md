# 🛡️ Sentinel

<div align="center">

**The policy and audit layer for x402 agent payments on Algorand.**

*Not just pay-per-call. **Governed** pay-per-call.*

[![Algorand TestNet](https://img.shields.io/badge/Algorand-TestNet-00D4FF?style=for-the-badge&logo=algorand&logoColor=white)](https://testnet.algoexplorer.io)
[![x402 Protocol](https://img.shields.io/badge/x402-Protocol-6B48FF?style=for-the-badge)](https://x402.org)
[![USDC](https://img.shields.io/badge/USDC-ASA%2010458941-2775CA?style=for-the-badge)](https://www.circle.com/en/usdc)
[![GoPlausible](https://img.shields.io/badge/Facilitator-GoPlausible-FF6B35?style=for-the-badge)](https://goplausible.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 🛑 The Problem

AI agents that use x402 to call paid APIs face an unresolved control problem:

```mermaid
graph LR
    A[Agent] -->|x402 Request| B(API)
    B -->|402 Challenge| W[Wallet]
    W -.->|Signs Anyway?| B
    
    style A fill:#12161C,stroke:#6B6A5F,color:#E7E4D8,stroke-width:2px
    style B fill:#12161C,stroke:#6B6A5F,color:#E7E4D8,stroke-width:2px
    style W fill:#A9412C,stroke:#12161C,color:#E7E4D8,stroke-width:2px
```

**Who decides what the agent is allowed to pay for?**  
**What prevents it from burning its entire budget on one bad call?**  
**How do you prove, on-chain, that unsafe calls were stopped?**

Sentinel answers all three.

---

## ⚡ The Solution

```mermaid
graph TD
    A[Agent] -->|Request| SG{Sentinel Guard}
    SG -->|BLOCKED 🚫| R1[403 Forbidden<br>No Wallet Prompt<br>No txId Possible]
    SG -->|APPROVED ✅| C[402 Challenge]
    C --> W[Wallet Signs]
    W --> F[GoPlausible Facilitator]
    F --> S[USDC Settled on Algorand]
    
    style A fill:#12161C,stroke:#6B6A5F,color:#E7E4D8,stroke-width:2px
    style SG fill:#12161C,stroke:#C98A3E,color:#E7E4D8,stroke-width:2px
    style R1 fill:#A9412C,stroke:#12161C,color:#E7E4D8,stroke-width:2px
    style S fill:#3C5A78,stroke:#12161C,color:#E7E4D8,stroke-width:2px
```

The critical insight: **denied requests never become payment challenges.**  
The Algorand explorer shows nothing for blocked calls — because nothing happened.

---

## 🏗 Architecture

### Middleware Stack

```mermaid
sequenceDiagram
    participant C as Client Request
    participant CORS as CORS & Preflight
    participant L as Logger
    participant SG as Sentinel Guard
    participant X as x402 Middleware
    participant RH as Route Handler

    C->>CORS: Request
    CORS->>L: Pass
    L->>SG: Logged
    
    rect rgb(30, 35, 42)
    Note over SG: 1. Endpoint Allowlisted?<br>2. Budget Available?<br>3. Trust Score Acceptable?
    end
    
    alt Policy Failed
        SG-->>C: 403 Forbidden (Blocked)
    else Policy Passed
        SG->>X: Approved
        X->>RH: Payment Verified
        RH-->>C: Response + txId
    end
```

### Policy Engine

```mermaid
classDiagram
    class SentinelPolicy {
        +String agentId: "demo-agent-1"
        +Number taskBudget: $0.015 (safe)
        +Number spent: Tracks per settlement
        +Number remaining: Budget - Spent
        +Number trustScore: 70/100
        +List allowlist: [guardrail-check, cold-email]
    }
    
    class ScoreChanges {
        +Settlement approved: +2
        +Budget exceeded: -8
        +Not allowlisted: -10
    }
    
    SentinelPolicy --> ScoreChanges : Adjusts Dynamically
```

### Event Audit Trail (Every Request Logged)

```typescript
type SentinelEvent = {
  id:                       string    // evt-{timestamp}-{n}
  timestamp:                string    // ISO 8601
  agentId:                  string    // agent identity
  endpoint:                 string    // which API was called
  priceMicroUsdc:           number    // cost in microUSDC
  decision:                 'approved' | 'blocked'
  reason:                   string    // exact policy reason
  paymentChallengeCreated:  boolean   // false for blocked
  walletSignatureRequested: boolean   // false for blocked
  settled:                  boolean   // false for blocked
  txId?:                    string    // only for settled
  explorerUrl?:             string    // Lora testnet link
}
```

---

## 🎮 Live Demo Flow

### The Hero Proof

```
Algorand TestNet Explorer

  ✅ FOUND:   guardrail-check payment
              From: <your wallet>
              To:   <AVM_ADDRESS>
              Asset: USDC (ASA 10458941)
              Amount: 10,000 microUSDC ($0.01)

  ❌ NOT FOUND: cold-email payment
  ❌ NOT FOUND: premium-research payment

  → These transactions do not exist because
    Sentinel blocked them before payment creation.
```

---

## 🛡️ Guardrail Risk Engine

```mermaid
graph TD
    P[Input Prompt] --> E[Pattern Matching Engine]
    
    E -->|Weight 32| O[instruction_override]
    E -->|Weight 30| S[secret_extraction]
    E -->|Weight 26| B[policy_bypass]
    E -->|Weight 24| T[tool_abuse]
    E -->|Weight 22| J[jailbreak_attempt]
    
    O --> R{Score = 12 + Σ}
    S --> R
    B --> R
    T --> R
    J --> R
    
    R -->|< 40| L[LOW: allow]
    R -->|40 - 70| M[MEDIUM: review]
    R -->|> 70| H[HIGH: block_or_review]
    
    style H fill:#A9412C,stroke:#12161C,color:#E7E4D8
    style M fill:#C98A3E,stroke:#12161C,color:#E7E4D8
    style L fill:#3C5A78,stroke:#12161C,color:#E7E4D8
```

Demo prompt triggers: `instruction_override` + `secret_extraction` + `tool_abuse`  
→ Score: **98** · Risk: **HIGH** · Recommendation: **block_or_review**

---

## 📂 Project Structure

```
sentinel-app/
│
├── x402-demo-server/                    # Hono Resource Server (TypeScript)
│   │
│   ├── handlers/
│   │   ├── sentinelState.ts             # Policy engine, trust score, event log
│   │   ├── sentinelGuard.ts             # Middleware: policy check before x402
│   │   ├── guardrailCheck.ts            # Prompt risk scanner  — $0.01 USDC
│   │   ├── coldEmail.ts                 # Outbound generator   — $0.02 USDC
│   │   ├── premiumResearch.ts           # Blocked endpoint     — $0.05 USDC
│   │   └── sentinelStatus.ts            # Status, reset, demo-mode handlers
│   │
│   ├── endpoints.config.ts              # x402 price + asset configuration
│   ├── index.ts                         # App entry, middleware ordering
│   └── .env.example                     # Required env vars (safe to commit)
│
└── X402-Usecase/projects/X402-Usecase/  # React + Vite Frontend (Framer Motion UI)
    └── src/
        ├── components/
        │   └── SentinelDashboard.tsx    # Full agent console UI
        ├── utils/
        │   ├── sentinelApi.ts           # API client (reset, status, demo-mode)
        │   ├── weatherApi.ts            # x402 fetch wrapper + signer
        │   └── walletSession.ts         # Session clearing utilities
        └── App.tsx                      # Wallet config (Lute browser extension)
```

---

## 🔌 API Reference

### Sentinel-Protected Endpoints

| Method | Route | Price | Sentinel | Description |
|:---:|:---|:---:|:---:|:---|
| `POST` | `/guardrail-check` | $0.01 | ✅ Allowlisted | NLP prompt risk scanner — returns score, flags, recommendation |
| `POST` | `/cold-email` | $0.02 | ✅ Allowlisted | Outbound email generator — blocked when budget exhausted |
| `POST` | `/premium-research` | $0.05 | ❌ Blocked | Always denied — proves allowlist enforcement works |

### x402-Only Endpoints

| Method | Route | Price | Description |
|:---:|:---|:---:|:---|
| `GET` | `/weather` | $0.005 | Weather data (original starter) |
| `POST` | `/meme-generate` | $0.10 | AI meme generator |

### Public Endpoints

| Method | Route | Description |
|:---:|:---|:---|
| `GET` | `/health` | Server liveness |
| `GET` | `/info` | Registered endpoint list |
| `GET` | `/sentinel/status` | Live policy state + full event log |
| `POST` | `/sentinel/reset` | Reset budget and trust score |
| `POST` | `/sentinel/demo-mode` | Switch `safe` / `full` mode |

---

## 🚀 Quickstart

### Prerequisites

- **Node.js 18+**
- **[Lute Wallet](https://lute.app/)** — browser extension (Chrome/Firefox)
- **Algorand TestNet wallet** with:
  - TestNet ALGO → [dispenser](https://bank.testnet.algorand.network/)
  - TestNet USDC (ASA `10458941`) → opt-in via Lute, get from a faucet

### 1. Clone

```bash
git clone https://github.com/HARJAPAN2005/Sentinel.git
cd Sentinel/sentinel-app
```

### 2. Backend

```bash
cd x402-demo-server
npm install
cp .env.example .env
# Edit .env — set AVM_ADDRESS to your Algorand TestNet wallet
npm start
```

### 3. Frontend

```bash
cd ../X402-Usecase/projects/X402-Usecase
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:5173**

### 4. Demo

```
1. Click "Connect Wallet" → Choose Lute → Approve
2. Select mode: 🔒 Safe (1 settlement) or 🚀 Full (2 settlements)
3. Click "▶ Run Agent Task"
4. Watch: policy evaluation → 402 payment → on-chain settlement
5. Click "View on Algorand Explorer ↗" on the settled step
```

---

## ⚙️ Demo Modes

| Mode | Budget | `/guardrail-check` | `/cold-email` | `/premium-research` |
|:---:|:---:|:---:|:---:|:---:|
| 🔒 **Safe** | $0.015 | ✅ Settled | 🚫 Budget exceeded | 🚫 Not allowlisted |
| 🚀 **Full** | $0.040 | ✅ Settled | ✅ Settled | 🚫 Not allowlisted |

Switch modes live via the toggle in the dashboard header — resets budget + events automatically.

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|:---|:---|:---:|
| Protocol | `@x402/hono` · `@x402/core` · `@x402/avm` | latest |
| Network | Algorand TestNet | — |
| Settlement | USDC (ASA `10458941`) via GoPlausible | — |
| Backend | Hono + TypeScript + Node.js | Hono 4.x |
| Frontend | React 18 + Vite + Tailwind + Framer Motion | Vite 5.x |
| Wallet | Lute + `@txnlab/use-wallet-react` | v4.x |
| Explorer | [Lora by AlgoKit](https://lora.algokit.io/testnet) | — |

---

## 🛡️ Security Scope

Sentinel enforces security at the **resource server middleware layer**:

```mermaid
graph LR
    P[Protocol Layer<br>x402 + GoPlausible]
    S[Sentinel Layer<br>Allowlist, Budget, Trust]
    A[Application Layer<br>Business Logic]
    
    P --> S
    S --> A
    
    style S fill:#C98A3E,stroke:#12161C,color:#12161C,stroke-width:2px
```

**What Sentinel guarantees:**
- ✅ Blocked requests produce zero on-chain transactions
- ✅ Budget enforcement is exact — no overdraft possible
- ✅ Every decision (approved or blocked) is audited with full policyTrace
- ✅ Trust score decays automatically on violations

**What Sentinel does not claim:**
- Cryptographic agent identity verification
- Replay attack prevention (handled by x402/facilitator layer)
- Full protocol security

---

## 🌍 Mainnet Deployment

Two config changes for production:

```env
# Backend .env
AVM_ADDRESS=your_mainnet_address
FACILITATOR_URL=https://facilitator.goplausible.xyz

# Frontend .env.local
VITE_ALGOD_SERVER=https://mainnet-api.algonode.cloud
VITE_ALGOD_NETWORK=mainnet
```

Update `endpoints.config.ts` USDC asset ID from `10458941` (TestNet) → `31566704` (MainNet).

All policy logic, middleware ordering, and audit trail are identical in both environments.

---

## 🎤 One-Line Pitch

> *"Sentinel is the policy firewall for AI agent payments — it doesn't just let agents pay for APIs, it decides whether they're allowed to pay before a single wallet signature is ever requested."*

---

<div align="center">

**Built for HackNite Code Royale 2026 · x402 + Algorand Track**

[View on Algorand TestNet](https://lora.algokit.io/testnet) · [x402 Protocol](https://x402.org) · [GoPlausible](https://goplausible.xyz)

</div>
