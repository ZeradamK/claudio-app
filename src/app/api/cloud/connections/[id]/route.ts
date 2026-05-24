import { NextResponse } from 'next/server';

import { deleteConnection, getConnection, updateConnection } from '@/lib/cloud/store';
import type { CloudConnection } from '@/lib/cloud/types';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const conn = await getConnection(id);
  if (!conn) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }
  return NextResponse.json({ connection: conn });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const patch = (await req.json()) as Partial<CloudConnection>;
    const updated = await updateConnection(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    return NextResponse.json({ connection: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update connection' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await deleteConnection(id);
  if (!ok) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
