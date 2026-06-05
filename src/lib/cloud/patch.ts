/**
 * CWE-915 mass-assignment guard for CloudConnection PATCH bodies.
 *
 * Routes MUST extract patchable fields through this helper rather than
 * casting `req.body` to Partial<CloudConnection> and spreading. The
 * whitelist is explicit; new fields are denied by default.
 *
 * Fields deliberately NOT patchable:
 *   - id, createdAt, userId           identity / ownership
 *   - status, lastInventory,          owned by sync orchestrator
 *     lastSyncedAt, lastErrorMessage
 *   - provider, mode                  immutable post-create (a "mock"
 *                                     connection that flips to "live" without
 *                                     re-validating roleArn would skip the
 *                                     ARN format check from S2)
 *   - aws.roleArn                     immutable post-create per S2 audit
 *     (attacker-controlled roleArn + sync = AWS confused deputy)
 *   - aws.externalId                  immutable per AWS guidance — externalId
 *     is the trust-policy secret that proves the role assumer is us; if a
 *     user could change it, they could swap into a third party's connection
 *   - aws.accountId                   computed from sync, not user-supplied
 */

import {
  InvalidInputError,
  requireAwsRegions,
  requireSafeName,
} from './validators';
import type { CloudConnection } from './types';

/**
 * The subset of CloudConnection fields a caller is permitted to modify via
 * PATCH. Everything else must be updated through a domain-specific endpoint
 * (e.g. sync) or not at all.
 */
export interface PatchableConnectionFields {
  name?: string;
  aws?: { regions?: string[] };
}

/**
 * Extract the patchable fields from an untyped request body. Unknown keys
 * are silently dropped; explicitly forbidden keys raise InvalidInputError
 * so callers see a clear error and we can detect probing in logs.
 *
 * Returned shape is suitable for `updateConnection(id, userId, patch)` —
 * note `aws` is a partial; the store merges it into the existing aws block
 * so callers can update regions without re-supplying roleArn/externalId.
 */
export function pickPatchableConnectionFields(
  body: Record<string, unknown>
): Partial<Omit<CloudConnection, 'id' | 'createdAt' | 'userId'>> {
  // Detect probing — anything blatantly trying to escalate gets a 400 so
  // a real client bug surfaces fast and a malicious caller learns nothing.
  const forbidden = [
    'id',
    'userId',
    'createdAt',
    'status',
    'provider',
    'mode',
    'lastInventory',
    'lastSyncedAt',
    'lastErrorMessage',
  ];
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      throw new InvalidInputError(key, 'is not modifiable via PATCH');
    }
  }

  const out: Partial<Omit<CloudConnection, 'id' | 'createdAt' | 'userId'>> = {};

  if (body.name !== undefined) {
    out.name = requireSafeName('name', body.name);
  }

  if (body.aws !== undefined) {
    if (body.aws === null || typeof body.aws !== 'object' || Array.isArray(body.aws)) {
      throw new InvalidInputError('aws', 'must be an object');
    }
    const awsIn = body.aws as Record<string, unknown>;

    // Same defense at the nested level — block roleArn, externalId,
    // accountId from being mass-assigned via the nested aws block.
    const nestedForbidden = ['roleArn', 'externalId', 'accountId'];
    for (const key of nestedForbidden) {
      if (Object.prototype.hasOwnProperty.call(awsIn, key)) {
        throw new InvalidInputError('aws.' + key, 'is immutable after connection creation');
      }
    }

    const awsPatch: { regions?: string[] } = {};
    if (awsIn.regions !== undefined) {
      awsPatch.regions = requireAwsRegions('aws.regions', awsIn.regions);
    }
    // Only attach `aws` if there's actually something in it; otherwise
    // the merge in updateConnection would set aws to an empty object and
    // drop required fields like roleArn.
    if (Object.keys(awsPatch).length > 0) {
      // Type assertion: the store merges this partial into existing aws.
      out.aws = awsPatch as NonNullable<CloudConnection['aws']>;
    }
  }

  return out;
}
