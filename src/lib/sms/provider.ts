/**
 * SMS Sağlayıcı Yönlendirici (Provider Factory)
 *
 * Admin paneldeki `sms_provider` ayarına göre doğru SMS modülünü seçer.
 * Tüm auth route'ları bu modülü import eder — Twilio, VatanSMS veya Firebase'i doğrudan import etmez.
 *
 * Firebase özel durum: Firebase Phone Auth istemci tarafında çalışır.
 * Sunucu tarafı sendVerification/checkVerification çağrıları Firebase seçiliyken
 * otomatik olarak yedek sağlayıcıya (sms_provider_fallback) yönlendirilir.
 * Bu sayede istemcide Firebase başarısız olursa, mevcut OTP akışı sorunsuz çalışır.
 *
 * Kanal mantığı:
 *   - channel='sms'   → Seçili sağlayıcı (Firebase ise fallback'e düşer)
 *   - channel='email'  → Her zaman Twilio Verify (VatanSMS/Firebase e-posta gönderemez)
 */

import { getSetting } from '@/lib/admin/settings';
import * as twilioProvider from './twilio';
import * as vatansmsProvider from './vatansms';
import * as firebaseProvider from './firebase';

// ── Provider cache ─────────────────────────────────────────────
let cachedProvider: string | null = null;
let cachedFallback: string | null = null;
let cachedProviderAt = 0;
const PROVIDER_CACHE_TTL = 60_000; // 60 saniye

export type SmsProviderName = 'twilio' | 'vatansms' | 'firebase';

async function getActiveProvider(): Promise<SmsProviderName> {
  if (cachedProvider && Date.now() - cachedProviderAt < PROVIDER_CACHE_TTL) {
    return cachedProvider as SmsProviderName;
  }

  const provider = (await getSetting('sms_provider')) || 'twilio';
  const fallback = (await getSetting('sms_provider_fallback')) || 'twilio';
  cachedProvider = provider;
  cachedFallback = fallback;
  cachedProviderAt = Date.now();
  return provider as SmsProviderName;
}

async function getFallbackProvider(): Promise<SmsProviderName> {
  await getActiveProvider(); // Cache dolu olsun
  return (cachedFallback || 'twilio') as SmsProviderName;
}

/**
 * SMS gönderimi için kullanılacak efektif sağlayıcıyı döndürür.
 * Firebase seçiliyse, sunucu tarafı işlemler için fallback sağlayıcıya yönlendirir.
 * (Firebase istemci tarafında çalışır, sunucudan SMS gönderilemez.)
 */
async function getEffectiveSmsProvider(): Promise<Exclude<SmsProviderName, 'firebase'>> {
  const primary = await getActiveProvider();
  if (primary === 'firebase') {
    const fallback = await getFallbackProvider();
    // Fallback da firebase ise son çare Twilio
    return fallback === 'firebase' ? 'twilio' : fallback as Exclude<SmsProviderName, 'firebase'>;
  }
  return primary as Exclude<SmsProviderName, 'firebase'>;
}

/** Admin ayarları değiştiğinde cache'i temizle */
export function invalidateProviderCache(): void {
  cachedProvider = null;
  cachedFallback = null;
  cachedProviderAt = 0;
}

// ── Public API (route'lar bu fonksiyonları kullanır) ────────────

/**
 * Doğrulama kodu gönderir.
 * SMS kanalı için aktif sağlayıcıya, e-posta kanalı için Twilio'ya yönlendirir.
 * Firebase seçiliyse, bu fonksiyon otomatik olarak fallback sağlayıcıyı kullanır.
 */
export async function sendVerification(to: string, channel: 'sms' | 'email' = 'sms'): Promise<void> {
  // E-posta OTP her zaman Twilio Verify üzerinden
  if (channel === 'email') {
    return twilioProvider.sendVerification(to, channel);
  }

  const provider = await getEffectiveSmsProvider();

  if (provider === 'vatansms') {
    return vatansmsProvider.sendVerification(to);
  }

  return twilioProvider.sendVerification(to, channel);
}

/**
 * Doğrulama kodunu kontrol eder.
 * SMS kanalı için aktif sağlayıcıya, e-posta kanalı için Twilio'ya yönlendirir.
 * Firebase seçiliyse, bu fonksiyon otomatik olarak fallback sağlayıcıyı kullanır.
 */
export async function checkVerification(
  to: string,
  code: string,
  channel: 'sms' | 'email' = 'sms'
): Promise<{ valid: boolean; error?: string }> {
  if (channel === 'email') {
    return twilioProvider.checkVerification(to, code, channel);
  }

  const provider = await getEffectiveSmsProvider();

  if (provider === 'vatansms') {
    return vatansmsProvider.checkVerification(to, code);
  }

  return twilioProvider.checkVerification(to, code, channel);
}

/**
 * Aktif sağlayıcının bakiye/kredi durumunu döndürür.
 * Düşük bakiyede bağış modal'ı tetiklenir.
 */
export async function getBalanceStatus(): Promise<{ balance: number; lowBalance: boolean }> {
  const primary = await getActiveProvider();

  // Firebase bakiye kavramı yoktur — her zaman OK
  if (primary === 'firebase') {
    return firebaseProvider.getBalanceStatus();
  }

  if (primary === 'vatansms') {
    return vatansmsProvider.getBalanceStatus();
  }

  return twilioProvider.getBalanceStatus();
}

/**
 * Aktif sağlayıcının adını döndürür (UI ve loglama için).
 */
export async function getActiveProviderName(): Promise<SmsProviderName> {
  return getActiveProvider();
}

/**
 * Yedek sağlayıcının adını döndürür.
 */
export async function getFallbackProviderName(): Promise<SmsProviderName> {
  return getFallbackProvider();
}

/**
 * Sunucu tarafı SMS gönderimi için efektif sağlayıcının adını döndürür.
 * Firebase seçiliyse fallback sağlayıcıyı, değilse birincil sağlayıcıyı verir.
 * SMS log kaydı için kullanılır.
 */
export async function getEffectiveProviderName(): Promise<Exclude<SmsProviderName, 'firebase'>> {
  return getEffectiveSmsProvider();
}
