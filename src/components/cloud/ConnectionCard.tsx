'use client';

import Link from 'next/link';
import { Cloud, AlertCircle, CheckCircle2, Clock, Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { CloudConnection } from '@/lib/cloud/types';

const STATUS_STYLES: Record<CloudConnection['status'], { color: string; icon: typeof CheckCircle2; label: string }> = {
  connected: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'Connected' },
  pending: { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock, label: 'Pending sync' },
  error: { color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle, label: 'Error' },
  unauthorized: { color: 'text-red-600 bg-red-50 border-red-200', icon: Lock, label: 'Unauthorized' },
};

export function ConnectionCard({ connection }: { connection: CloudConnection }) {
  const status = STATUS_STYLES[connection.status];
  const StatusIcon = status.icon;
  const resourceCount = connection.lastInventory?.resources.length ?? 0;
  const lastSynced = connection.lastSyncedAt
    ? new Date(connection.lastSyncedAt).toLocaleString()
    : 'Never synced';

  return (
    <Link href={`/cloud/connections/${connection.id}`} className="block">
      <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-neutral-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-neutral-100 rounded-lg">
              <Cloud className="w-5 h-5 text-neutral-700" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 text-base">{connection.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs uppercase font-medium">
                  {connection.provider}
                </Badge>
                {connection.mode === 'mock' && (
                  <Badge variant="secondary" className="text-xs">Mock</Badge>
                )}
                {connection.aws?.accountId && (
                  <span className="text-xs text-neutral-500 font-mono">
                    {connection.aws.accountId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${status.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-neutral-500 text-xs">Resources</div>
            <div className="font-semibold text-neutral-900 mt-0.5">{resourceCount}</div>
          </div>
          <div>
            <div className="text-neutral-500 text-xs">Regions</div>
            <div className="font-semibold text-neutral-900 mt-0.5">
              {connection.aws?.regions?.length ?? 0}
            </div>
          </div>
          <div>
            <div className="text-neutral-500 text-xs">Last synced</div>
            <div className="font-medium text-neutral-700 mt-0.5 text-xs">{lastSynced}</div>
          </div>
        </div>

        {connection.lastErrorMessage && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
            {connection.lastErrorMessage}
          </div>
        )}
      </Card>
    </Link>
  );
}
