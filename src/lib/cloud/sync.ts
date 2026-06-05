/**
 * Sync orchestrator. The `/api/cloud/connections/[id]/sync` route delegates
 * here after performing the ownership check via `getConnection(id, userId)`.
 * The owner's userId is plumbed through so the post-sync status updates also
 * go through the ownership-checked store API (CWE-639 defense in depth).
 */

import { assumeRole } from './aws/client';
import { buildMockInventory } from './aws/mock';
import { runInventoryScan } from './aws/scanners';
import { saveInventory, updateConnection } from './store';
import type { CloudConnection, CloudInventory } from './types';

export async function syncConnection(
  conn: CloudConnection,
  callerUserId: string
): Promise<CloudInventory> {
  // Trust-but-verify: the caller is responsible for proving ownership via
  // getConnection() before calling us. We re-assert here so a future caller
  // that forgets cannot accidentally widen the blast radius.
  if (conn.userId !== callerUserId) {
    throw new Error('syncConnection: caller does not own this connection');
  }

  // ─── Mock mode: short-circuit ───────────────────────────────────────────
  if (conn.mode === 'mock') {
    const inv = buildMockInventory(conn.id);
    await saveInventory(inv);
    await updateConnection(conn.id, callerUserId, {
      status: 'connected',
      lastSyncedAt: inv.syncedAt,
      lastErrorMessage: undefined,
      aws: conn.aws
        ? { ...conn.aws, accountId: conn.aws.accountId ?? '123456789012' }
        : undefined,
    });
    return inv;
  }

  // ─── Live mode: real AWS ────────────────────────────────────────────────
  if (conn.provider !== 'aws' || !conn.aws) {
    throw new Error(
      'Live mode requires an AWS connection; ' + conn.id + ' has ' + conn.provider
    );
  }
  const { regions } = conn.aws;

  try {
    const creds = await assumeRole(conn);
    const inv = await runInventoryScan(conn.id, regions, creds);
    await saveInventory(inv);
    await updateConnection(conn.id, callerUserId, {
      status: 'connected',
      lastSyncedAt: inv.syncedAt,
      lastErrorMessage: undefined,
      aws: { ...conn.aws, accountId: creds.accountId },
    });
    return inv;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /AccessDenied|not authorized|AccessKey|signature/i.test(message)
      ? 'unauthorized'
      : 'error';
    await updateConnection(conn.id, callerUserId, {
      status,
      lastErrorMessage: message,
    });
    throw err;
  }
}
