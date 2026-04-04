import { randomBytes, createHash } from 'crypto';
import { encryptVEK, deriveKeyFromRecoveryCode } from './vote-encryption';

// ─── Recovery Code Generation ────────────────────────────────────────
// Format: XXXX-XXXX-XXXX (büyük harf + rakam, 12 karakter)

const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O/0, I/1 karışıklığı önlemek için çıkarıldı

function generateSingleCode(): string {
  const bytes = randomBytes(12);
  const chars: string[] = [];
  for (let i = 0; i < 12; i++) {
    chars.push(CODE_CHARSET[bytes[i] % CODE_CHARSET.length]);
  }
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateSingleCode());
  }
  return codes;
}

// ─── Recovery Code Hashing ───────────────────────────────────────────
// Sunucuda sadece hash saklanır, plaintext kod ASLA saklanmaz.

export function hashRecoveryCode(code: string): string {
  return createHash('sha256')
    .update(code.toUpperCase().replace(/[\s-]/g, ''))
    .digest('hex');
}

// ─── Recovery Entry Creation ─────────────────────────────────────────

export interface RecoveryEntry {
  hash: string;           // SHA256 of code (doğrulama için)
  encrypted_vek: string;  // AES(derive(code), VEK) — VEK'in kurtarma koduyla şifresi
  used: boolean;          // Kod kullanıldı mı?
}

export function createRecoveryEntries(codes: string[], vek: Buffer): RecoveryEntry[] {
  return codes.map((code) => ({
    hash: hashRecoveryCode(code),
    encrypted_vek: encryptVEK(vek, deriveKeyFromRecoveryCode(code)),
    used: false,
  }));
}

// ─── Recovery Code Lookup ────────────────────────────────────────────
// Kullanıcının girdiği kurtarma kodunu entries içinde ara.

export function findRecoveryEntry(
  code: string,
  entries: RecoveryEntry[]
): { entry: RecoveryEntry; index: number } | null {
  const codeHash = hashRecoveryCode(code);
  const index = entries.findIndex((e) => e.hash === codeHash && !e.used);
  if (index === -1) return null;
  return { entry: entries[index], index };
}

// ─── Remaining Codes Count ───────────────────────────────────────────

export function countRemainingCodes(entries: RecoveryEntry[]): number {
  return entries.filter((e) => !e.used).length;
}
