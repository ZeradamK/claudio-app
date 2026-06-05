/**
 * File-backed persistence for cloud connections.
 *
 * Phase 6 deliberately mirrors the existing `data/architecture-{id}.json`
 * pattern from Phase 1 — single file at `data/cloud-connections.json` plus
 * one file per inventory snapshot. Phase 2 migrates this to Postgres tables
 * `cloud_connections` and `cloud_inventories`; until then, the file layout
 * gives us a working dev loop with zero infra.
 *
 * Security model:
 *   - Every public function takes an explicit `userId` (CWE-639 / CWE-285).
 *     The function returns null / false when the requested resource exists
 *     but is owned by someone else, so callers cannot distinguish "not
 *     yours" from "never existed" (CWE-209 indirectly).
 *   - All filesystem paths derived from a resource id are validated as
 *     UUIDs first (CWE-22 path traversal).
 *   - File writes are written to a `.tmp` and atomically renamed, with
 *     per-file in-process mutex (CWE-362 race condition / lost update).
 *
 * Concurrency: per-file mutex covers the same-process case (Next.js dev
 * server is single-process). Phase 2's DB makes inter-process atomicity
 * irrelevant.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { decrypt, encrypt, type EncryptedBlob } from './encryption';
import type { CloudConnection, CloudInventory } from './types';
import { isUuid } from './validators';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'cloud-connections.json');

/**
 * Marker stamped on connections whose on-disk record was written before
 * the userId field existed (pre-S1 commits). Treated as nobody's data —
 * never returned to any caller. Operators can manually re-attribute by
 * editing the JSON file before Phase 2 migration.
 */
const LEGACY_UNOWNED = '__legacy_unowned__';

function inventoryPath(connectionId: string) {
  if (!isUuid(connectionId)) {
    // Defense in depth — store callers should already have validated, but
    // this guarantees no path traversal can reach the filesystem.
    throw new Error('inventoryPath: connectionId is not a UUID');
  }
  return path.join(DATA_DIR, 'cloud-inventory-' + connectionId + '.json');
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ─── Encrypted-at-rest envelope ────────────────────────────────────────────

interface OnDiskConnection extends Omit<CloudConnection, 'aws' | 'lastInventory'> {
  aws?: Omit<NonNullable<CloudConnection['aws']>, 'externalId'> & {
    /** Encrypted external id. Decrypted via {@link unsealConnection}. */
    externalIdEnc: EncryptedBlob;
  };
}

function sealConnection(conn: CloudConnection): OnDiskConnection {
  const { lastInventory: _li, aws, ...rest } = conn;
  if (!aws) return { ...rest } as OnDiskConnection;
  const { externalId, ...awsRest } = aws;
  return {
    ...rest,
    aws: {
      ...awsRest,
      externalIdEnc: encrypt(externalId),
    },
  };
}

function unsealConnection(disk: OnDiskConnection): CloudConnection {
  const { aws, ...rest } = disk;
  // Backfill userId for records written before the field existed. The
  // marker makes them invisible to ownership-filtered queries.
  const userId = typeof rest.userId === 'string' && rest.userId.length > 0
    ? rest.userId
    : LEGACY_UNOWNED;
  if (!aws) return ({ ...rest, userId } as unknown) as CloudConnection;
  const { externalIdEnc, ...awsRest } = aws;
  return {
    ...rest,
    userId,
    aws: {
      ...awsRest,
      externalId: decrypt(externalIdEnc),
    },
  };
}

// ─── Atomic write with per-file mutex (CWE-362) ───────────────────────────

const FILE_MUTEXES = new Map<string, Promise<unknown>>();

async function withFileMutex<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = FILE_MUTEXES.get(file) ?? Promise.resolve();
  let release: (v: unknown) => void = () => {};
  const next = new Promise((res) => {
    release = res;
  });
  FILE_MUTEXES.set(file, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release(undefined);
    // Drop the entry once we are the last waiter.
    if (FILE_MUTEXES.get(file) === next) FILE_MUTEXES.delete(file);
  }
}

async function atomicWriteJson(file: string, payload: unknown): Promise<void> {
  await ensureDataDir();
  const tmp = file + '.' + process.pid + '.' + randomUUID() + '.tmp';
  const body = JSON.stringify(payload, null, 2);
  await fs.writeFile(tmp, body, 'utf8');
  await fs.rename(tmp, file);
}

// ─── Connection CRUD ───────────────────────────────────────────────────────

