/**
 * Declarative routing table.
 *
 * Each Claudio use-case maps to: a primary model, 1–2 fallbacks (tried in
 * order if validation fails), a default validator, and sensible
 * temperature/maxTokens defaults.
 *
 * Editing this file changes Claudio's model behavior across the entire
 * app. No other file should know specific model ids.
 *
 * Strategy:
 *   - Cheap, fast model first (DeepSeek V3 / Gemini Flash-Lite / Codestral).
 *   - Reliable structured-output model as primary fallback (GPT-5 mini).
 *   - Claude Sonnet 4.6 as last-resort fallback for the tasks where output
 *     quality matters most (architecture gen, agents, compliance).
 *   - Reverse Architect uses Gemini 2.5 Pro for its 2M context window.
 */

import type { RouteConfig, UseCase } from './types';

// Shared fallback patterns. Use these via spread, not direct reference, so
// callers can deduplicate against the primary they pick.
const REASONING_FALLBACK = [
  { model: 'openai/gpt-5-mini' },
  { model: 'deepseek/deepseek-r1' },
];

const PROSE_FALLBACK = [
  { model: 'deepseek/deepseek-chat-v3' },
  { model: 'openai/gpt-5-mini' },
];

const AGENT_FALLBACK = [
  { model: 'anthropic/claude-sonnet-4-6' },
  { model: 'deepseek/deepseek-chat-v3' },
];

