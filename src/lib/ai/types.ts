/**
 * Unified AI request/response shape used across the multi-provider router.
 *
 * Every Claudio workload calls the router with a {@link UseCase}; the router
 * looks up its routing config (primary + fallbacks + validator), executes
 * with quality-gated fallback, and returns an {@link AIResponse} that
 * includes which model actually answered and how much it cost.
 *
 * Provider adapters (OpenRouter, Anthropic-direct) all implement
 * {@link ProviderAdapter} and consume/produce these shapes.
 */

export type UseCase =
  // ─── Phase 1 (live) ─────────────────────────────────────────────────────
  | 'architecture-generation'
  | 'chat-qa'
  | 'chat-modification'
  | 'node-details'
  | 'cdk-generation'
  | 'sdk-snippet'
  // ─── Phase 3+ ───────────────────────────────────────────────────────────
  | 'intent-classification'
  // ─── Phase 5 features ────────────────────────────────────────────────────
  | 'audience-lens'
  | 'scale-tier'
  | 'failure-simulator'
  | 'diff-narrator'
  | 'architecture-lint'
  | 'pattern-library'
  | 'reverse-architect'
  | 'compliance-audit'
  | 'interview-grading'
  // ─── Phase 6 (live) ─────────────────────────────────────────────────────
  | 'drift-narration'
  // ─── Phase 7+ agents ─────────────────────────────────────────────────────
  | 'agent-cost-optimizer'
  | 'agent-incident-response'
  | 'agent-deploy-concierge'
  | 'agent-drift-healer'
  // ─── Fallback for anything unspecified ───────────────────────────────────
  | 'general';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type ValidatorKey =
  | 'json-architecture' // expects { nodes: [], edges: [], metadata?: {} }
  | 'json-generic' // anything that JSON.parses (after fence strip)
  | 'code-block' // non-empty + looks like code (has brackets/keywords)
  | 'prose' // non-empty + not a refusal
  | 'classification'; // single label from an enum

export interface AIRequest {
  /** Use-case selects routing + defaults + validator. */
  useCase: UseCase;
  /**
   * Identifies the user for plan gating, rate limiting, quota tracking,
   * and BYOK key lookup. When omitted, the router still works but skips
   * the plan gate (used for internal/system calls). Phase 2 (Clerk) makes
   * this the verified Clerk user id.
   */
  userId?: string;
  /** Static system prompt. */
  system?: string;
  /**
   * Long stable preamble that should be prompt-cached (icon catalog,
   * few-shot examples). Anthropic supports this via cache_control;
   * OpenRouter / OpenAI / Gemini cache automatically when the prefix is
   * stable. Treated as part of the system prompt across providers.
   */
  cacheable?: string;
  /** Current turn's user message. */
  message: string;
  /** Prior turns. */
  history?: ChatTurn[];
  /** 0..1; defaults from routing if omitted. */
  temperature?: number;
  /** Defaults from routing if omitted. */
  maxTokens?: number;
  /** Override the routed model — used by evals + A/B tests. */
  modelOverride?: string;
  /** BYOK — per-request user-supplied API key. */
  apiKeyOverride?: string;
  /** Override the validator for this call. Defaults from routing. */
  validateAs?: ValidatorKey;
  /**
   * Tag for log/cost rollups. UI calls pass the route or feature name
   * (e.g. "POST /api/generate-architecture") so dashboards can split spend.
   */
  traceTag?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface AttemptLog {
  model: string;
  provider: 'openrouter' | 'anthropic-direct';
  validationPassed: boolean;
  validationError?: string;
  usage: TokenUsage;
  costUsd: number;
  durationMs: number;
}

export interface AIResponse {
  /** Final text returned to the caller (validator-passing). */
  content: string;
  /** Which model actually produced this content. */
  modelUsed: string;
  provider: 'openrouter' | 'anthropic-direct';
  /** Sum of all attempt costs (including failed fallbacks). */
  totalCostUsd: number;
  usage: TokenUsage;
  /** Every attempt, in order. Use last item for the successful call. */
  attempts: AttemptLog[];
}

// ─── Provider adapter contract ──────────────────────────────────────────────

export interface ProviderCallOpts {
  model: string;
  system?: string;
  cacheable?: string;
  message: string;
  history?: ChatTurn[];
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface ProviderCallResult {
  content: string;
  usage: TokenUsage;
}

export interface ProviderAdapter {
  readonly name: 'openrouter' | 'anthropic-direct';
  /** Returns true if this adapter can handle the model id. */
  supports(model: string): boolean;
  /** Make the API call. Throws on transport/auth errors. */
  call(opts: ProviderCallOpts): Promise<ProviderCallResult>;
  /** Optional streaming hook (Phase 7+). */
  stream?(opts: ProviderCallOpts): Promise<Response>;
}

// ─── Routing config (consumed by the router) ────────────────────────────────

export interface RouteAttempt {
  /** Model id in provider/model format, e.g. "openai/gpt-5-mini". */
  model: string;
  /** Override default temperature for this attempt. */
  temperature?: number;
  /** Override default maxTokens for this attempt. */
  maxTokens?: number;
}

export interface RouteConfig {
  /** First model tried. */
  primary: RouteAttempt;
  /** Tried in order if primary fails validation. */
  fallback: RouteAttempt[];
  /** Default validator if request doesn't override. */
  validator: ValidatorKey;
  /** Default temperature. */
  temperature: number;
  /** Default max output tokens. */
  maxTokens: number;
  /** Human-readable description of why this routing was picked. */
  rationale: string;
}
