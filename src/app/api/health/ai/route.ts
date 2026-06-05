/**
 * GET /api/health/ai
 *
 * Returns the current routing table, configured providers, and the most
 * recent usage summary so you can verify the orchestrator is wired and see
 * what's actually getting routed where.
 *
 * Auth: only enabled in non-production environments OR when explicitly
 * opted in via `ENABLE_HEALTH_AI_ENDPOINT=1`. The route exposes routing
 * internals + recent spend; not a secret, but no reason to surface
 * publicly. (Audit finding: 'health endpoint exposes routing internals
 * with no auth'.)
 */

import { NextResponse } from 'next/server';

import { readUsageRows, summarize } from '@/lib/ai/cost-tracker';
import { ROUTING_TABLE } from '@/lib/ai/routing';

function isEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.ENABLE_HEALTH_AI_ENDPOINT === '1';
}

export async function GET() {
  if (!isEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const providers = {
    openRouter: !!process.env.OPENROUTER_API_KEY?.trim(),
    anthropic: !!process.env.ANTHROPIC_API_KEY?.trim(),
  };

  const recent = await readUsageRows(500);
  const summary = summarize(recent);

  // Compact routing view — full configs are noisy
  const routing = Object.fromEntries(
    Object.entries(ROUTING_TABLE).map(([useCase, cfg]) => [
      useCase,
      {
        primary: cfg.primary.model,
        fallback: cfg.fallback.map((f) => f.model),
        validator: cfg.validator,
        rationale: cfg.rationale,
      },
    ])
  );

  return NextResponse.json({
    status: 'ok',
    providers,
    routing,
    recent: {
      totalCalls: summary.totalCalls,
      totalCostUsd: Number(summary.totalCostUsd.toFixed(4)),
      fallbackRate: Number(summary.fallbackRate.toFixed(3)),
      byUseCase: Object.fromEntries(
        Object.entries(summary.byUseCase).map(([k, v]) => [
          k,
          {
            calls: v.calls,
            cost: Number(v.cost.toFixed(4)),
            primaryFailRate: Number(v.primaryFailRate.toFixed(3)),
          },
        ])
      ),
      byModel: Object.fromEntries(
        Object.entries(summary.byModel).map(([k, v]) => [
          k,
          { calls: v.calls, cost: Number(v.cost.toFixed(4)) },
        ])
      ),
    },
  });
}
