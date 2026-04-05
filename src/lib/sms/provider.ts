/**
 * SMS Sağlayıcı Yönlendirici (Provider Factory)
 *
 * Admin paneldeki `sms_provider` ayarına göre doğru SMS modülünü seçer.
 * Tüm auth route'ları bu modülü import eder — Twilio veya VatanSMS'i doğrudan import etmez.
 *
 * Kanal mantığı:
 *   - channel='sms'   → Seçili sağlayıcı (Twilio veya VatanSMS)
 *   - channel='email'  → Her zaman Twilio Verify (VatanSMS e-posta gönderemez)
 */

import { getSetting } from '@/lib/admin/settings';
import * as twilioProvider from './twilio';
import * as vatansmsProvider from './vatansms';

// ── Provider cache ─────────────────────────────────────────────
let cachedProvider: string | null = null;
let cachedProviderAt = 0;
const PROVIDER_CACHE_TTL = 60_000; // 60 saniye

export type SmsProviderName = 'twilio' | 'vatansms';

async function getActiveProvider(): Promise<SmsProviderName> {
  if (cachedProvider && Date.now() - cachedProviderAt < PROVIDER_CACHE_TTL) {
    return cachedProvider as SmsProviderName;
  }

  const provider = (await getSetting('sms_provider')) || 'twilio';
  cachedProvider = provider;
  cachedProviderAt = Date.now();
  return provider as SmsProviderName;
}

/** Admin ayarları değiştiğinde cache'i temizle */
export function invalidateProviderCache(): void {
  cachedProvider = null;
  cachedProviderAt = 0;
}

// ── Public API (route'lar bu fonksiyonları kullanır) ────────────

/**
 * Doğrulama kodu gönderir.
 * SMS kanalı için aktif sağlayıcıya, e-posta kanalı için Twilio'ya yönlendirir.
 */
export async function sendVerification(to: string, channel: 'sms' | 'email' = 'sms'): Promise<void> {
  // E-posta OTP her zaman Twilio Verify üzerinden
  if (channel === 'email') {
    return twilioProvider.sendVerification(to, channel);
  }

  const provider = await getActiveProvider();

  if (provider === 'vatansms') {
    return vatansmsProvider.sendVerification(to);
  }

  return twilioProvider.sendVerification(to, channel);
}

/**
 * Doğrulama kodunu kontrol eder.
 * SMS kanalı için aktif sağlayıcıya, e-posta kanalı için Twilio'ya yönlendirir.
 */
export async function checkVerification(
  to: string,
  code: string,
  channel: 'sms' | 'email' = 'sms'
): Promise<{ valid: boolean; error?: string }> {
  if (channel === 'email') {
    return twilioProvider.checkVerification(to, code, channel);
  }

  const provider = await getActiveProvider();

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
  const provider = await getActiveProvider();

  if (provider === 'vatansms') {
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
