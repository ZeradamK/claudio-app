import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

import { createConnection, listConnections } from '@/lib/cloud/store';
import type { CreateConnectionRequest, CreateConnectionResponse } from '@/lib/cloud/types';

export async function GET() {
  try {
    const connections = await listConnections();
    return NextResponse.json({ connections });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list connections' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateConnectionRequest;
    if (!body?.name || !body.provider || !body.mode) {
      return NextResponse.json(
        { error: 'name, provider, and mode are required' },
        { status: 400 }
      );
    }

    let externalId: string | undefined;
    const awsConfig = body.provider === 'aws'
      ? {
          // Always generate a fresh externalId server-side; clients never pick this.
          externalId: randomBytes(16).toString('hex'),
          roleArn: body.aws?.roleArn ?? '',
          regions: body.aws?.regions?.length ? body.aws.regions : ['us-east-1'],
        }
      : undefined;

    if (awsConfig) externalId = awsConfig.externalId;

    const conn = await createConnection({
      name: body.name,
      provider: body.provider,
      mode: body.mode,
      aws: awsConfig,
    });

    const resp: CreateConnectionResponse = {
      connection: conn,
      // Only return the externalId on creation (live mode). After this, it's
      // sealed on disk and the user already pasted it into their trust policy.
      externalId: body.mode === 'live' ? externalId : undefined,
    };
    return NextResponse.json(resp);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create connection' },
      { status: 500 }
    );
  }
}
