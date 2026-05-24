import { NextResponse } from 'next/server';

import { readInventory } from '@/lib/cloud/store';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const inv = await readInventory(id);
  if (!inv) {
    return NextResponse.json(
      { error: 'No inventory yet. Sync this connection first.' },
      { status: 404 }
    );
  }
  return NextResponse.json({ inventory: inv });
}
