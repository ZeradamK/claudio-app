import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { getConnection } from '@/lib/cloud/store';
import { syncConnection } from '@/lib/cloud/sync';
import { InvalidInputError, requireUuid } from '@/lib/cloud/validators';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const userId = await getOrCreateUserId();
    const { id: rawId } = await ctx.params;
    const id = requireUuid('id', rawId);

    // Ownership-checked fetch — returns null if not yours.
    const conn = await getConnection(id, userId);
    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const inv = await syncConnection(conn, userId);
    return NextResponse.json({ inventory: inv });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[api/cloud/connections/[id]/sync] failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
