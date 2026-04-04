// In-memory store for email verification codes
// email -> { code, expiresAt, attempts }

const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// Cleanup expired codes every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [email, data] of verificationCodes) {
      if (now > data.expiresAt) verificationCodes.delete(email);
    }
  }, 5 * 60 * 1000);
}

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function storeCode(email: string, code: string) {
  verificationCodes.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });
}

export function getCode(email: string) {
  return verificationCodes.get(email.toLowerCase()) || null;
}

export function deleteCode(email: string) {
  verificationCodes.delete(email.toLowerCase());
}

export function isRateLimited(email: string): boolean {
  const existing = verificationCodes.get(email.toLowerCase());
  if (!existing) return false;
  // Rate limit: 1 code per 60 seconds
  const createdAt = existing.expiresAt - 5 * 60 * 1000;
  return Date.now() - createdAt < 60 * 1000;
}

// Doğrulanmış e-postalar (kod doğrulandıktan sonra, hesap oluşturulana kadar)
const verifiedEmails = new Map<string, number>();

export function markEmailAsVerified(email: string) {
  verifiedEmails.set(email.toLowerCase(), Date.now());
}

export function isEmailCodeVerified(email: string): boolean {
  const ts = verifiedEmails.get(email.toLowerCase());
  if (!ts) return false;
  // 10 dakika geçerli
  if (Date.now() - ts > 10 * 60 * 1000) {
    verifiedEmails.delete(email.toLowerCase());
    return false;
  }
  return true;
}

export function clearEmailVerified(email: string) {
  verifiedEmails.delete(email.toLowerCase());
}
