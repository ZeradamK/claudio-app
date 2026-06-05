/**
 * Shared input validators for the cloud layer.
 *
 * Centralized so every route enforces the same regex. Hardening references:
 *   - CWE-22   (path traversal):       isUuid()
 *   - CWE-915  (mass assignment):      pickPatchableConnectionFields() (in patch.ts)
 *   - CWE-1336 (template injection):   isAwsExternalId()
 *   - CWE-285  (improper authorization): requireUuid + ownership check at call site
 *
 * Every validator returns either a typed-narrowed value or throws an
 * InvalidInputError. Routes translate that into HTTP 400.
 */

export class InvalidInputError extends Error {
  readonly status = 400;
  readonly field: string;
  constructor(field: string, message: string) {
    super(field + ': ' + message);
    this.name = 'InvalidInputError';
    this.field = field;
  }
}

/**
 * Thrown when the authenticated caller does not own the requested
 * resource. Routes translate this into HTTP 404 (NOT 403) on purpose —
 * a 403 would leak resource existence. See OWASP IDOR cheatsheet:
 * never reveal whether a resource the caller cannot access exists.
 */
export class NotOwnerError extends Error {
  readonly status = 404;
  constructor(resourceType: string) {
    super(resourceType + ' not found');
    this.name = 'NotOwnerError';
  }
}

// ─── Identifiers ──────────────────────────────────────────────────────────

/** RFC 4122 v4 UUID, lowercase canonical form. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function requireUuid(field: string, value: unknown): string {
  if (!isUuid(value)) {
    throw new InvalidInputError(field, 'must be a canonical v4 UUID');
  }
  return value;
}

// ─── AWS-format checks (per AWS docs, current as of 2026-06) ─────────────

/**
 * AWS-allowed external id charset per IAM docs is broader:
 *   minimum 2, maximum 1224 chars; [A-Za-z0-9+=,.@:/-], no whitespace.
 *   https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
 *
 * We deliberately tighten to a printable safe-set that is URL-safe and
 * YAML-safe without quoting: [A-Za-z0-9_+.-]. 16-char minimum gives us
 * 128 bits of entropy when generated from crypto.randomBytes(16).hex().
 *
 * CWE-1336 (template injection) — guarantees an externalId can never
 * contain newlines, colons, or YAML control characters.
 */
const EXTERNAL_ID_CHARSET = /^[A-Za-z0-9_+.\-]{16,128}$/;

export function isAwsExternalId(value: unknown): value is string {
  return typeof value === 'string' && EXTERNAL_ID_CHARSET.test(value);
}

export function requireAwsExternalId(field: string, value: unknown): string {
  if (!isAwsExternalId(value)) {
    throw new InvalidInputError(
      field,
      'must be 16-128 chars of [A-Za-z0-9_+.-] (no whitespace, no YAML metacharacters)'
    );
  }
  return value;
}

/**
 * IAM role ARN. Account id is exactly 12 digits; partition is one of the
 * three AWS partitions; role name + path use the IAM-allowed charset.
 */
const ROLE_ARN_REGEX =
  /^arn:(aws|aws-cn|aws-us-gov):iam::\d{12}:role(?:\/[A-Za-z0-9+=,.@_-]+)+$/;

export function isAwsRoleArn(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 2048 && ROLE_ARN_REGEX.test(value);
}

export function requireAwsRoleArn(field: string, value: unknown): string {
  if (!isAwsRoleArn(value)) {
    throw new InvalidInputError(field, 'must be a valid IAM role ARN');
  }
  return value;
}

/** AWS region code e.g. us-east-1, eu-west-3, ap-northeast-1. */
const REGION_REGEX =
  /^[a-z]{2,3}-(north|south|east|west|central|northeast|southeast|northwest|southwest)-\d$/;

export function isAwsRegion(value: unknown): value is string {
  return typeof value === 'string' && REGION_REGEX.test(value);
}

export function requireAwsRegions(field: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    throw new InvalidInputError(
      field,
      'must be a non-empty array of up to 32 AWS region codes'
    );
  }
  for (const r of value) {
    if (!isAwsRegion(r)) {
      const safe = String(r).slice(0, 32);
      throw new InvalidInputError(field, "'" + safe + "' is not a valid AWS region");
    }
  }
  return value as string[];
}

// ─── Free-form text (connection name) ─────────────────────────────────────

/**
 * Connection display name. Rejects control characters (CWE-176) and the
 * minimum set of HTML/script metacharacters (CWE-79) so the name renders
 * safely in any UI surface without per-component escape audits.
 */


const UNSAFE_NAME_CODES = new Set<number>([0x22, 0x3C, 0x3E, 0x5C, 0x60]);

export function requireSafeName(field: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidInputError(field, 'must be a string');
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new InvalidInputError(field, 'must be 1-80 characters');
  }
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code < 0x20 || code === 0x7F || UNSAFE_NAME_CODES.has(code)) {
      throw new InvalidInputError(field, 'contains control or unsafe characters');
    }
  }
  return trimmed;
}

// ─── Plan / mode / provider enums ─────────────────────────────────────────

const CLOUD_PROVIDERS = ['aws', 'gcp', 'azure'] as const;
const CLOUD_MODES = ['live', 'mock'] as const;

export function requireCloudProvider(field: string, value: unknown): (typeof CLOUD_PROVIDERS)[number] {
  if (!CLOUD_PROVIDERS.includes(value as (typeof CLOUD_PROVIDERS)[number])) {
    throw new InvalidInputError(field, 'must be one of: ' + CLOUD_PROVIDERS.join(', '));
  }
  return value as (typeof CLOUD_PROVIDERS)[number];
}

export function requireCloudMode(field: string, value: unknown): (typeof CLOUD_MODES)[number] {
  if (!CLOUD_MODES.includes(value as (typeof CLOUD_MODES)[number])) {
    throw new InvalidInputError(field, 'must be one of: ' + CLOUD_MODES.join(', '));
  }
  return value as (typeof CLOUD_MODES)[number];
}
