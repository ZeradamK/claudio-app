'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cloud, Plus, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConnectionCard } from '@/components/cloud/ConnectionCard';
import type { CloudConnection } from '@/lib/cloud/types';

export default function CloudPage() {
  const [connections, setConnections] = useState<CloudConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/cloud/connections');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setConnections(data.connections || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <Home className="w-4 h-4" />
            <span className="text-sm">Claudio</span>
          </Link>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-neutral-700" />
            <h1 className="font-semibold text-neutral-900">Cloud Operations</h1>
          </div>
          <Link href="/cloud/connect">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Connection
            </Button>
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-neutral-900">Your Cloud Connections</h2>
          <p className="text-neutral-600 mt-1 text-sm">
            Read-only links to your cloud accounts. Sync inventory and compare against your architecture designs.
          </p>
        </div>

        {loading && (
          <div className="text-center py-12 text-neutral-500 text-sm">Loading connections...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        {!loading && !error && connections.length === 0 && (
          <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-12 text-center">
            <Cloud className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">No connections yet</h3>
            <p className="text-sm text-neutral-600 max-w-sm mx-auto mb-4">
              Connect an AWS account to inventory your resources and detect drift against your Claudio diagrams.
            </p>
            <Link href="/cloud/connect">
              <Button>
                <Plus className="w-4 h-4 mr-1.5" />
                Add your first connection
              </Button>
            </Link>
          </div>
        )}

        {!loading && connections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((conn) => (
              <ConnectionCard key={conn.id} connection={conn} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
