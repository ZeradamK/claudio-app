/**
 * Per-user profile store.
 *
 * Phase 6.75 keeps profiles in a single JSON file (`data/user-profiles.json`).
 * Phase 2 swaps this for the Postgres `user_profiles` + `byok_keys` tables
 * (same shape).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { decrypt, encrypt, type EncryptedBlob } from '../cloud/encryption';
import type { ByokProvider, PlanId, UserProfile } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'user-profiles.json');

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyProfile(id: string, planId: PlanId = 'free'): UserProfile {
  return {
    id,
    planId,
    createdAt: new Date().toISOString(),
    byokKeys: {},
    usageDay: todayUTC(),
    usage: { calls: 0, tokens: 0, costUsd: 0 },
  };
}

async function readAll(): Promise<UserProfile[]> {
  try {
    const raw = await fs.readFile(PROFILES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(items: UserProfile[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROFILES_FILE, JSON.stringify(items, null, 2), 'utf8');
}

/** Get or auto-create a profile. */
export async function getOrCreateProfile(userId: string): Promise<UserProfile> {
  const all = await readAll();
  const existing = all.find((p) => p.id === userId);
  if (existing) {
    // Lazy day-rollover: if counters are stale, reset them.
    const today = todayUTC();
    if (existing.usageDay !== today) {
      existing.usageDay = today;
      existing.usage = { calls: 0, tokens: 0, costUsd: 0 };
      await writeAll(all);
    }
    return existing;
  }
  const fresh = emptyProfile(userId);
  all.push(fresh);
  await writeAll(all);
  return fresh;
}

export async function updateProfile(
  userId: string,
  patch: Partial<UserProfile>
): Promise<UserProfile> {
  const all = await readAll();
  const idx = all.findIndex((p) => p.id === userId);
  if (idx === -1) {
    const fresh = { ...emptyProfile(userId), ...patch, id: userId };
    all.push(fresh);
    await writeAll(all);
    return fresh;
  }
  const merged = { ...all[idx], ...patch, id: userId };
  all[idx] = merged;
  await writeAll(all);
  return merged;
}

export async function setPlan(userId: string, planId: PlanId): Promise<UserProfile> {
  return updateProfile(userId, { planId });
}

/** Set or replace a BYOK key for one provider. */
export async function setByokKey(
  userId: string,
  provider: ByokProvider,
  apiKey: string
): Promise<UserProfile> {
  const profile = await getOrCreateProfile(userId);
  const encrypted = encrypt(apiKey);
  return updateProfile(userId, {
    byokKeys: { ...profile.byokKeys, [provider]: encrypted },
  });
}

/** Remove a BYOK key for one provider. */
export async function removeByokKey(
  userId: string,
  provider: ByokProvider
): Promise<UserProfile> {
  const profile = await getOrCreateProfile(userId);
  const next = { ...profile.byokKeys };
  delete next[provider];
  return updateProfile(userId, { byokKeys: next });
}

/** Resolve a BYOK key (decrypted) for a provider. Returns null if unset. */
export async function getByokKey(
  userId: string,
  provider: ByokProvider
): Promise<string | null> {
  const profile = await getOrCreateProfile(userId);
  const blob = profile.byokKeys[provider] as EncryptedBlob | undefined;
  if (!blob) return null;
  try {
    return decrypt(blob);
  } catch {
    return null;
  }
}

/** Add to today's usage counters (called by the gate after a successful call). */
export async function recordUsage(
  userId: string,
  delta: { calls?: number; tokens?: number; costUsd?: number }
): Promise<void> {
  const profile = await getOrCreateProfile(userId);
  await updateProfile(userId, {
    usage: {
      calls: profile.usage.calls + (delta.calls ?? 0),
      tokens: profile.usage.tokens + (delta.tokens ?? 0),
      costUsd: profile.usage.costUsd + (delta.costUsd ?? 0),
    },
  });
}

/** Return the set of providers the user has a BYOK key for. */
export async function listByokProviders(userId: string): Promise<ByokProvider[]> {
  const profile = await getOrCreateProfile(userId);
  return Object.keys(profile.byokKeys) as ByokProvider[];
}
