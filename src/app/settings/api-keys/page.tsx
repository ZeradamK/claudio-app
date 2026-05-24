'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Key, Loader2, Trash2, Home, ExternalLink, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ByokProvider } from '@/lib/plans/types';

interface ProviderMeta {
  id: ByokProvider;
  label: string;
  url: string;
  placeholder: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    url: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    url: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...',
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    url: 'https://aistudio.google.com/apikey',
    placeholder: 'AIza...',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    url: 'https://platform.deepseek.com/api_keys',
    placeholder: 'sk-...',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    url: 'https://console.mistral.ai/api-keys',
    placeholder: 'mst-...',
  },
];

export default function ApiKeysPage() {
  const [configured, setConfigured] = useState<ByokProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const resp = await fetch('/api/me/byok-keys');
      const data = await resp.json();
      setConfigured(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <Home className="w-4 h-4" />
            <span className="text-sm">Claudio</span>
          </Link>
          <h1 className="font-semibold text-neutral-900">Settings — API Keys</h1>
          <Link href="/settings/plan">
            <Button size="sm" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Plan
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Bring your own keys</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Add your own API key for any provider to bypass Claudio&apos;s plan rate limits and quotas.
            Calls using your key go directly to the provider — you pay them, not us.
            Keys are encrypted at rest.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-neutral-500 text-sm">Loading...</div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map((p) => (
              <ProviderRow
                key={p.id}
                provider={p}
                configured={configured.includes(p.id)}
                onChange={load}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProviderRow({
  provider,
  configured,
  onChange,
}: {
  provider: ProviderMeta;
  configured: boolean;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      const resp = await fetch('/api/me/byok-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id, apiKey: apiKey.trim() }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      setApiKey('');
      setEditing(false);
      onChange();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove your ${provider.label} key?`)) return;
    setBusy(true);
    setLocalError(null);
    try {
      const resp = await fetch(`/api/me/byok-keys?provider=${provider.id}`, {
        method: 'DELETE',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      onChange();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`p-2 rounded-md ${
              configured ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {configured ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <div className="font-medium text-neutral-900">{provider.label}</div>
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Get your key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {!editing && (
          <div className="flex gap-2">
            {configured && (
              <Button size="sm" variant="outline" onClick={remove} disabled={busy}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            )}
            <Button size="sm" onClick={() => setEditing(true)} disabled={busy}>
              {configured ? 'Replace' : 'Add key'}
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor={`key-${provider.id}`}>API key</Label>
            <div className="relative mt-1.5">
              <Input
                id={`key-${provider.id}`}
                type={reveal ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.placeholder}
                className="font-mono pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700"
                aria-label={reveal ? 'Hide key' : 'Show key'}
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {localError && (
              <div className="text-xs text-red-600 mt-1.5">{localError}</div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setApiKey('');
                setLocalError(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy || apiKey.trim().length < 10}>
              {busy && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
