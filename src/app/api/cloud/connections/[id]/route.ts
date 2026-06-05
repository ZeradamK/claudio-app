import { NextResponse } from 'next/server';

import { getOrCreateUserId } from '@/lib/auth/user';
import { deleteConnection, getConnection, updateConnection } from '@/lib/cloud/store';
import { pickPatchableConnectionFields } from '@/lib/cloud/patch';
import {
  InvalidInputError,
  requireUuid,
} from '@/lib/cloud/validators';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const userId = await getOrCreateUserId();
    const { id: rawId } = await ctx.params;
    const id = requireUuid('id', rawId);
    const conn = await getConnection(id, userId);
    if (!conn) {
      // 404 (NOT 403) — do not leak whether the resource exists.
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    return NextResponse.json({ connection: conn });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[api/cloud/connections/[id]] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load connection' }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const userId = await getOrCreateUserId();
    const { id: rawId } = await ctx.params;
    const id = requireUuid('id', rawId);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // CWE-915 mass assignment: only the whitelisted fields are extracted
    // from the body. Anything else (id, userId, roleArn, externalId,
    // status, accountId, provider, mode, createdAt, lastInventory) is
    // silently dropped, not preserved through ...spread.
    const patch = pickPatchableConnectionFields(body);

    const updated = await updateConnection(id, userId, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    return NextResponse.json({ connection: updated });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    }
    console.error('[api/cloud/connections/[id]] PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const userId = await getOrCreateUserId();
    const { id: rawId } = await ctx.params;
    const id = requireUuid('id', rawId);
    const ok = await deleteConnection(id, userId);
    if (!ok) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[api/cloud/connections/[id]] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}
