<div align="center">

<img src="artifacts/fine-print-guardian/public/logo.svg" alt="Fine-Print Guardian Logo" width="80" height="80" />

# Fine-Print Guardian

**Read the contract. Understand the risk. Sign with confidence.**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Groq](https://img.shields.io/badge/Powered%20by-Groq%20AI-f55036?logo=groq&logoColor=white)](https://groq.com/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

</div>

---

## What is Fine-Print Guardian?

Fine-Print Guardian is an **AI-powered contract analysis platform** that scans legal documents clause by clause and tells you exactly what you're agreeing to — in plain English.

Paste or upload any contract (subscription ToS, apartment lease, freelance agreement) and get back:

- 🔴 **Red flags** — clauses that strongly favour the other party or waive your rights
- 🟡 **Cautions** — terms that deserve a closer read before signing
- 🟢 **Safe clauses** — standard, balanced language with no unusual risk
- 💬 **Negotiation prompts** — concrete questions to ask before you sign
- 📊 **Overall risk score** — one-glance verdict on the whole document

The analysis engine uses **Groq's Llama 3.3 70B** for deep, context-aware clause classification, with an offline rule-based fallback for environments without an API key.

---

## Screenshots

> _Paste your contract → instant clause-by-clause breakdown with risk annotations_

| Document Analysis | Risk Dashboard |
|---|---|
| Inline clause annotations with risk level and plain-English explanation | Per-category risk breakdown with red-flag and caution counts |

---

## Features

- **AI clause analysis** — Llama 3.3 70B via Groq classifies each clause using CUAD legal taxonomy
- **Rule-based fallback** — works offline or without an API key using pattern heuristics
- **CUAD taxonomy** — 20 category tags (Arbitration, Auto-Renewal, Data Collection, Indemnification, and more)
- **Async scan jobs** — progress tracked in the database with auto-retry (up to 3 attempts)
- **Auth via Clerk** — sign-in / sign-up with guest session support (no-friction first use)
- **Document watches** — monitor terms for silent changes (v2 roadmap)
- **Dark mode** — full system-preference-aware theme
- **Type-safe full stack** — OpenAPI spec → Orval codegen → React Query hooks + Zod schemas
- **pnpm workspace** — monorepo with shared libs (`api-spec`, `api-client-react`, `api-zod`, `db`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite + Tailwind CSS + shadcn/ui |
| **Backend** | Express 5 + Node.js 24 |
| **Database** | PostgreSQL 16 + Drizzle ORM |
| **AI** | Groq (Llama 3.3 70B) + rule-based fallback |
| **Auth** | Clerk (JWT + guest sessions) |
| **Validation** | Zod v4 + drizzle-zod |
| **API codegen** | Orval (OpenAPI → React Query hooks) |
| **Build** | esbuild (API), Vite (frontend) |
| **Package manager** | pnpm workspaces |
| **Language** | TypeScript 5.9 (strict) |

---

## Project Structure

```
fine-print-guardian/
├── artifacts/
│   ├── api-server/          # Express 5 API (routes, analyzer, auth middleware)
│   └── fine-print-guardian/ # React + Vite frontend
├── lib/
│   ├── api-spec/            # OpenAPI spec (single source of truth)
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validation schemas
│   └── db/                  # Drizzle ORM schema + client
├── scripts/                 # Utility scripts
├── package.json             # Root workspace config
├── pnpm-workspace.yaml      # Workspace package discovery
└── tsconfig.base.json       # Shared TypeScript config
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 24
- **pnpm** ≥ 9
- **PostgreSQL** ≥ 16

### 1. Clone & install

```bash
git clone https://github.com/Wooinxlkz/fine-print-guardian.git
cd fine-print-guardian
pnpm install
```

### 2. Environment variables

Create a `.env` file in the root (or set variables in your shell):

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/fineprintguardian

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...
SESSION_SECRET=your-random-session-secret

# AI analysis (optional — falls back to rule-based if not set)
GROQ_API_KEY=gsk_...
```

> **Get a Groq API key for free** at [console.groq.com](https://console.groq.com) — the free tier is generous for personal use.

### 3. Set up the database

```bash
pnpm --filter @workspace/db run push
```

### 4. Run the API server

```bash
pnpm --filter @workspace/api-server run dev
# Listens on port 8080 → available at /api
```

### 5. Run the frontend

```bash
pnpm --filter @workspace/fine-print-guardian run dev
# Open http://localhost:5173
```

---

## API Overview

The full OpenAPI spec lives at [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents` | Upload a contract for analysis |
| `GET` | `/api/documents` | List all your documents |
| `GET` | `/api/documents/:id` | Get a document with its clauses |
| `POST` | `/api/documents/:id/scan` | Trigger AI analysis |
| `GET` | `/api/documents/:id/scan-status` | Poll scan progress |
| `GET` | `/api/documents/:id/clauses` | Get all analyzed clauses |
| `DELETE` | `/api/documents/:id` | Delete a document |
| `GET` | `/api/dashboard` | Aggregated stats and risk breakdown |
| `POST` | `/api/watches` | Set a document watch |
| `GET` | `/api/healthz` | Health check |

After any OpenAPI spec change, regenerate hooks and schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## How the AI Analysis Works

1. **Segment** — The document is split into logical paragraphs/clauses
2. **Batch** — Clauses are sent to Groq in batches of 12
3. **Classify** — Llama 3.3 70B labels each clause with:
   - A CUAD category tag (e.g. "Arbitration / Dispute Resolution")
   - A risk level: `safe` / `caution` / `red_flag`
   - A plain-English explanation
   - A negotiation prompt (for caution/red_flag clauses)
4. **Score** — Overall document score is computed from clause distribution
5. **Persist** — Results are stored in PostgreSQL; scan progress is tracked live

If Groq is unavailable or the API key is not set, the pipeline falls back to a rule-based engine using regex patterns derived from the CUAD legal benchmark.

---

## Development Commands

```bash
# Full typecheck (all packages)
pnpm run typecheck

# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Build everything
pnpm run build
```

---

## Roadmap

See [`roadmap.md`](roadmap.md) for planned features including:

- Document watching — detect silent ToS changes
- Two-tier AI routing (cheap model for bulk pass, strong model for red-flag escalation)
- BullMQ job queue for production-scale scan jobs
- PDF and DOCX upload support
- Email / push alerts for watched documents

---

## License

[MIT](LICENSE) — © 2024 [Wooinxlkz](https://github.com/Wooinxlkz)

You are welcome to **study and learn** from this project for school or personal education.
If you want to use substantial portions in your own work, please get in touch first:
**karimsc01t@gmail.com**

---

## Contributing

This project is currently maintained solely by [@Wooinxlkz](https://github.com/Wooinxlkz).
Issues and suggestions are welcome — open an issue or email karimsc01t@gmail.com.

---

<div align="center">
  <sub>Built with ❤️ — read before you sign.</sub>
</div>
