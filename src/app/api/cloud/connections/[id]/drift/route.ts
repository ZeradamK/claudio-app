import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { getArchitecture } from '@/store/architecture-store';
import { computeDriftReport } from '@/lib/cloud/drift';
import { readInventory } from '@/lib/cloud/store';
import { InvalidInputError, requireUuid } from '@/lib/cloud/validators';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const userId = await getOrCreateUserId();
    const { id: rawConnectionId } = await ctx.params;
    const connectionId = requireUuid('id', rawConnectionId);

    const url = new URL(req.url);
    const rawArchId = url.searchParams.get('architectureId');
    if (!rawArchId) {
      return NextResponse.json(
        { error: 'architectureId query parameter is required' },
        { status: 400 }
      );
    }
    // Validate architectureId as UUID — both for CWE-22 (the architecture
    // store may build a file path from this) and to prevent the architecture
    // route's own IDOR from being exposed via drift.
    const architectureId = requireUuid('architectureId', rawArchId);

    // Inventory fetch is ownership-checked. Returns null for unknown OR
    // not-yours connections — both result in the same 404.
    const [inv, arch] = await Promise.all([
      readInventory(connectionId, userId),
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
      {
        id: architectureId,
        nodes: (arch.nodes ?? []) as Array<{
          id: string;
          data?: { label?: string; service?: string };
        }>,
      },
      inv
    );
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[api/cloud/connections/[id]/drift] failed:', err);
    return NextResponse.json({ error: 'Failed to compute drift' }, { status: 500 });
  }
}
