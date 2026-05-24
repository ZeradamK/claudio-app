/**
 * Append-only cost / usage log.
 *
 * Every router call writes one row to `data/ai-usage.jsonl`. The /api/health/ai
 * endpoint tails the file and summarizes spend per use-case + per model.
 *
 * Phase 2 swaps this for a Postgres `ai_usage` table with the same shape.
 * Until then, JSONL on disk gives us a working observability loop with
 * zero infra.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { AIResponse, UseCase } from './types';

const LOG_FILE = path.join(process.cwd(), 'data', 'ai-usage.jsonl');

export interface UsageRow {
  ts: string;
  useCase: UseCase;
  traceTag?: string;
  modelUsed: string;
  provider: 'openrouter' | 'anthropic-direct';
  attemptCount: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalCostUsd: number;
  /** Comma-separated list of model ids that were tried, in order. */
  modelsTried: string;
  /** True if at least one fallback was needed. */
  fellBackFromPrimary: boolean;
}

export async function logUsage(
  useCase: UseCase,
  resp: AIResponse,
  traceTag?: string
): Promise<void> {
  const row: UsageRow = {
    ts: new Date().toISOString(),
    useCase,
    traceTag,
    modelUsed: resp.modelUsed,
    provider: resp.provider,
    attemptCount: resp.attempts.length,
    inputTokens: resp.usage.inputTokens,
    outputTokens: resp.usage.outputTokens,
    cachedInputTokens: resp.usage.cachedInputTokens ?? 0,
    totalCostUsd: resp.totalCostUsd,
    modelsTried: resp.attempts.map((a) => a.model).join(','),
    fellBackFromPrimary: resp.attempts.length > 1,
  };
  try {
    await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
    await fs.appendFile(LOG_FILE, JSON.stringify(row) + '\n', 'utf8');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[cost-tracker] failed to append usage row:', err);
  }
}

export async function readUsageRows(limit = 500): Promise<UsageRow[]> {
  try {
    const raw = await fs.readFile(LOG_FILE, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim());
    const recent = lines.slice(-limit);
    return recent
      .map((l) => {
        try {
          return JSON.parse(l) as UsageRow;
        } catch {
          return null;
        }
      })
      .filter((r): r is UsageRow => r !== null);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

export interface UsageSummary {
  totalCalls: number;
  totalCostUsd: number;
  fallbackRate: number;
  byUseCase: Record<string, { calls: number; cost: number; primaryFailRate: number }>;
  byModel: Record<string, { calls: number; cost: number }>;
}

export function summarize(rows: UsageRow[]): UsageSummary {
  const summary: UsageSummary = {
    totalCalls: rows.length,
    totalCostUsd: 0,
    fallbackRate: 0,
    byUseCase: {},
    byModel: {},
  };
  let fallbackCount = 0;
  for (const r of rows) {
    summary.totalCostUsd += r.totalCostUsd;
    if (r.fellBackFromPrimary) fallbackCount++;

    if (!summary.byUseCase[r.useCase]) {
      summary.byUseCase[r.useCase] = { calls: 0, cost: 0, primaryFailRate: 0 };
    }
    const uc = summary.byUseCase[r.useCase];
    uc.calls++;
    uc.cost += r.totalCostUsd;
    if (r.fellBackFromPrimary) uc.primaryFailRate++;

    if (!summary.byModel[r.modelUsed]) {
      summary.byModel[r.modelUsed] = { calls: 0, cost: 0 };
    }
    summary.byModel[r.modelUsed].calls++;
    summary.byModel[r.modelUsed].cost += r.totalCostUsd;
  }
  // Convert fallback counts to rates
  for (const uc of Object.values(summary.byUseCase)) {
    uc.primaryFailRate = uc.calls > 0 ? uc.primaryFailRate / uc.calls : 0;
  }
  summary.fallbackRate = rows.length > 0 ? fallbackCount / rows.length : 0;
  return summary;
}