async function readAllOnDisk(): Promise<OnDiskConnection[]> {
  try {
    const raw = await fs.readFile(CONNECTIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAllOnDisk(items: OnDiskConnection[]): Promise<void> {
  await withFileMutex(CONNECTIONS_FILE, () =>
    atomicWriteJson(CONNECTIONS_FILE, items)
  );
}

/**
 * List the caller's connections. Connections owned by other users are
 * filtered out before they leave the store — there is no API to "list all".
 */
export async function listConnections(userId: string): Promise<CloudConnection[]> {
  if (!userId || userId === LEGACY_UNOWNED) return [];
  const disk = await readAllOnDisk();
  const conns = disk
    .map(unsealConnection)
    .filter((c) => c.userId === userId);
  // Attach the latest cached inventory (if present on disk) for each.
  await Promise.all(
    conns.map(async (c) => {
      try {
        const inv = await readInventoryRaw(c.id);
        if (inv) c.lastInventory = inv;
      } catch {
        // best-effort — UI shows "no inventory yet"
      }
    })
  );
  return conns;
}

/**
 * Returns the connection iff the caller owns it. Returns null both when
 * the id is unknown AND when it belongs to another user — callers cannot
 * distinguish (CWE-209 information exposure).
 */
export async function getConnection(
  id: string,
  userId: string
): Promise<CloudConnection | null> {
  if (!isUuid(id)) return null;
  if (!userId || userId === LEGACY_UNOWNED) return null;
  const disk = await readAllOnDisk();
  const found = disk.find((c) => c.id === id);
  if (!found) return null;
  const conn = unsealConnection(found);
  if (conn.userId !== userId) return null;
  try {
    const inv = await readInventoryRaw(conn.id);
    if (inv) conn.lastInventory = inv;
  } catch {
    /* best-effort */
  }
  return conn;
}

export async function createConnection(
  partial: Omit<CloudConnection, 'id' | 'createdAt' | 'status'>
): Promise<CloudConnection> {
  if (!partial.userId || partial.userId === LEGACY_UNOWNED) {
    throw new Error('createConnection: userId is required');
  }
  const newConn: CloudConnection = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...partial,
  };
  // Use mutex to avoid lost-update race when multiple POSTs land concurrently.
  await withFileMutex(CONNECTIONS_FILE, async () => {
    const disk = await readAllOnDisk();
    disk.push(sealConnection(newConn));
    await atomicWriteJson(CONNECTIONS_FILE, disk);
  });
  return newConn;
}

/**
 * Caller-owned update. Returns null if not found OR not owned. Caller is
 * responsible for whitelisting which fields of `patch` are allowed (see
 * `pickPatchableConnectionFields` in patch.ts for the route-level guard
 * against CWE-915 mass assignment).
 */
export async function updateConnection(
  id: string,
  userId: string,
  patch: Partial<Omit<CloudConnection, 'id' | 'createdAt' | 'userId'>>
): Promise<CloudConnection | null> {
  if (!isUuid(id) || !userId || userId === LEGACY_UNOWNED) return null;
  let result: CloudConnection | null = null;
  await withFileMutex(CONNECTIONS_FILE, async () => {
    const disk = await readAllOnDisk();
    const idx = disk.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const current = unsealConnection(disk[idx]);
    if (current.userId !== userId) return;
    // userId, id, createdAt are immutable. AWS sub-object merge preserves
    // any caller-controlled write of roleArn/externalId — those are
    // separately guarded by pickPatchableConnectionFields() at the route.
    const merged: CloudConnection = {
      ...current,
      ...patch,
      id,
      createdAt: current.createdAt,
      userId: current.userId,
    };
    disk[idx] = sealConnection(merged);
    await atomicWriteJson(CONNECTIONS_FILE, disk);
    result = merged;
  });
  return result;
}

export async function deleteConnection(id: string, userId: string): Promise<boolean> {
  if (!isUuid(id) || !userId || userId === LEGACY_UNOWNED) return false;
  let removed = false;
  await withFileMutex(CONNECTIONS_FILE, async () => {
    const disk = await readAllOnDisk();
    const target = disk.find((c) => c.id === id);
    if (!target) return;
    const owner = unsealConnection(target).userId;
    if (owner !== userId) return;
    const filtered = disk.filter((c) => c.id !== id);
    await atomicWriteJson(CONNECTIONS_FILE, filtered);
    removed = true;
  });
  if (removed) {
    // best-effort cleanup of inventory file
    try {
      await fs.unlink(inventoryPath(id));
    } catch {
      /* not all connections have an inventory yet */
    }
  }
  return removed;
}

// ─── Inventory CRUD ────────────────────────────────────────────────────────

/**
 * Save inventory. Caller MUST verify ownership before invoking — this is
 * usually called from a sync job triggered by an authenticated POST that
 * already fetched the connection via {@link getConnection}.
 */
export async function saveInventory(inv: CloudInventory): Promise<void> {
  if (!isUuid(inv.connectionId)) throw new Error('saveInventory: invalid connectionId');
  const file = inventoryPath(inv.connectionId);
  await withFileMutex(file, () => atomicWriteJson(file, inv));
}

/**
 * Read inventory for a connection owned by `userId`. Returns null both
 * when the connection does not exist, is owned by someone else, or has
 * not been synced yet.
 */
export async function readInventory(
  connectionId: string,
  userId: string
): Promise<CloudInventory | null> {
  // Ownership check must come before any filesystem touch.
  const conn = await getConnection(connectionId, userId);
  if (!conn) return null;
  return readInventoryRaw(connectionId);
}

/**
 * Internal: read inventory without ownership check. Only callable from
 * within this module. External callers must use {@link readInventory}.
 */
async function readInventoryRaw(connectionId: string): Promise<CloudInventory | null> {
  if (!isUuid(connectionId)) return null;
  try {
    const raw = await fs.readFile(inventoryPath(connectionId), 'utf8');
    return JSON.parse(raw) as CloudInventory;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw err;
  }
}
