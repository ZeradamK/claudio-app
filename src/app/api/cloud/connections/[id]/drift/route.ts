import { NextResponse } from 'next/server';

import { getArchitecture } from '@/store/architecture-store';
import { computeDriftReport } from '@/lib/cloud/drift';
import { readInventory } from '@/lib/cloud/store';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id: connectionId } = await ctx.params;
  const url = new URL(req.url);
  const architectureId = url.searchParams.get('architectureId');
  if (!architectureId) {
    return NextResponse.json(
      { error: 'architectureId query parameter is required' },
      { status: 400 }
    );
  }

  const [inv, arch] = await Promise.all([
    readInventory(connectionId),
    getArchitecture(architectureId),
  ]);

  if (!inv) {
    return NextResponse.json(
      { error: 'No inventory yet. Sync this connection first.' },
      { status: 404 }
    );
  }
  if (!arch) {
    return NextResponse.json({ error: 'Architecture not found' }, { status: 404 });
  }

  const report = computeDriftReport(
    { id: architectureId, nodes: (arch.nodes ?? []) as Array<{ id: string; data?: { label?: string; service?: string } }> },
    inv
  );
  return NextResponse.json({ report });
}
