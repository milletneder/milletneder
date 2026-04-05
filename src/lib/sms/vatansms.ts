/**
 * VatanSMS SMS Sağlayıcı Modülü
 *
 * Yerli SMS sağlayıcısı — XML POST API üzerinden SMS gönderimi.
 * OTP kod üretimi ve doğrulaması yerel otp-store modülü tarafından yapılır
 * (VatanSMS'in Twilio Verify gibi yerleşik bir OTP servisi yoktur).
 *
 * API Docs: https://www.vatansms.com/java-sms-gonderme-api
 */

import { getSetting } from '@/lib/admin/settings';
import { generateOtp, verifyOtp } from './otp-store';

// ── Config cache ───────────────────────────────────────────────
interface VatansmsConfig {
  apiId: string;
  apiUser: string;
  apiPass: string;
  sender: string;
  testMode: boolean;
  cachedAt: number;
}

let cachedConfig: VatansmsConfig | null = null;
const CACHE_TTL = 60_000; // 60 saniye

async function getConfig(): Promise<VatansmsConfig> {
  if (cachedConfig && Date.now() - cachedConfig.cachedAt < CACHE_TTL) {
    return cachedConfig;
  }

  const apiId = (await getSetting('vatansms_api_id')) || '';
  const apiUser = (await getSetting('vatansms_api_user')) || '';
  const apiPass = (await getSetting('vatansms_api_pass')) || '';
  const sender = (await getSetting('vatansms_sender')) || 'MILLETNEDER';
  const testModeStr = await getSetting('vatansms_test_mode');
  const testMode = testModeStr === 'true';

  cachedConfig = { apiId, apiUser, apiPass, sender, testMode, cachedAt: Date.now() };
  return cachedConfig;
}

/** Admin ayarları değiştiğinde cache'i temizle */
export function invalidateVatansmsConfigCache(): void {
  cachedConfig = null;
}

// ── SMS gönderimi ──────────────────────────────────────────────

/** VatanSMS XML API hata kodları */
const ERROR_CODES: Record<string, string> = {
  '-1': 'Kullanıcı adı veya şifre hatalı',
  '-2': 'Kredisi yetersiz',
  '-3': 'Geçersiz gönderen adı',
  '-4': 'Mesaj metni boş',
  '-5': 'Numara listesi boş',
  '-6': 'Geçersiz XML formatı',
  '-7': 'Tarih formatı hatalı',
  '-8': 'Mesaj çok uzun',
  '-9': 'Aynı mesaj tekrar gönderilmeye çalışıldı',
  '-10': 'Sistem hatası',
};

/**
 * VatanSMS üzerinden SMS ile doğrulama kodu gönderir.
 * OTP kodu yerel olarak üretilir ve bellekte saklanır.
 */
export async function sendVerification(to: string): Promise<void> {
  const config = await getConfig();

  // OTP kodu üret ve store'a kaydet
  const code = generateOtp(to);

  if (config.testMode) {
    console.log(`[VATANSMS TEST] OTP for ${to}: ${code} (test mode — SMS gönderilmedi)`);
    return;
  }

  if (!config.apiId || !config.apiUser || !config.apiPass) {
    throw new Error('VatanSMS API bilgileri ayarlanmalı (Admin Panel > Ayarlar)');
  }

  // +905XXXXXXXXX → 905XXXXXXXXX (VatanSMS + işareti kabul etmez)
  const phone = to.startsWith('+') ? to.slice(1) : to;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sms>
  <kno>${escapeXml(config.apiId)}</kno>
  <kulad>${escapeXml(config.apiUser)}</kulad>
  <sifre>${escapeXml(config.apiPass)}</sifre>
  <gonderen>${escapeXml(config.sender)}</gonderen>
  <mesaj>milletneder.com dogrulama kodunuz: ${code}</mesaj>
  <numaralar>${phone}</numaralar>
  <tur>Turkce</tur>
</sms>`;

  console.log(`[VATANSMS] Sending OTP to ${phone} via XML POST API`);

  try {
    const res = await fetch('https://panel.vatansms.com/panel/smsgonder1Npost.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: `data=${encodeURIComponent(xml)}`,
    });

    const responseText = (await res.text()).trim();
    console.log(`[VATANSMS] Response: ${responseText}`);

    // Pozitif sayı = SMS ID (başarılı)
    // Negatif sayı veya hata metni = başarısız
    if (responseText.startsWith('-')) {
      const errorDesc = ERROR_CODES[responseText] || 'Bilinmeyen hata';
      console.error(`[VATANSMS ERROR] Code: ${responseText}, Description: ${errorDesc}`);

      if (responseText === '-2') {
        throw new Error('SMS kredisi yetersiz. Lütfen VatanSMS panelinden kredi yükleyin.');
      }
      if (responseText === '-1') {
        throw new Error('VatanSMS kimlik doğrulama hatası. Admin panelden API bilgilerini kontrol edin.');
      }
      throw new Error('SMS gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }

    console.log(`[VATANSMS] SMS sent successfully, ID: ${responseText}`);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('kredisi') || err.message.includes('kimlik') || err.message.includes('ayarlanmalı'))) {
      throw err; // Bilinen hataları olduğu gibi fırlat
    }
    console.error('[VATANSMS ERROR]', err);
    throw new Error('SMS gönderilemedi. Lütfen daha sonra tekrar deneyin.');
  }
}

/**
 * Yerel OTP store'dan doğrulama kodu kontrol eder.
 * Twilio checkVerification ile aynı return formatı.
 */
export async function checkVerification(to: string, code: string): Promise<{ valid: boolean; error?: string }> {
  const config = await getConfig();

  if (config.testMode) {
    console.log(`[VATANSMS TEST] Verification check for ${to}: code=${code} (test mode — auto-approved)`);
    return { valid: true };
  }

  return verifyOtp(to, code);
}

/**
 * VatanSMS bakiye/kredi durumu.
 * VatanSMS kredi tabanlı çalışır ve kolay bir REST bakiye API'si yok (SOAP gerekir).
 * Şimdilik sabit değer döndürüyoruz — kredi azaldığında VatanSMS panelinden takip edilmeli.
 */
export async function getBalanceStatus(): Promise<{ balance: number; lowBalance: boolean }> {
  // TODO: SOAP UyeBilgisiSorgula() ile gerçek kredi sorgulama eklenebilir
  return { balance: 999, lowBalance: false };
}

// ── Helpers ────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
