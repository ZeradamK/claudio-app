import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { readInventory } from '@/lib/cloud/store';
import { InvalidInputError, requireUuid } from '@/lib/cloud/validators';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const userId = await getOrCreateUserId();
    const { id: rawId } = await ctx.params;
    const id = requireUuid('id', rawId);

    // readInventory performs the ownership check internally — it returns
    // null for unknown id OR for someone else's id (indistinguishable to
    // the caller, per OWASP IDOR guidance).
    const inv = await readInventory(id, userId);
    if (!inv) {
      return NextResponse.json(
        { error: 'No inventory yet. Sync this connection first.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ inventory: inv });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[api/cloud/connections/[id]/inventory] failed:', err);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}
