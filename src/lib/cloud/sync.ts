/**
 * Sync orchestrator. The `/api/cloud/connections/[id]/sync` route delegates
 * here. Decides whether to call the real AWS SDK or return mock inventory,
 * persists the result, and updates connection status.
 */

import { assumeRole } from './aws/client';
import { buildMockInventory } from './aws/mock';
import { runInventoryScan } from './aws/scanners';
import { saveInventory, updateConnection } from './store';
import type { CloudConnection, CloudInventory } from './types';

export async function syncConnection(conn: CloudConnection): Promise<CloudInventory> {
  // ─── Mock mode: short-circuit ───────────────────────────────────────────
  if (conn.mode === 'mock') {
    const inv = buildMockInventory(conn.id);
    await saveInventory(inv);
    await updateConnection(conn.id, {
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
    throw new Error(`Live mode requires an AWS connection; ${conn.id} has ${conn.provider}`);
  }
  const { regions } = conn.aws;

  try {
    const creds = await assumeRole(conn);
    const inv = await runInventoryScan(conn.id, regions, creds);
    await saveInventory(inv);
    await updateConnection(conn.id, {
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
    await updateConnection(conn.id, {
      status,
      lastErrorMessage: message,
    });
    throw err;
  }
}
