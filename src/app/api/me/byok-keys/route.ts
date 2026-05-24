/**
 * BYOK key management.
 *
 *   GET    /api/me/byok-keys              — list which providers have a key set
 *   POST   /api/me/byok-keys              — { provider, apiKey } add/replace
 *   DELETE /api/me/byok-keys?provider=... — remove one provider's key
 *
 * Keys are encrypted at rest via libsodium-style AES-256-GCM (see
 * `src/lib/cloud/encryption.ts`). We never echo the key back over GET.
 */

import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import {
  listByokProviders,
  removeByokKey,
  setByokKey,
} from '@/lib/plans/store';
import type { ByokProvider } from '@/lib/plans/types';

const VALID_PROVIDERS: ByokProvider[] = ['openai', 'anthropic', 'google', 'deepseek', 'mistral'];

function isValidProvider(p: unknown): p is ByokProvider {
  return typeof p === 'string' && (VALID_PROVIDERS as string[]).includes(p);
}

export async function GET() {
  const userId = await getOrCreateUserId();
  const providers = await listByokProviders(userId);
  return NextResponse.json({ providers });
}

export async function POST(req: Request) {
  const userId = await getOrCreateUserId();

  const body = (await req.json().catch(() => ({}))) as {
    provider?: string;
    apiKey?: string;
  };

  if (!isValidProvider(body.provider)) {
    return NextResponse.json(
      { error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` },
      { status: 400 }
    );
  }
  if (!body.apiKey || body.apiKey.length < 10) {
    return NextResponse.json({ error: 'apiKey is required (min length 10)' }, { status: 400 });
  }

  await setByokKey(userId, body.provider, body.apiKey.trim());
  const providers = await listByokProviders(userId);
  return NextResponse.json({ success: true, providers });
}

export async function DELETE(req: Request) {
  const userId = await getOrCreateUserId();
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider');
  if (!isValidProvider(provider)) {
    return NextResponse.json(
      { error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` },
      { status: 400 }
    );
  }
  await removeByokKey(userId, provider);
  const providers = await listByokProviders(userId);
  return NextResponse.json({ success: true, providers });
}
