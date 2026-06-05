# Claudio v2

AI-powered cloud architecture designer. Describe an AWS system in natural language → Claude generates a React Flow diagram with proper AWS icons → chat to modify → export to CDK.

Production-grade rebuild of `claudio_demo_v0.2`. See `docs/architecture.md` for the design and `docs/legacy/` for the original notes.

## Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **AI**: Claude Sonnet 4.6 via `@anthropic-ai/sdk` with prompt caching
- **Diagram**: React Flow 11
- **Auth** (Phase 2): Clerk
- **DB** (Phase 2): Neon Postgres + Drizzle ORM
- **State**: Zustand (Phase 3)
- **Tests** (Phase 4): Vitest + Playwright

## Roadmap

| Phase | Status | Goal |
|---|---|---|
| 1 — Fork + Claude-first | In progress | Working forked copy with Claude as primary AI |
| 2 — Persistence + Auth + BYOK | Pending | Clerk auth, Neon DB, encrypted user API keys |
| 3 — API consolidation + state refactor | Pending | 27 routes → 9, Zustand store, reactive chat ↔ diagram |
| 4 — Tests + Polish + Deploy | Pending | CI, Vitest, Playwright, Vercel prod |
| 5 — Extensions | Future | Share links, multi-cloud (GCP/Azure), CDK validate via tool-use |

## Quickstart (Phase 1)

```bash
pnpm install
cp .env.example .env.local        # fill in ANTHROPIC_API_KEY
pnpm dev                          # http://localhost:3000
```

Open the app, enter a prompt like *"VPC with EC2, RDS, ALB, and S3"*, and a diagram should render.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server on :3000 (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm run audit:security` | 57-case CWE regression suite (cloud IDOR, YAML/template injection, mass assignment, missing auth, key handling) — see [SECURITY.md](./SECURITY.md) |

## Security

See [SECURITY.md](./SECURITY.md) for the CWE control map, operator
checklist, and adversarial regression coverage.

## License

MIT — see `LICENSE`.
