'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown, Key, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

/**
 * Shown when an AI call is blocked by the plan gate. Offers two paths:
 *   - Upgrade tier (server still pays the LLM bill)
 *   - Paste a BYOK key (user pays the LLM provider directly, no rate limits)
 */
export function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Keep building with Claudio
        </DialogTitle>

        {reason && (
          <p className="text-sm text-neutral-600 mt-1">{reason}</p>
        )}

        <div className="mt-4 space-y-3">
          <Link href="/settings/plan" onClick={() => onOpenChange(false)} className="block">
            <div className="p-4 border border-neutral-200 rounded-lg hover:border-neutral-400 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-600" />
                <div className="font-semibold text-neutral-900">Upgrade to Pro</div>
                <span className="ml-auto text-sm font-mono text-neutral-700">$20 / mo</span>
              </div>
              <p className="text-xs text-neutral-600">
                10× the quota, mid-tier models (GPT-5 mini, Sonnet 4.6), Reverse Architect, Audience Lens.
              </p>
            </div>
          </Link>

          <Link href="/settings/api-keys" onClick={() => onOpenChange(false)} className="block">
            <div className="p-4 border border-blue-200 bg-blue-50/30 rounded-lg hover:border-blue-400 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-blue-600" />
                <div className="font-semibold text-neutral-900">Add your own API key</div>
                <span className="ml-auto text-sm font-mono text-neutral-700">$10 / mo</span>
              </div>
              <p className="text-xs text-neutral-600">
                Paste your OpenAI / Anthropic / Google / DeepSeek / Mistral key. No LLM rate limits — you pay the provider directly. Includes flagship models (GPT-5, Opus 4.7, Gemini 2.5 Pro).
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
