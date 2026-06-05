/**
 * Boot-time environment validators.
 *
 * Called from key code paths (instead of at module load) so that we fail
 * fast with a clear message when a required env var is missing or
 * malformed, rather than during the first user request.
 *
 * Audit references:
 *   - S7 / CWE-321: ENCRYPTION_KEY presence + format
 *   - General CWE-1188 (Initialization with Insecure Default): every
 *     dev-fallback default has been removed; this module is the single
 *     place that asserts the absence of "insecure defaults still in use"
 */

let validated = false;

interface RequiredEnvSpec {
  name: string;
  reason: string;
  validate?: (value: string) => string | null; // returns error message or null
}

const REQUIRED: RequiredEnvSpec[] = [
  {
    name: 'ENCRYPTION_KEY',
    reason: 'AES-256-GCM key for BYOK + cloud externalId at-rest encryption',
    validate(v) {
      const decoded = Buffer.from(v, 'base64');
      if (decoded.length !== 32) {
        return 'must decode to exactly 32 bytes (got ' + decoded.length + ')';
      }
      return null;
    },
  },
];

/**
 * Throws if any REQUIRED env var is missing or fails validation.
 * Idempotent: runs once per process; subsequent calls are no-ops.
 *
 * Call from any code path that touches a security-sensitive resource
 * (encryption, BYOK store, plan gate). Cheap on hot paths thanks to the
 * `validated` flag.
 */
export function assertSecureEnv(): void {
  if (validated) return;

  const missing: string[] = [];
  const malformed: string[] = [];

  for (const spec of REQUIRED) {
    const value = process.env[spec.name]?.trim();
    if (!value) {
      missing.push(spec.name + ' (' + spec.reason + ')');
      continue;
    }
    if (spec.validate) {
      const err = spec.validate(value);
      if (err) {
        malformed.push(spec.name + ': ' + err);
      }
    }
  }

  if (missing.length || malformed.length) {
    const parts: string[] = [];
    if (missing.length) parts.push('MISSING: ' + missing.join('; '));
    if (malformed.length) parts.push('MALFORMED: ' + malformed.join('; '));
    throw new Error(
      'Insecure environment configuration. ' + parts.join(' | ')
    );
  }

  validated = true;
}

/** Test helper — reset memoized state. */
export function resetSecurityValidation(): void {
  validated = false;
}
