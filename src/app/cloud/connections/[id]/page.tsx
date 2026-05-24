'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trash2, Cloud, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InventoryView } from '@/components/cloud/InventoryView';
import type { CloudConnection, CloudInventory } from '@/lib/cloud/types';

export default function ConnectionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [conn, setConn] = useState<CloudConnection | null>(null);
  const [inv, setInv] = useState<CloudInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [cResp, iResp] = await Promise.all([
          fetch(`/api/cloud/connections/${id}`),
          fetch(`/api/cloud/connections/${id}/inventory`),
        ]);
        if (cResp.ok) {
          const cData = await cResp.json();
          setConn(cData.connection);
        }
        if (iResp.ok) {
          const iData = await iResp.json();
          setInv(iData.inventory);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const sync = async () => {
    if (!id) return;
    setSyncing(true);
    setError(null);
    try {
      const resp = await fetch(`/api/cloud/connections/${id}/sync`, { method: 'POST' });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Sync failed: HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setInv(data.inventory);
      // refresh connection metadata
      const cResp = await fetch(`/api/cloud/connections/${id}`);
      if (cResp.ok) setConn((await cResp.json()).connection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    if (!confirm('Delete this connection? Cached inventory will be removed.')) return;
    try {
      await fetch(`/api/cloud/connections/${id}`, { method: 'DELETE' });
      window.location.href = '/cloud';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-neutral-500 text-sm">
        Loading...
      </div>
    );
  }

  if (!conn) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-3">
        <p className="text-neutral-700">Connection not found.</p>
        <Link href="/cloud">
          <Button variant="outline">Back to Cloud</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/cloud" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Cloud</span>
          </Link>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-neutral-700" />
            <h1 className="font-semibold text-neutral-900">{conn.name}</h1>
            {conn.mode === 'mock' && <Badge variant="secondary" className="text-xs">Mock</Badge>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5" />
              )}
              {syncing ? 'Syncing' : 'Sync now'}
            </Button>
            <Button size="sm" variant="outline" onClick={remove}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Connection summary */}
        <Card className="p-5 mb-6">
          <div className="grid grid-cols-4 gap-6 text-sm">
            <SummaryStat label="Provider" value={conn.provider.toUpperCase()} />
            <SummaryStat
              label="AWS Account"
              value={conn.aws?.accountId ? conn.aws.accountId : '—'}
              mono
            />
            <SummaryStat label="Regions" value={(conn.aws?.regions ?? []).join(', ') || '—'} />
            <SummaryStat
              label="Last synced"
              value={
                conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString() : 'Never'
              }
            />
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {!inv ? (
          <Card className="p-12 text-center">
            <p className="text-neutral-600 mb-4">
              No inventory yet. Click <strong>Sync now</strong> to fetch resources.
            </p>
            <Button onClick={sync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5" />
              )}
              Sync now
            </Button>
          </Card>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl font-semibold text-neutral-900">
                Inventory <span className="text-neutral-400 font-normal">({inv.resources.length})</span>
              </h2>
              <p className="text-xs text-neutral-500">
                Synced {new Date(inv.syncedAt).toLocaleString()}
              </p>
            </div>
            <InventoryView inventory={inv} />
          </>
        )}
      </main>
    </div>
  );
}

function SummaryStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
      <div className={`mt-1 font-medium text-neutral-900 ${mono ? 'font-mono text-sm' : ''}`}>
        {value}
      </div>
    </div>
  );
}
