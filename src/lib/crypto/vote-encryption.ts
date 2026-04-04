import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';

// ─── VEK (Vote Encryption Key) ───────────────────────────────────────
// Her kullanıcı için rastgele 32 byte anahtar. Oy tercihi bu anahtarla şifrelenir.

export function generateVEK(): Buffer {
  return randomBytes(32);
}

// ─── Key Derivation ──────────────────────────────────────────────────
// Şifre veya kurtarma kodundan AES-256 anahtarı türet.

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // AES-256

export function deriveKeyFromPassword(password: string, userId: number): Buffer {
  const salt = `milletneder-vek-pw-${userId}`;
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

export function deriveKeyFromRecoveryCode(code: string): Buffer {
  const salt = 'milletneder-vek-recovery';
  return pbkdf2Sync(code.toUpperCase().replace(/\s/g, ''), salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

// ─── AES-256-GCM Encrypt / Decrypt ──────────────────────────────────
// Format: base64(iv[12] + authTag[16] + ciphertext)

function aesEncrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function aesDecrypt(encryptedBase64: string, key: Buffer): string | null {
  try {
    const buf = Buffer.from(encryptedBase64, 'base64');
    if (buf.length < 29) return null; // iv(12) + tag(16) + min 1 byte
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}

// ─── VEK Encryption / Decryption ─────────────────────────────────────

export function encryptVEK(vek: Buffer, derivedKey: Buffer): string {
  return aesEncrypt(vek.toString('base64'), derivedKey);
}

export function decryptVEK(encrypted: string, derivedKey: Buffer): Buffer | null {
  const decrypted = aesDecrypt(encrypted, derivedKey);
  if (!decrypted) return null;
  try {
    return Buffer.from(decrypted, 'base64');
  } catch {
    return null;
  }
}

// ─── Party Encryption / Decryption ───────────────────────────────────

export function encryptParty(party: string, vek: Buffer): string {
  return aesEncrypt(party, vek);
}

export function decryptParty(encrypted: string, vek: Buffer): string | null {
  return aesDecrypt(encrypted, vek);
}
