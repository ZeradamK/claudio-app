import { NextResponse } from 'next/server';

import { getConnection } from '@/lib/cloud/store';
import { syncConnection } from '@/lib/cloud/sync';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const conn = await getConnection(id);
  if (!conn) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }
  try {
    const inv = await syncConnection(conn);
    return NextResponse.json({ inventory: inv });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
