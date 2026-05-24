/**
 * The plan catalog — single source of truth for what each tier gets.
 *
 * Edit this file to change tier definitions. The /api/me/plan endpoint
 * returns the snapshot for whatever plan the user is on; the gate uses
 * `allowedServerModels` and `quota` to enforce limits.
 *
 * Tier philosophy:
 *   - FREE  : cheap models only, tight quotas, attract users
 *   - PRO   : mid-tier models, generous quotas, the bread-and-butter $20/mo
 *   - TEAM  : same as Pro × 5 per seat, plus team features
 *   - BYOK  : ALL models (including flagships), no LLM rate limits — user
 *             pays their provider direct, you charge $10/mo for the app
 */

import type { Plan } from './types';

const FREE: Plan = {
  id: 'free',
  name: 'Free',
  monthlyPriceUsd: 0,
  tagline: 'Try Claudio with cheap models and a small daily allowance.',
  allowedServerModels: [
    'deepseek/deepseek-chat-v3',
    'google/gemini-2.5-flash-lite',
    'qwen/qwen-3',
  ],
  allowedUseCases: [
    'architecture-generation',
    'chat-qa',
    'chat-modification',
    'node-details',
    'cdk-generation',
    'sdk-snippet',
    'intent-classification',
    'drift-narration',
    'general',
  ],
  quota: {
    callsPerDay: 25,
    tokensPerDay: 50_000,
    costPerDayUsd: 0.5,
    callsPerMinute: 5,
  },
  features: {
    cloudConnections: 1,
    architectures: 3,
    versionsPerArchitecture: 3,
    reverseArchitect: false,
    interviewMode: false,
    audienceLens: false,
    teamSharing: false,
    flagshipModels: false,
  },
};

const PRO: Plan = {
  id: 'pro',
  name: 'Pro',
  monthlyPriceUsd: 20,
  tagline: 'Mid-tier models, generous quotas, all the Claudio features.',
  allowedServerModels: [
    // Free tier models
    'deepseek/deepseek-chat-v3',
    'deepseek/deepseek-r1',
    'google/gemini-2.5-flash-lite',
    'google/gemini-2.5-flash',
    'qwen/qwen-3',
    // Pro additions
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
    'openai/o3-mini',
    'anthropic/claude-sonnet-4-6',
    'anthropic/claude-haiku-4-5',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'mistralai/codestral',
    'meta-llama/llama-4-maverick',
    'meta-llama/llama-4-scout',
    'x-ai/grok-4-fast',
  ],
  allowedUseCases: '*',
  quota: {
    callsPerDay: 200,
    tokensPerDay: 2_000_000,
    costPerDayUsd: 5,
    callsPerMinute: 30,
  },
  features: {
    cloudConnections: 3,
    architectures: -1,
    versionsPerArchitecture: 50,
    reverseArchitect: true,
    interviewMode: true,
    audienceLens: true,
    teamSharing: false,
    flagshipModels: false, // Pro can use Sonnet 4.6 but not Opus 4.7 / GPT-5 / Gemini 2.5 Pro
  },
};

const TEAM: Plan = {
  id: 'team',
  name: 'Team',
  monthlyPriceUsd: 50,
  tagline: 'Pro features × 5 per seat, plus team sharing and audit logs.',
  allowedServerModels: PRO.allowedServerModels,
  allowedUseCases: '*',
  quota: {
    callsPerDay: 1_000,
    tokensPerDay: 10_000_000,
    costPerDayUsd: 25,
    callsPerMinute: 100,
  },
  features: {
    cloudConnections: 10,
    architectures: -1,
    versionsPerArchitecture: 200,
    reverseArchitect: true,
    interviewMode: true,
    audienceLens: true,
    teamSharing: true,
    flagshipModels: false,
  },
};

const BYOK: Plan = {
  id: 'byok',
  name: 'BYOK',
  monthlyPriceUsd: 10,
  tagline:
    'Bring your own API keys. Every model, no LLM rate limits, flagships included.',
  // BYOK plan can route to ANY model via the user's keys. Server credentials
  // are not used unless the user lacks a BYOK key for a chosen provider.
  // We keep allowedServerModels minimal so users who forget to add a key
  // still get something instead of failing closed.
  allowedServerModels: [
    'deepseek/deepseek-chat-v3',
    'google/gemini-2.5-flash-lite',
  ],
  allowedUseCases: '*',
  quota: {
    // These are "server-credential" quotas — used only when the user calls
    // a model they don't have a BYOK key for. Their own keys are unlimited
    // from our side.
    callsPerDay: 50,
    tokensPerDay: 500_000,
    costPerDayUsd: 2,
    callsPerMinute: 60,
  },
  features: {
    cloudConnections: 10,
    architectures: -1,
    versionsPerArchitecture: 200,
    reverseArchitect: true,
    interviewMode: true,
    audienceLens: true,
    teamSharing: true,
    flagshipModels: true, // The big BYOK perk
  },
};

export const PLAN_CATALOG: Record<Plan['id'], Plan> = {
  free: FREE,
  pro: PRO,
  team: TEAM,
  byok: BYOK,
};

export function getPlan(planId: Plan['id']): Plan {
  return PLAN_CATALOG[planId] ?? FREE;
}

/**
 * Flagship models — only callable by BYOK users.
 * Server-funded tiers never route here.
 */
export const FLAGSHIP_MODELS = new Set([
  'openai/gpt-5',
  'openai/o3',
  'anthropic/claude-opus-4-7',
  'claude-opus-4-7',
  'google/gemini-2.5-pro',
]);

export function isFlagshipModel(model: string): boolean {
  return FLAGSHIP_MODELS.has(model);
}

/** True if this plan allows the given model on server-funded credentials. */
export function planAllowsServerModel(plan: Plan, model: string): boolean {
  if (plan.allowedServerModels === '*') return true;
  if (isFlagshipModel(model)) return plan.features.flagshipModels;
  return plan.allowedServerModels.includes(model);
}
