import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

import { getOrCreateUserId } from '@/lib/auth/user';
import { createConnection, listConnections } from '@/lib/cloud/store';
import {
  InvalidInputError,
  requireAwsRegions,
  requireAwsRoleArn,
  requireCloudMode,
  requireCloudProvider,
  requireSafeName,
} from '@/lib/cloud/validators';
import type { CreateConnectionResponse } from '@/lib/cloud/types';

export async function GET() {
  try {
    const userId = await getOrCreateUserId();
    const connections = await listConnections(userId);
    return NextResponse.json({ connections });
  } catch (err) {
    // Generic message — never echo raw err.message to the client; the audit
    // flagged that as M2 (provider response leakage). Log server-side only.
    console.error('[api/cloud/connections] GET failed:', err);
    return NextResponse.json({ error: 'Failed to list connections' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getOrCreateUserId();

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const name = requireSafeName('name', body.name);
    const provider = requireCloudProvider('provider', body.provider);
    const mode = requireCloudMode('mode', body.mode);

    let externalId: string | undefined;
    let awsConfig: {
      externalId: string;
      roleArn: string;
      regions: string[];
    } | undefined;

    if (provider === 'aws') {
      const awsInput = (body.aws ?? {}) as Record<string, unknown>;
      // Live mode requires a real role ARN at create time; mock mode tolerates
      // a placeholder so the wizard can render before the user has set up AWS.
      const roleArn = mode === 'live'
        ? requireAwsRoleArn('aws.roleArn', awsInput.roleArn)
        : (typeof awsInput.roleArn === 'string' ? awsInput.roleArn : '');
      const regions = awsInput.regions !== undefined
        ? requireAwsRegions('aws.regions', awsInput.regions)
        : ['us-east-1'];
      awsConfig = {
        // Always generate server-side per AWS confused-deputy guidance:
        // the external id MUST be controlled by the service provider, never
        // user-supplied. 16 random bytes = 128 bits of entropy, hex-encoded
        // = 32 chars in the [0-9a-f] safe-set.
        externalId: randomBytes(16).toString('hex'),
        roleArn,
        regions,
      };
      externalId = awsConfig.externalId;
    }

    const conn = await createConnection({
      userId,
      name,
      provider,
      mode,
      aws: awsConfig,
    });

    const resp: CreateConnectionResponse = {
      connection: conn,
      // Only return the externalId on creation (live mode). After this, it's
      // sealed on disk and the user already pasted it into their trust policy.
      externalId: mode === 'live' ? externalId : undefined,
    };
    return NextResponse.json(resp);
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    console.error('[api/cloud/connections] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}
