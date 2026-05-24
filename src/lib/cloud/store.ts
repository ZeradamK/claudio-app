/**
 * File-backed persistence for cloud connections.
 *
 * Phase 6 deliberately mirrors the existing `data/architecture-{id}.json`
 * pattern from Phase 1 — single file at `data/cloud-connections.json` plus
 * one file per inventory snapshot. Phase 2 migrates this to Postgres tables
 * `cloud_connections` and `cloud_inventories`; until then, the file layout
 * gives us a working dev loop with zero infra.
 *
 * Concurrency: reads/writes are not atomic across processes. Since dev is
 * single-process Next.js, this is fine. Phase 2's DB makes it irrelevant.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { decrypt, encrypt, type EncryptedBlob } from './encryption';
import type { CloudConnection, CloudInventory } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'cloud-connections.json');

function inventoryPath(connectionId: string) {
  return path.join(DATA_DIR, `cloud-inventory-${connectionId}.json`);
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
  if (!aws) return { ...rest } as CloudConnection;
  const { externalIdEnc, ...awsRest } = aws;
  return {
    ...rest,
    aws: {
      ...awsRest,
      externalId: decrypt(externalIdEnc),
    },
  };
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
  await ensureDataDir();
  await fs.writeFile(CONNECTIONS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

export async function listConnections(): Promise<CloudConnection[]> {
  const disk = await readAllOnDisk();
  const conns = disk.map(unsealConnection);
  // Attach the latest cached inventory (if present on disk) for each.
  await Promise.all(
    conns.map(async (c) => {
      try {
        const inv = await readInventory(c.id);
        if (inv) c.lastInventory = inv;
      } catch {
        // best-effort — UI shows "no inventory yet"
      }
    })
  );
  return conns;
}

export async function getConnection(id: string): Promise<CloudConnection | null> {
  const all = await listConnections();
  return all.find((c) => c.id === id) ?? null;
}

export async function createConnection(
  partial: Omit<CloudConnection, 'id' | 'createdAt' | 'status'>
): Promise<CloudConnection> {
  const newConn: CloudConnection = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...partial,
  };
  const disk = await readAllOnDisk();
  disk.push(sealConnection(newConn));
  await writeAllOnDisk(disk);
  return newConn;
}

export async function updateConnection(
  id: string,
  patch: Partial<Omit<CloudConnection, 'id' | 'createdAt'>>
): Promise<CloudConnection | null> {
  const disk = await readAllOnDisk();
  const idx = disk.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const current = unsealConnection(disk[idx]);
  const merged: CloudConnection = { ...current, ...patch, id, createdAt: current.createdAt };
  disk[idx] = sealConnection(merged);
  await writeAllOnDisk(disk);
  return merged;
}

export async function deleteConnection(id: string): Promise<boolean> {
  const disk = await readAllOnDisk();
  const filtered = disk.filter((c) => c.id !== id);
  if (filtered.length === disk.length) return false;
  await writeAllOnDisk(filtered);
  // best-effort cleanup of inventory file
  try {
    await fs.unlink(inventoryPath(id));
  } catch {
    /* not all connections have an inventory yet */
  }
  return true;
}

// ─── Inventory CRUD ────────────────────────────────────────────────────────

export async function saveInventory(inv: CloudInventory): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(inventoryPath(inv.connectionId), JSON.stringify(inv, null, 2), 'utf8');
}

export async function readInventory(connectionId: string): Promise<CloudInventory | null> {
  try {
    const raw = await fs.readFile(inventoryPath(connectionId), 'utf8');
    return JSON.parse(raw) as CloudInventory;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw err;
  }
}
