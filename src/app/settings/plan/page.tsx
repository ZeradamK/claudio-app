'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Zap, Crown, Users, Key, Home, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PlanId, PlanSnapshot } from '@/lib/plans/types';

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'team', 'byok'];

const PLAN_ICONS: Record<PlanId, typeof Zap> = {
  free: Zap,
  pro: Crown,
  team: Users,
  byok: Key,
};

export default function PlanPage() {
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const resp = await fetch('/api/me/plan');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as PlanSnapshot;
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const switchTo = async (planId: PlanId) => {
    setSwitching(planId);
    setError(null);
    try {
      const resp = await fetch('/api/me/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Switch failed');
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-neutral-500 text-sm">
        Loading...
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-3">
        <p>{error || 'No plan data.'}</p>
        <Link href="/">
          <Button variant="outline">Back home</Button>
        </Link>
      </div>
    );
  }

  const CurrentIcon = PLAN_ICONS[snapshot.planId];
  const usagePct = (val: number, total: number) =>
    total === 0 ? 0 : Math.min(100, (val / total) * 100);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <Home className="w-4 h-4" />
            <span className="text-sm">Claudio</span>
          </Link>
          <h1 className="font-semibold text-neutral-900">Settings — Plan</h1>
          <Link href="/settings/api-keys">
            <Button size="sm" variant="outline">
              <Key className="w-4 h-4 mr-1.5" />
              API keys
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">{error}</div>
        )}

        {/* Current plan */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-neutral-100 rounded-lg">
                <CurrentIcon className="w-6 h-6 text-neutral-700" />
              </div>
              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wide">Current plan</div>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-0.5">
                  {snapshot.plan.name}
                </h2>
                <p className="text-sm text-neutral-600 mt-1">{snapshot.plan.tagline}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500">Daily quota resets at</div>
              <div className="text-sm font-medium text-neutral-900 mt-0.5">
                {new Date(snapshot.resetsAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Usage bars */}
          <div className="mt-6 grid grid-cols-3 gap-6">
            <UsageBar
              label="Calls"
              used={snapshot.usage.calls}
              total={snapshot.plan.quota.callsPerDay}
              format={(n) => n.toFixed(0)}
            />
            <UsageBar
              label="Tokens"
              used={snapshot.usage.tokens}
              total={snapshot.plan.quota.tokensPerDay}
              format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0))}
            />
            <UsageBar
              label="Cost"
              used={snapshot.usage.costUsd}
              total={snapshot.plan.quota.costPerDayUsd}
              format={(n) => `$${n.toFixed(2)}`}
            />
          </div>

          {snapshot.byokConfigured.length > 0 && (
            <div className="mt-6 pt-4 border-t border-neutral-100">
              <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
                BYOK keys configured
              </div>
              <div className="flex gap-2 flex-wrap">
                {snapshot.byokConfigured.map((p) => (
                  <Badge key={p} variant="secondary" className="capitalize">
                    {p}
                  </Badge>
                ))}
                <Link href="/settings/api-keys">
                  <Badge variant="outline" className="cursor-pointer hover:bg-neutral-100">
                    + Add another
                  </Badge>
                </Link>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                BYOK calls bypass plan rate limits and quota.
              </p>
            </div>
          )}
        </Card>

        {/* Plan picker */}
        <div>
          <h3 className="font-semibold text-neutral-900 mb-3">Switch plan</h3>
          <p className="text-xs text-neutral-500 mb-4">
            Phase 6.75 stub — plan changes apply immediately, no payment. Stripe wires in Phase 7.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {PLAN_ORDER.map((planId) => (
              <PlanCard
                key={planId}
                planId={planId}
                isCurrent={snapshot.planId === planId}
                switching={switching === planId}
                onPick={() => switchTo(planId)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function UsageBar({
  label,
  used,
  total,
  format,
}: {
  label: string;
  used: number;
  total: number;
  format: (n: number) => string;
}) {
  const pct = total === 0 ? 0 : Math.min(100, (used / total) * 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-neutral-500 uppercase tracking-wide">{label}</span>
        <span className="text-xs font-mono font-medium text-neutral-700">
          {format(used)} / {format(total)}
        </span>
      </div>
      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const PLAN_PREVIEW: Record<PlanId, { price: string; bullets: string[] }> = {
  free: {
    price: '$0',
    bullets: ['Cheap models only', '25 calls / day', '$0.50/day cost cap', '1 cloud, 3 architectures'],
  },
  pro: {
    price: '$20 / mo',
    bullets: ['+ GPT-5 mini, Sonnet 4.6', '200 calls / day', '$5/day cost cap', 'Reverse Architect, Audience Lens'],
  },
  team: {
    price: '$50 / seat / mo',
    bullets: ['Pro × 5 quotas', '1,000 calls / day', '$25/day cost cap', 'Team sharing, audit log'],
  },
  byok: {
    price: '$10 / mo',
    bullets: ['ALL models including flagships', 'No LLM rate limits', 'You pay providers direct', 'GPT-5, Opus 4.7, Gemini Pro'],
  },
};

function PlanCard({
  planId,
  isCurrent,
  switching,
  onPick,
}: {
  planId: PlanId;
  isCurrent: boolean;
  switching: boolean;
  onPick: () => void;
}) {
  const Icon = PLAN_ICONS[planId];
  const preview = PLAN_PREVIEW[planId];
  return (
    <Card
      className={`p-5 transition-all ${
        isCurrent ? 'border-neutral-900 ring-1 ring-neutral-900' : 'hover:border-neutral-400'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-neutral-700" />
        <h4 className="font-semibold text-neutral-900 capitalize">{planId}</h4>
        {isCurrent && <Badge variant="default" className="text-xs ml-auto">Current</Badge>}
      </div>
      <div className="text-2xl font-bold text-neutral-900 mb-3">{preview.price}</div>
      <ul className="text-xs text-neutral-600 space-y-1.5 mb-4">
        {preview.bullets.map((b) => (
          <li key={b} className="flex items-start gap-1.5">
            <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant={isCurrent ? 'outline' : 'default'}
        disabled={isCurrent || switching}
        onClick={onPick}
        className="w-full"
      >
        {switching ? 'Switching...' : isCurrent ? 'Current' : 'Switch'}
      </Button>
    </Card>
  );
}
