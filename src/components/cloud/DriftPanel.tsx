'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, FileWarning, Cloud, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { CloudConnection, DriftItem, DriftReport } from '@/lib/cloud/types';

interface DriftPanelProps {
  architectureId: string;
  /** Optional trigger override. If unset, we render our own floating button. */
  trigger?: React.ReactNode;
}

export function DriftPanel({ architectureId, trigger }: DriftPanelProps) {
  const [open, setOpen] = useState(false);
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [report, setReport] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load connections only when the sheet opens
  useEffect(() => {
    if (!open || connections.length > 0) return;
    (async () => {
      try {
        const resp = await fetch('/api/cloud/connections');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setConnections(data.connections || []);
        // Auto-select if there's only one
        if (data.connections?.length === 1) {
          setSelectedConnId(data.connections[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load connections');
      }
    })();
  }, [open, connections.length]);

  // Fetch drift report when connection is selected
  useEffect(() => {
    if (!selectedConnId || !architectureId) return;
    setLoading(true);
    setError(null);
    setReport(null);
    (async () => {
      try {
        const resp = await fetch(
          `/api/cloud/connections/${selectedConnId}/drift?architectureId=${architectureId}`
        );
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${resp.status}`);
        }
        const data = await resp.json();
        setReport(data.report);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to compute drift');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedConnId, architectureId]);

  const refresh = async () => {
    if (!selectedConnId) return;
    setLoading(true);
    setError(null);
    try {
      // Re-sync first
      const syncResp = await fetch(`/api/cloud/connections/${selectedConnId}/sync`, {
        method: 'POST',
      });
      if (!syncResp.ok) {
        const data = await syncResp.json().catch(() => ({}));
        throw new Error(data.error || 'Sync failed');
      }
      // Then fetch fresh drift
      const resp = await fetch(
        `/api/cloud/connections/${selectedConnId}/drift?architectureId=${architectureId}`
      );
      const data = await resp.json();
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            variant="default"
            size="sm"
            className="fixed bottom-6 right-6 z-40 shadow-lg gap-1.5"
          >
            <Cloud className="w-4 h-4" />
            Cloud Drift
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Cloud Drift
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Connection picker */}
          {connections.length === 0 ? (
            <div className="border border-dashed border-neutral-300 rounded-lg p-6 text-center text-sm">
              <p className="text-neutral-600 mb-3">No cloud connections yet.</p>
              <Link href="/cloud/connect" target="_blank">
                <Button size="sm" variant="outline">
                  Connect a cloud account
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                Compare against
              </label>
              <div className="flex gap-2 mt-1.5">
                <Select value={selectedConnId ?? ''} onValueChange={setSelectedConnId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pick a cloud connection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.mode === 'mock' && ' (mock)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedConnId && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={refresh}
                    disabled={loading}
                    title="Re-sync inventory + recompute drift"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {loading && !report && (
            <div className="text-center py-12 text-neutral-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Computing drift...
            </div>
          )}

          {report && <DriftSummary report={report} />}
          {report && <DriftItemList items={report.items} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DriftSummary({ report }: { report: DriftReport }) {
  const { matched, inDiagramOnly, inCloudOnly, coverageScore, driftScore } = report.summary;
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Matched" value={matched} color="text-emerald-600" />
        <Stat label="Diagram only" value={inDiagramOnly} color="text-amber-600" />
        <Stat label="Cloud only" value={inCloudOnly} color="text-blue-600" />
      </div>
      <div className="pt-3 border-t border-neutral-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-600">Coverage</span>
          <span className="text-xs font-mono font-medium">{(coverageScore * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${coverageScore * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 mb-1">
          <span className="text-xs text-neutral-600">Alignment score</span>
          <span className="text-xs font-mono font-medium">{(driftScore * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-neutral-900 transition-all duration-500"
            style={{ width: `${driftScore * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-neutral-600 mt-0.5">{label}</div>
    </div>
  );
}

function DriftItemList({ items }: { items: DriftItem[] }) {
  const matched = items.filter((i) => i.status === 'matched');
  const inDiagramOnly = items.filter((i) => i.status === 'in_diagram_only');
  const inCloudOnly = items.filter((i) => i.status === 'in_cloud_only');

  return (
    <div className="space-y-4">
      {inDiagramOnly.length > 0 && (
        <Section title="Designed but not deployed" badge="warning" count={inDiagramOnly.length}>
          {inDiagramOnly.map((item, idx) => (
            <DriftRow key={`d-${idx}`} item={item} />
          ))}
        </Section>
      )}
      {inCloudOnly.length > 0 && (
        <Section title="Deployed but not in design" badge="info" count={inCloudOnly.length}>
          {inCloudOnly.map((item, idx) => (
            <DriftRow key={`c-${idx}`} item={item} />
          ))}
        </Section>
      )}
      {matched.length > 0 && (
        <Section title="Matched" badge="success" count={matched.length} collapsedByDefault>
          {matched.map((item, idx) => (
            <DriftRow key={`m-${idx}`} item={item} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  badge,
  count,
  children,
  collapsedByDefault,
}: {
  title: string;
  badge: 'success' | 'warning' | 'info';
  count: number;
  children: React.ReactNode;
  collapsedByDefault?: boolean;
}) {
  const [open, setOpen] = useState(!collapsedByDefault);
  const colorMap = {
    success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left mb-2"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-neutral-900">{title}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded border ${colorMap[badge]}`}
          >
            {count}
          </span>
        </div>
        <span className="text-xs text-neutral-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="space-y-1.5">{children}</div>}
    </div>
  );
}

function DriftRow({ item }: { item: DriftItem }) {
  const statusIcon =
    item.status === 'matched' ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
    ) : (
      <FileWarning className="w-4 h-4 text-amber-500 flex-shrink-0" />
    );

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm">
      {statusIcon}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 truncate">{item.label}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
          <Badge variant="outline" className="text-xs">{item.resourceType.replace(/_/g, ' ')}</Badge>
          {item.cloudResource && <span>{item.cloudResource.region}</span>}
          {item.matchConfidence !== undefined && (
            <span className="font-mono">{(item.matchConfidence * 100).toFixed(0)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
