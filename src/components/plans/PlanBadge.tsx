'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Crown, Users, Key } from 'lucide-react';

import type { PlanId, PlanSnapshot } from '@/lib/plans/types';

const ICON: Record<PlanId, typeof Zap> = {
  free: Zap,
  pro: Crown,
  team: Users,
  byok: Key,
};

const STYLE: Record<PlanId, string> = {
  free: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
  pro: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
  team: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200',
  byok: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200',
};

export function PlanBadge() {
  const [snap, setSnap] = useState<PlanSnapshot | null>(null);

  useEffect(() => {
    fetch('/api/me/plan')
      .then((r) => (r.ok ? r.json() : null))
      .then(setSnap)
      .catch(() => {});
  }, []);

  if (!snap) return null;
  const Icon = ICON[snap.planId];
  return (
    <Link
      href="/settings/plan"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${STYLE[snap.planId]}`}
      aria-label={`Current plan: ${snap.plan.name}`}
    >
      <Icon className="w-3 h-3" />
      {snap.plan.name}
    </Link>
  );
}
