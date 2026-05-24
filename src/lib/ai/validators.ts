/**
 * Output validators — the quality gate that decides whether to accept a
 * model's response or fall back to a stronger model.
 *
 * Each validator returns:
 *   { ok: true, content: string }   — accepted; content may be normalized
 *   { ok: false, error: string }    — rejected; the router falls back
 *
 * Validators are intentionally cheap (no LLM calls, no network).
 * They catch the common failure modes: invalid JSON, empty responses,
 * model refusals, missing required fields.
 */

import { jsonrepair } from 'jsonrepair';

import type { ValidatorKey } from './types';

export interface ValidationResult {
  ok: boolean;
  /** Possibly normalized content (e.g. fences stripped) on success. */
  content?: string;
  error?: string;
}

/** Strip ```json fences a model may add despite instructions. */
function stripJsonFences(s: string): string {
  const trimmed = s.trim();
  const match = trimmed.match(/^```(?:json|javascript|typescript)?\s*\n?([\s\S]*?)\n?```\s*$/);
  return match ? match[1].trim() : trimmed;
}

const REFUSAL_PHRASES = [
  "i can't",
  "i cannot",
  "i'm unable",
  'sorry, but',
  'i apologize',
  'as an ai',
];

function looksLikeRefusal(s: string): boolean {
  const lc = s.trim().toLowerCase().slice(0, 200);
  return REFUSAL_PHRASES.some((p) => lc.startsWith(p));
}

// ─── individual validators ──────────────────────────────────────────────────

function validateJsonGeneric(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: false, error: 'empty response' };
  const stripped = stripJsonFences(raw);
  try {
    JSON.parse(stripped);
    return { ok: true, content: stripped };
  } catch {
    try {
      const repaired = jsonrepair(stripped);
      JSON.parse(repaired);
      return { ok: true, content: repaired };
    } catch (e) {
      return { ok: false, error: `invalid JSON: ${e instanceof Error ? e.message : 'parse failed'}` };
    }
  }
}

function validateJsonArchitecture(raw: string): ValidationResult {
  const generic = validateJsonGeneric(raw);
  if (!generic.ok) return generic;
  try {
    const parsed = JSON.parse(generic.content!);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'response is not a JSON object' };
    }
    if (!Array.isArray(parsed.nodes)) {
      return { ok: false, error: "missing required 'nodes' array" };
    }
    if (!Array.isArray(parsed.edges)) {
      return { ok: false, error: "missing required 'edges' array" };
    }
    // Each node should have at minimum an id and data.
    for (const node of parsed.nodes) {
      if (!node?.id) return { ok: false, error: 'a node is missing an id' };
    }
    return { ok: true, content: generic.content };
  } catch (e) {
    return { ok: false, error: `architecture schema check failed: ${String(e)}` };
  }
}

function validateCodeBlock(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: false, error: 'empty response' };
  if (looksLikeRefusal(raw)) return { ok: false, error: 'model refused' };

  // Strip outer fences if present so the caller gets clean code.
  const stripped = stripJsonFences(raw);

  if (stripped.length < 20) {
    return { ok: false, error: `too short (${stripped.length} chars)` };
  }
  // Has at least one code-shape indicator
  const looksLikeCode =
    /[{}\[\]();=]/.test(stripped) ||
    /\b(import|from|class|def|function|const|let|var|new|return|public|private)\b/.test(stripped);
  if (!looksLikeCode) {
    return { ok: false, error: 'output does not look like code' };
  }
  return { ok: true, content: stripped };
}

function validateProse(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: false, error: 'empty response' };
  if (looksLikeRefusal(raw)) return { ok: false, error: 'model refused' };
  if (raw.trim().length < 10) {
    return { ok: false, error: 'response too short to be useful' };
  }
  return { ok: true, content: raw };
}

function validateClassification(raw: string): ValidationResult {
  // Accept either bare label ("modify") or wrapped JSON ({"label":"modify"}).
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'empty classification' };
  if (looksLikeRefusal(trimmed)) return { ok: false, error: 'model refused' };
  return { ok: true, content: trimmed };
}

const VALIDATORS: Record<ValidatorKey, (raw: string) => ValidationResult> = {
  'json-architecture': validateJsonArchitecture,
  'json-generic': validateJsonGeneric,
  'code-block': validateCodeBlock,
  prose: validateProse,
  classification: validateClassification,
};

export function validate(key: ValidatorKey, raw: string): ValidationResult {
  const fn = VALIDATORS[key];
  if (!fn) return { ok: true, content: raw }; // unknown validator → permissive
  return fn(raw);
}