export const ROUTING_TABLE: Record<UseCase, RouteConfig> = {
  // ─── Phase 1 (live workloads) ───────────────────────────────────────────
  'architecture-generation': {
    primary: { model: 'openai/gpt-5-mini' },
    fallback: [
      { model: 'anthropic/claude-sonnet-4-6' },
      { model: 'google/gemini-2.5-pro' },
    ],
    validator: 'json-architecture',
    temperature: 0.3,
    maxTokens: 4096,
    rationale:
      "GPT-5 mini's json_schema mode hits the structure first try; Claude is the fallback when DeepSeek/GPT shape regression happens.",
  },

  'chat-qa': {
    primary: { model: 'google/gemini-2.5-flash-lite' },
    fallback: [{ model: 'deepseek/deepseek-chat-v3' }],
    validator: 'prose',
    temperature: 0.7,
    maxTokens: 1024,
    rationale: 'Cheapest viable for short factual answers about an architecture.',
  },

  'chat-modification': {
    primary: { model: 'openai/gpt-5-mini' },
    fallback: [
      { model: 'anthropic/claude-sonnet-4-6' },
      { model: 'deepseek/deepseek-chat-v3' },
    ],
    validator: 'json-architecture',
    temperature: 0.3,
    maxTokens: 4096,
    rationale: 'Returns a graph patch — needs structure quality; Claude fallback if patches break.',
  },

  'node-details': {
    primary: { model: 'deepseek/deepseek-chat-v3' },
    fallback: [
      { model: 'openai/gpt-5-mini' },
      { model: 'anthropic/claude-sonnet-4-6' },
    ],
    validator: 'json-generic',
    temperature: 0.4,
    maxTokens: 2048,
    rationale: 'DeepSeek handles 2K-token structured JSON for ~$0.005; Claude fallback for credibility.',
  },

  'cdk-generation': {
    primary: { model: 'mistralai/codestral' },
    fallback: [
      { model: 'deepseek/deepseek-chat-v3' },
      { model: 'openai/gpt-5-mini' },
    ],
    validator: 'code-block',
    temperature: 0.3,
    maxTokens: 4096,
    rationale: 'Code-specialist model first; Claude not needed since outputs are validated by build downstream.',
  },

  'sdk-snippet': {
    primary: { model: 'mistralai/codestral' },
    fallback: [{ model: 'qwen/qwen-3' }],
    validator: 'code-block',
    temperature: 0.3,
    maxTokens: 1024,
    rationale: 'Short code snippet — Codestral, cheap and tuned for code.',
  },

  // ─── Phase 3+ ───────────────────────────────────────────────────────────
  'intent-classification': {
    primary: { model: 'openai/gpt-5-nano' },
    fallback: [{ model: 'google/gemini-2.5-flash-lite' }],
    validator: 'classification',
    temperature: 0.1,
    maxTokens: 64,
    rationale: 'Tiny classification task — nano is built for this.',
  },

  // ─── Phase 5 features ────────────────────────────────────────────────────
  'audience-lens': {
    primary: { model: 'google/gemini-2.5-flash-lite' },
    fallback: PROSE_FALLBACK,
    validator: 'prose',
    temperature: 0.7,
    maxTokens: 1024,
    rationale: 'Reframe same graph for dev/security/finance — prose, no structure.',
  },

  'scale-tier': {
    primary: { model: 'openai/gpt-5-mini' },
    fallback: [
      { model: 'anthropic/claude-sonnet-4-6' },
      { model: 'google/gemini-2.5-pro' },
    ],
    validator: 'json-architecture',
    temperature: 0.5,
    maxTokens: 4096,
    rationale: 'Rewrites the graph for a new scale tier — returns valid patch.',
  },

  'failure-simulator': {
    primary: { model: 'deepseek/deepseek-r1' },
    fallback: REASONING_FALLBACK,
    validator: 'prose',
    temperature: 0.5,
    maxTokens: 2048,
    rationale: 'Multi-step reasoning across the graph; DeepSeek R1 is cheap reasoning.',
  },

  'diff-narrator': {
    primary: { model: 'google/gemini-2.5-flash-lite' },
    fallback: PROSE_FALLBACK,
    validator: 'prose',
    temperature: 0.5,
    maxTokens: 800,
    rationale: 'Short prose summary — Flash-Lite is overkill-fast for $0.001.',
  },

  'architecture-lint': {
    primary: { model: 'openai/gpt-5-mini' },
    fallback: [
      { model: 'deepseek/deepseek-chat-v3' },
      { model: 'anthropic/claude-sonnet-4-6' },
    ],
    validator: 'json-generic',
    temperature: 0.2,
    maxTokens: 2048,
    rationale: 'Rule evaluation — needs reliable structure.',
  },

  'pattern-library': {
    primary: { model: 'google/gemini-2.5-flash' },
    fallback: [
      { model: 'openai/gpt-5-mini' },
      { model: 'anthropic/claude-sonnet-4-6' },
    ],
    validator: 'json-architecture',
    temperature: 0.4,
    maxTokens: 4096,
    rationale: 'Returns a curated pattern — mid-size structured.',
  },

  'reverse-architect': {
    primary: { model: 'google/gemini-2.5-pro' },
    fallback: [
      { model: 'anthropic/claude-sonnet-4-6' },
      { model: 'openai/gpt-5' },
    ],
    validator: 'json-architecture',
    temperature: 0.2,
    maxTokens: 8192,
    rationale: 'Gemini 2.5 Pro 2M context fits a whole Terraform repo in one call.',
  },

  'compliance-audit': {
    primary: { model: 'openai/gpt-5-mini' },
    fallback: [
      { model: 'anthropic/claude-sonnet-4-6' },
      { model: 'deepseek/deepseek-chat-v3' },
    ],
    validator: 'json-generic',
    temperature: 0.2,
    maxTokens: 4096,
    rationale: 'Auditor judgment + structured findings — fall back to Claude when judgments need defending.',
  },

  'interview-grading': {
    primary: { model: 'deepseek/deepseek-r1' },
    fallback: [
      { model: 'openai/o3-mini' },
      { model: 'anthropic/claude-sonnet-4-6' },
    ],
    validator: 'json-generic',
    temperature: 0.3,
    maxTokens: 2048,
    rationale: 'Reasoning quality + cheap; R1 for batch grading, o3-mini fallback.',
  },

  // ─── Phase 6 (live) ─────────────────────────────────────────────────────
  'drift-narration': {
    primary: { model: 'google/gemini-2.5-flash-lite' },
    fallback: [{ model: 'deepseek/deepseek-chat-v3' }],
    validator: 'prose',
    temperature: 0.4,
    maxTokens: 512,
    rationale: 'Already have structured drift report; just narrate it. Cheapest.',
  },

  // ─── Phase 7+ agents ─────────────────────────────────────────────────────
  'agent-cost-optimizer': {
    primary: { model: 'deepseek/deepseek-chat-v3' },
    fallback: AGENT_FALLBACK,
    validator: 'json-generic',
    temperature: 0.3,
    maxTokens: 4096,
    rationale: 'Nightly batch job — cost matters more than latency.',
  },

  'agent-incident-response': {
    primary: { model: 'openai/gpt-5' },
    fallback: [{ model: 'anthropic/claude-sonnet-4-6' }],
    validator: 'json-generic',
    temperature: 0.2,
    maxTokens: 4096,
    rationale: 'Reliable tool-use matters most here — paying for it.',
  },

  'agent-deploy-concierge': {
    primary: { model: 'openai/gpt-5-mini' },
    fallback: AGENT_FALLBACK,
    validator: 'json-generic',
    temperature: 0.3,
    maxTokens: 4096,
    rationale: 'PR-driven, multi-step but bounded.',
  },

  'agent-drift-healer': {
    primary: { model: 'deepseek/deepseek-chat-v3' },
    fallback: [{ model: 'openai/gpt-5-mini' }],
    validator: 'json-generic',
    temperature: 0.3,
    maxTokens: 2048,
    rationale: 'Decides whether to update diagram or propose patch — bounded decision tree.',
  },

  // ─── Fallback ───────────────────────────────────────────────────────────
  general: {
    primary: { model: 'deepseek/deepseek-chat-v3' },
    fallback: [{ model: 'anthropic/claude-sonnet-4-6' }],
    validator: 'prose',
    temperature: 0.7,
    maxTokens: 2048,
    rationale: 'Anything not specifically routed — DeepSeek default, Claude rescue.',
  },
};

export function getRouteConfig(useCase: UseCase): RouteConfig {
  return ROUTING_TABLE[useCase] ?? ROUTING_TABLE.general;
}
