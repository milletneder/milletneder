/**
 * Yerel OTP kod üretimi, saklama ve doğrulama.
 * VatanSMS gibi yerleşik OTP doğrulaması olmayan sağlayıcılar için kullanılır.
 * Twilio Verify kendi OTP yönetimini yapar, bu modülü kullanmaz.
 */

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const store = new Map<string, OtpEntry>();
const OTP_TTL = 5 * 60 * 1000; // 5 dakika
const MAX_ATTEMPTS = 5;

// Eski girdileri her 5 dakikada temizle
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.expiresAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * 6 haneli OTP kodu üretir ve bellek içi store'a kaydeder.
 * Aynı identifier için yeni kod üretilince eski kod silinir.
 */
export function generateOtp(identifier: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  store.set(identifier, {
    code,
    expiresAt: Date.now() + OTP_TTL,
    attempts: 0,
  });
  return code;
}

/**
 * Bellek içi store'daki OTP kodunu doğrular.
 * Twilio Verify ile aynı hata formatını döndürür (uyumluluk için).
 */
export function verifyOtp(identifier: string, code: string): { valid: boolean; error?: string } {
  const entry = store.get(identifier);

  if (!entry) {
    return { valid: false, error: 'no_code' };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(identifier);
    return { valid: false, error: 'expired' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(identifier);
    return { valid: false, error: 'too_many_attempts' };
  }

  if (entry.code !== code) {
    entry.attempts++;
    return { valid: false, error: 'invalid_code' };
  }

  // Başarılı doğrulama — kodu sil
  store.delete(identifier);
  return { valid: true };
}
