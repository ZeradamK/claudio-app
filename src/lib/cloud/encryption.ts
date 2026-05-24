/**
 * Symmetric-encryption helper for credentials at rest.
 *
 * Phase 6 stores cloud connections — including the AWS external id — in a
 * JSON file on disk. The external id is not nearly as sensitive as a real
 * access key (it's a shared secret that's only useful in combination with
 * the role's trust policy), but we encrypt it anyway so the on-disk format
 * is the same shape as the Phase 2 / Postgres path will need.
 *
 * Algorithm: AES-256-GCM with a 96-bit nonce.
 * Key source: process.env.ENCRYPTION_KEY — 32 bytes, base64-encoded.
 * If unset (dev convenience), we derive a deterministic key from a fixed
 * dev string AND warn loudly. Production deploys MUST set ENCRYPTION_KEY.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm' as const;
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.ENCRYPTION_KEY?.trim();
  if (envKey) {
    const decoded = Buffer.from(envKey, 'base64');
    if (decoded.length !== KEY_BYTES) {
      throw new Error(
        `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${decoded.length}). Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
      );
    }
    cachedKey = decoded;
    return cachedKey;
  }

  // Dev fallback — never in production.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY is required in production.');
  }
  // eslint-disable-next-line no-console
  console.warn(
    '[cloud/encryption] ENCRYPTION_KEY not set — using a derived dev key. Set ENCRYPTION_KEY in .env.local before going to prod.'
  );
  cachedKey = createHash('sha256').update('claudio-dev-fallback-key').digest();
  return cachedKey;
}

export interface EncryptedBlob {
  /** base64-encoded ciphertext */
  ciphertext: string;
  /** base64-encoded nonce */
  nonce: string;
  /** base64-encoded auth tag */
  tag: string;
}

export function encrypt(plaintext: string): EncryptedBlob {
  const key = getKey();
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGO, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    nonce: nonce.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decrypt(blob: EncryptedBlob): string {
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(blob.nonce, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** Convenience: generate a base64-encoded 32-byte secret (for setup scripts). */
export function generateKey(): string {
  return randomBytes(KEY_BYTES).toString('base64');
}
