'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cloud, Check, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CloudFormationTemplate } from '@/components/cloud/CloudFormationTemplate';
import type { CloudProvider, CloudConnectionMode, CreateConnectionResponse } from '@/lib/cloud/types';

type Step = 'mode' | 'aws-cfn' | 'aws-paste' | 'naming' | 'syncing' | 'done';

export default function ConnectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<CloudConnectionMode>('mock');
  const [provider] = useState<CloudProvider>('aws'); // GCP/Azure later
  const [name, setName] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [regions, setRegions] = useState<string[]>(['us-east-1']);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const advance = async (next: Step) => {
    setError(null);
    setStep(next);
  };

  const createAndSync = async () => {
    setBusy(true);
    setError(null);
    try {
      // 1. Create connection
      const createResp = await fetch('/api/cloud/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || (mode === 'mock' ? 'Mock Account' : 'AWS Account'),
          provider,
          mode,
          aws: mode === 'live' ? { roleArn: roleArn.trim(), regions } : { roleArn: 'mock', regions },
        }),
      });
      if (!createResp.ok) throw new Error(`Create failed: HTTP ${createResp.status}`);
      const data = (await createResp.json()) as CreateConnectionResponse;
      setConnectionId(data.connection.id);
      if (data.externalId) setExternalId(data.externalId);

      // 2. Sync immediately
      setStep('syncing');
      const syncResp = await fetch(`/api/cloud/connections/${data.connection.id}/sync`, {
        method: 'POST',
      });
      if (!syncResp.ok) {
        const errData = await syncResp.json().catch(() => ({}));
        throw new Error(errData.error || `Sync failed: HTTP ${syncResp.status}`);
      }

      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      setStep('naming');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/cloud" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Cloud</span>
          </Link>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-neutral-700" />
            <h1 className="font-semibold text-neutral-900">Add Connection</h1>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <StepIndicator current={step} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {step === 'mode' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Pick a connection mode</h2>
            <p className="text-sm text-neutral-600 mb-6">
              Mock mode loads sample inventory data, perfect for trying Claudio without sharing real AWS access.
            </p>
            <div className="space-y-3">
              <ModeOption
                title="Mock account"
                description="Sample AWS inventory (15 resources across compute, data, network). Zero setup."
                selected={mode === 'mock'}
                badge="Recommended for first run"
                onSelect={() => setMode('mock')}
              />
              <ModeOption
                title="Live AWS account"
                description="Connect to your real AWS account via a read-only IAM role you deploy via CloudFormation."
                selected={mode === 'live'}
                badge="Requires AWS access"
                onSelect={() => setMode('live')}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => advance(mode === 'live' ? 'aws-cfn' : 'naming')}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {step === 'aws-cfn' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Deploy the read-only role</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Deploy this CloudFormation template in your AWS account. It creates a read-only IAM role we can assume.
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md mb-5">
              <strong>Note:</strong> We need to generate an external ID first. Continue to the naming step — we&apos;ll
              generate one when you create the connection and show you the template then.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => advance('mode')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={() => advance('aws-paste')}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {step === 'aws-paste' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Paste your role ARN</h2>
            <p className="text-sm text-neutral-600 mb-4">
              After deploying the CloudFormation stack, copy the role ARN from the Outputs tab.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleArn">Role ARN</Label>
                <Input
                  id="roleArn"
                  value={roleArn}
                  onChange={(e) => setRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/ClaudioReadOnlyRole"
                  className="font-mono text-sm mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="regions">Regions to scan (comma-separated)</Label>
                <Input
                  id="regions"
                  value={regions.join(',')}
                  onChange={(e) =>
                    setRegions(
                      e.target.value
                        .split(',')
                        .map((r) => r.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="us-east-1, us-west-2"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => advance('aws-cfn')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={() => advance('naming')} disabled={!roleArn.trim()}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {step === 'naming' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Name this connection</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Give it a recognizable name. You can change this later.
            </p>
            <Label htmlFor="name">Connection name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'mock' ? 'Mock production' : 'Production AWS'}
              className="mt-1.5"
              autoFocus
            />
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => advance(mode === 'live' ? 'aws-paste' : 'mode')} disabled={busy}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={createAndSync} disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Create and sync
              </Button>
            </div>
          </Card>
        )}

        {step === 'syncing' && (
          <Card className="p-12 text-center">
            <Loader2 className="w-10 h-10 text-neutral-400 mx-auto mb-4 animate-spin" />
            <h3 className="font-semibold text-neutral-900 mb-1">Syncing your inventory...</h3>
            <p className="text-sm text-neutral-600">
              {mode === 'mock' ? 'Loading sample data' : 'Calling AWS APIs across your selected regions'}
            </p>
          </Card>
        )}

        {step === 'done' && (
          <Card className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-1 text-lg">Connection ready</h3>
            <p className="text-sm text-neutral-600 mb-6">
              Inventory synced. View resources or jump back to your architecture to see drift.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/cloud">
                <Button variant="outline">All connections</Button>
              </Link>
              {connectionId && (
                <Link href={`/cloud/connections/${connectionId}`}>
                  <Button>View inventory</Button>
                </Link>
              )}
            </div>
          </Card>
        )}

        {externalId && step === 'done' && mode === 'live' && (
          <Card className="p-6 mt-6">
            <h3 className="font-semibold text-neutral-900 mb-3">Your CloudFormation template</h3>
            <CloudFormationTemplate externalId={externalId} />
          </Card>
        )}
      </main>
    </div>
  );
}

function ModeOption({
  title,
  description,
  badge,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        selected
          ? 'border-neutral-900 bg-neutral-50'
          : 'border-neutral-200 hover:border-neutral-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-neutral-900">{title}</h3>
            {badge && (
              <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded">{badge}</span>
            )}
          </div>
          <p className="text-sm text-neutral-600 mt-1">{description}</p>
        </div>
        <div
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
            selected ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300'
          }`}
        >
          {selected && <Check className="w-3 h-3 text-white m-0.5" />}
        </div>
      </div>
    </button>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'mode', label: 'Mode' },
    { key: 'naming', label: 'Name' },
    { key: 'syncing', label: 'Sync' },
    { key: 'done', label: 'Done' },
  ];
  const map = new Map<Step, number>([
    ['mode', 0],
    ['aws-cfn', 0],
    ['aws-paste', 0],
    ['naming', 1],
    ['syncing', 2],
    ['done', 3],
  ]);
  const idx = map.get(current) ?? 0;

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 flex-1">
          <div
            className={`flex items-center gap-2 ${i <= idx ? 'text-neutral-900' : 'text-neutral-400'}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < idx
                  ? 'bg-neutral-900 text-white'
                  : i === idx
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {i < idx ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className="text-sm font-medium">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px ${i < idx ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
