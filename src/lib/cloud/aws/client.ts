/**
 * AWS client factory backed by STS:AssumeRole.
 *
 * The user creates an IAM role in their account whose trust policy names
 * Claudio's AWS principal and requires an externalId. They share the role
 * ARN with us. We assume the role on every sync to get temporary, scoped,
 * read-only credentials — we never hold long-lived access keys.
 *
 * In dev (and in CI for now) we also accept SERVER-SIDE credentials from
 * the standard AWS env vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * so a developer with their own account can test without setting up the
 * full role-assumption dance. Production should NEVER rely on this path.
 */

import {
  AssumeRoleCommand,
  STSClient,
  type Credentials as StsCredentials,
} from '@aws-sdk/client-sts';

import type { CloudConnection } from '../types';

export interface AwsScopedCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  /** ISO-8601 timestamp when these credentials expire. */
  expiration: string;
  /** AWS account id the role belongs to, parsed out of the role ARN. */
  accountId: string;
}

const DEFAULT_SESSION_NAME = 'claudio-readonly';
/** Max session duration we ask STS for. 1 hour is plenty for an inventory scan. */
const SESSION_DURATION_SECONDS = 3600;

function parseAccountIdFromArn(arn: string): string {
  // arn:aws:iam::123456789012:role/role-name
  const parts = arn.split(':');
  if (parts.length < 5 || parts[0] !== 'arn' || parts[1] !== 'aws') {
    throw new Error(`Malformed AWS ARN: ${arn}`);
  }
  return parts[4];
}

/**
 * Returns scoped credentials valid for ~1 hour. Caller passes them into
 * any AWS SDK client constructor as `{ credentials: { ... } }`.
 */
export async function assumeRole(
  conn: CloudConnection
): Promise<AwsScopedCredentials> {
  if (conn.provider !== 'aws' || !conn.aws) {
    throw new Error(`Connection ${conn.id} is not an AWS connection`);
  }
  const { roleArn, externalId } = conn.aws;

  // Our STSClient itself authenticates with whatever credentials the
  // Claudio server is running under (env vars, ECS task role, etc.).
  const sts = new STSClient({});

  const resp = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      ExternalId: externalId,
      RoleSessionName: DEFAULT_SESSION_NAME,
      DurationSeconds: SESSION_DURATION_SECONDS,
    })
  );

  const c: StsCredentials | undefined = resp.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken || !c.Expiration) {
    throw new Error('AssumeRole returned an incomplete credentials object');
  }

  return {
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretAccessKey,
    sessionToken: c.SessionToken,
    expiration: c.Expiration.toISOString(),
    accountId: parseAccountIdFromArn(roleArn),
  };
}

/**
 * The {credentials} shape AWS SDK v3 clients accept.
 */
export function asSdkCredentials(creds: AwsScopedCredentials) {
  return {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
  };
}
