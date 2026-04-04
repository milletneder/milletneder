import { timingSafeEqual } from 'crypto';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

const otpStore = new Map<string, OtpEntry>();
const verifiedPhones = new Map<string, number>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [phone, data] of otpStore) {
      if (now > data.expiresAt) otpStore.delete(phone);
    }
    for (const [phone, ts] of verifiedPhones) {
      if (now - ts > 10 * 60 * 1000) verifiedPhones.delete(phone);
    }
  }, 5 * 60 * 1000);
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function storeOtp(phone: string, code: string) {
  const now = Date.now();
  otpStore.set(phone, {
    code,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    createdAt: now,
  });
}

export function isOtpRateLimited(phone: string): boolean {
  const existing = otpStore.get(phone);
  if (!existing) return false;
  return Date.now() - existing.createdAt < 60 * 1000; // 1 code per 60 seconds
}

export function verifyOtp(phone: string, code: string): { valid: boolean; error?: string } {
  const entry = otpStore.get(phone);
  if (!entry) return { valid: false, error: 'no_code' };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, error: 'expired' };
  }
  if (entry.attempts >= 5) {
    otpStore.delete(phone);
    return { valid: false, error: 'too_many_attempts' };
  }

  entry.attempts++;

  // Timing-safe comparison
  const codeBuffer = Buffer.from(code.padEnd(6, '0'));
  const storedBuffer = Buffer.from(entry.code.padEnd(6, '0'));
  if (codeBuffer.length !== storedBuffer.length || !timingSafeEqual(codeBuffer, storedBuffer)) {
    return { valid: false, error: 'invalid_code' };
  }

  otpStore.delete(phone);
  return { valid: true };
}

export function markPhoneAsVerified(phone: string) {
  verifiedPhones.set(phone, Date.now());
}

export function isPhoneOtpVerified(phone: string): boolean {
  const ts = verifiedPhones.get(phone);
  if (!ts) return false;
  if (Date.now() - ts > 10 * 60 * 1000) {
    verifiedPhones.delete(phone);
    return false;
  }
  return true;
}

export function clearPhoneVerified(phone: string) {
  verifiedPhones.delete(phone);
}
