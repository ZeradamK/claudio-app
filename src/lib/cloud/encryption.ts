/**
 * Symmetric-encryption helper for credentials at rest.
 *
 * Used by:
 *   - data/cloud-connections.json  → encrypted externalId per connection
 *   - data/user-profiles.json       → encrypted BYOK API keys per provider
 *
 * Algorithm: AES-256-GCM with a 96-bit nonce per encrypt.
 * Key source: process.env.ENCRYPTION_KEY — 32 raw bytes, base64-encoded.
 *
 * SECURITY: hard-fails when ENCRYPTION_KEY is unset, in every NODE_ENV.
 *
 * Audit S7 / CWE-321 (Use of Hard-coded Cryptographic Key): the previous
 * implementation derived a deterministic key from sha256("claudio-dev-fallback-key")
 * when the env var was missing. Anyone reading the open-source repo could
 * derive that key and decrypt any blob ever written without ENCRYPTION_KEY.
 * The fallback is gone. Operators MUST set ENCRYPTION_KEY in every env;
 * setup script in scripts/generate-encryption-key.sh prints a fresh one.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm' as const;
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.ENCRYPTION_KEY?.trim();
  if (!envKey) {
    // Fail-closed (CWE-321). No dev fallback, no environment carve-out.
    throw new Error(
      'ENCRYPTION_KEY is required. Generate one with: ' +
        'openssl rand -base64 32 ' +
        '— then add ENCRYPTION_KEY=<value> to .env.local.'
    );
  }
  const decoded = Buffer.from(envKey, 'base64');
  if (decoded.length !== KEY_BYTES) {
    throw new Error(
      'ENCRYPTION_KEY must decode to ' +
        KEY_BYTES +
        ' bytes (got ' +
        decoded.length +
        '). Generate a fresh one with: openssl rand -base64 32'
    );
  }
  cachedKey = decoded;
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
