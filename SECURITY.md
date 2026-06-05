# Claudio Security

This document maps the production hardening done in the P0 audit pass to
MITRE CWE identifiers, the code paths that enforce each control, and the
adversarial regression tests that guard against regressions.

## Reporting a vulnerability

Email security@ — please do not file a public issue.

## Threat model

Claudio is a multi-tenant SaaS where every request must be attributable
to a single authenticated user. Until Phase 2 lands real auth (Supabase /
Clerk), identity is derived from a `claudio_uid` cookie minted on first
visit. The cookie is still forgeable; the controls in this document
assume the cookie value is the user's identity and ensure that, given
that assumption, no caller can reach another user's resources.

The most sensitive resources are:

- **AWS connections** — opaque externalId + role ARN that, together with
  the trust policy in the user's account, let Claudio assume into that
  account read-only.
- **BYOK API keys** — encrypted with AES-256-GCM at rest; the encryption
  key is operator-supplied via `ENCRYPTION_KEY`.
- **Plan / quota state** — gates which models a user can call on server
  credentials, and at what daily volume.

## CWE control map

Each row maps an issue from the original P0 audit to:
- the CWE/MITRE category it falls under
- the code that enforces the fix
- the adversarial regression that proves it

| Audit ID | CWE | Issue | Enforced at | Regression |
|---|---|---|---|---|
| S1 | CWE-639 / CWE-285 | Cloud-route IDOR (cross-tenant read/write) | `src/lib/cloud/store.ts` (userId-aware CRUD), all routes under `src/app/api/cloud/` | grep regression in `scripts/audit-cloud-validators.ts` ("ownership" group) |
| S2 | CWE-915 | Mass assignment via PATCH (`roleArn`, `externalId` overwrite) | `src/lib/cloud/patch.ts` (`pickPatchableConnectionFields`) | 9 PATCH-body cases in audit script |
| S3 | CWE-1336 / CWE-94 | YAML template injection in CloudFormation generator | `src/lib/cloud/aws/cloudformation.ts` (validate before interpolate + single-quote) | 8 externalId injection payloads + 2 end-to-end YAML render cases |
| S4 | CWE-862 | `/api/me/upgrade` free Pro/BYOK upgrades | `src/app/api/me/upgrade/route.ts` (NODE_ENV + opt-in gate) | 8 gate-decision matrix cases |
| S5 | CWE-862 / CWE-285 | Legacy AI routes bypass plan gate (free unmetered flagship) | `src/lib/ai/router.ts` (no-userId refusal in prod), every AI route plumbs `userId` from `getOrCreateUserId()` | grep regression: every AI route must import `getOrCreateUserId` |
| S6 | CWE-862 | `claudeStream` bypassed gate + quota + logging | `src/lib/ai/claude.ts:claudeStream` (pre-stream gate, partial-usage capture, post-stream quota consume in `finally`) | manual: gate denial returns JSON, not torn stream |
| S7 | CWE-321 | Hard-coded dev encryption key | `src/lib/cloud/encryption.ts` (fail-closed) + `src/lib/security/startup.ts` (boot validator) | runtime: `assertSecureEnv` throws if `ENCRYPTION_KEY` missing |
| S8 | CWE-770 | Rate-limit slot consumed per fallback attempt | `src/lib/plans/gate.ts` (peek + consume split), `src/lib/ai/router.ts` (single `rateSlotConsumed` flag) | manual: trace of 3-model fallback consumes exactly 1 slot |
| H1 | — (advisory) | Cookie identity has no integrity / Secure flag | `src/lib/auth/user.ts` + `middleware.ts` (Secure in prod, drop Math.random fallback) | partial — full fix is Phase 2 auth |
| H2 | CWE-598 | Gemini key passed in URL query string | `src/lib/ai/providers/google.ts` (`x-goog-api-key` header) | manual |
| H6 | CWE-770 | Server pays for partial streams | `src/lib/ai/claude.ts:claudeStream` (`finally` consumes quota) | manual |
| audit M2 | CWE-209 | Provider error responses echoed verbatim | `src/lib/ai/providers/openai-compat.ts` + `openrouter.ts` + `google.ts` (redact + cap) | manual |
| audit L1 | — | Math.random UUID fallback (46 bits entropy) | `middleware.ts` (refuses to mint) | manual |
| audit L2 | — | Middleware Set-Cookie on every static asset (CDN poison) | `middleware.ts` matcher excludes `/_next/static`, `/_next/image`, `/favicon.ico`, `/icons/` | manual |
| audit #8 | CWE-401 | Rate-limiter map grows unbounded | `src/lib/plans/rate-limiter.ts` (`pruneFresh` deletes empty entries) | manual |
| — | CWE-22 | Path traversal via `connectionId` in inventory file path | `src/lib/cloud/store.ts:inventoryPath` (UUID validation) | 4 path-traversal payloads in audit script |
| — | CWE-176 / CWE-79 | XSS / control chars in connection name | `src/lib/cloud/validators.ts:requireSafeName` | 3 cases in audit script |
| — | CWE-1188 | Insecure default ENCRYPTION_KEY removed | `src/lib/security/startup.ts:assertSecureEnv` | runtime |

## Running the regression suite

```
pnpm run audit:security
```

Currently 52 adversarial cases. Any new security fix should add at least
one rejection case to `scripts/audit-cloud-validators.ts` so a future
relaxation of the validator surfaces as a test failure.

## Operator checklist

Before any production deploy:

- `ENCRYPTION_KEY` set (32 raw bytes, base64) — `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY` set for server-funded AI
- `NODE_ENV=production` — flips all opt-in gates closed
- `ALLOW_INSECURE_PLAN_UPGRADES` is **unset** (no Stripe yet)
- `ALLOW_INTERNAL_BYPASS` is **unset** (no service accounts yet)
- `ENABLE_HEALTH_AI_ENDPOINT` is **unset** unless you want it public
- All cookies are served over HTTPS (Secure flag enforced)

## Out-of-scope for this pass (Phase 2 work)

- Real authentication (Clerk or Supabase Auth)
- Postgres-backed quota + rate limit (Redis sliding window for multi-instance)
- Architecture-store IDOR (currently audit L3 — `/api/architecture/[id]`
  fetches by UUID with no owner check; mitigated for the cloud-drift
  endpoint only by UUID validation, not by ownership)
- Stripe integration for `/api/me/upgrade`
- BYOK key format validation per provider (length + prefix per provider)
- Bundle size analysis (AWS SDK packages leaking to client bundle)
