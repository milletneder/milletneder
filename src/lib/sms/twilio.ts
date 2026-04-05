import twilio from 'twilio';
import { getSetting } from '@/lib/admin/settings';

// Cache DB settings for 60 seconds to avoid hitting DB on every request
let cachedConfig: { sid: string; token: string; verifyServiceSid: string; testMode: boolean; cachedAt: number } | null = null;
const CACHE_TTL = 60_000;

async function getConfig() {
  if (cachedConfig && Date.now() - cachedConfig.cachedAt < CACHE_TTL) {
    return cachedConfig;
  }

  // DB settings take priority, fall back to env vars
  const sid = await getSetting('twilio_account_sid') || process.env.TWILIO_ACCOUNT_SID || '';
  const token = await getSetting('twilio_auth_token') || process.env.TWILIO_AUTH_TOKEN || '';
  const verifyServiceSid = await getSetting('twilio_verify_service_sid') || process.env.TWILIO_VERIFY_SERVICE_SID || '';
  const testModeStr = await getSetting('twilio_test_mode');
  const testMode = testModeStr !== null ? testModeStr === 'true' : process.env.TWILIO_TEST_MODE === 'true';

  cachedConfig = { sid, token, verifyServiceSid, testMode, cachedAt: Date.now() };
  return cachedConfig;
}

// Invalidate cache when settings change (called from settings API)
export function invalidateTwilioConfigCache() {
  cachedConfig = null;
  client = null;
  clientSid = null;
}

let client: twilio.Twilio | null = null;
let clientSid: string | null = null;

function getClient(sid: string, token: string): twilio.Twilio {
  // Recreate client if credentials changed
  if (!client || clientSid !== sid) {
    client = twilio(sid, token);
    clientSid = sid;
  }
  return client;
}

/**
 * Send a verification code via Twilio Verify API
 * Twilio handles code generation, delivery, and storage
 */
export async function sendVerification(to: string, channel: 'sms' | 'email' = 'sms'): Promise<void> {
  const config = await getConfig();

  if (config.testMode) {
    console.log(`[TWILIO TEST] Verification request to ${to} via ${channel} (test mode — no ${channel} sent)`);
    return;
  }

  if (!config.sid || !config.token) {
    throw new Error('Twilio Account SID ve Auth Token ayarlanmalı (Admin Panel > Ayarlar)');
  }
  if (!config.verifyServiceSid) {
    throw new Error('Twilio Verify Service SID ayarlanmalı (Admin Panel > Ayarlar)');
  }

  console.log(`[TWILIO] Sending ${channel} verification to ${to} via Verify API`);

  try {
    const verification = await getClient(config.sid, config.token)
      .verify.v2
      .services(config.verifyServiceSid)
      .verifications.create({
        to,
        channel,
      });

    console.log(`[TWILIO] ${channel} verification sent: SID=${verification.sid}, status=${verification.status}`);

    // OTP gönderildikten sonra bakiyeyi kontrol et (arka planda)
    checkBalance().catch(() => {});
  } catch (err: unknown) {
    const twilioError = err as { code?: number; message?: string; moreInfo?: string; status?: number };
    console.error(`[TWILIO ERROR] ${channel} code=${twilioError.code}, message=${twilioError.message}, moreInfo=${twilioError.moreInfo}`);

    if (twilioError.code === 60200) {
      throw new Error(channel === 'email' ? 'Geçersiz e-posta adresi.' : 'Geçersiz telefon numarası.');
    }
    if (twilioError.code === 60203) {
      throw new Error('Çok fazla doğrulama denemesi. Lütfen 10 dakika bekleyin.');
    }
    if (twilioError.code === 60207) {
      throw new Error(channel === 'email' ? 'E-posta doğrulama kanalı aktif değil. Twilio Verify servisinde e-posta entegrasyonunu yapılandırın.' : 'SMS doğrulama kanalı aktif değil.');
    }
    if (twilioError.code === 60212) {
      throw new Error(channel === 'email' ? 'Bu e-posta adresi doğrulama için kullanılamıyor.' : 'Bu numara doğrulama için kullanılamıyor.');
    }
    throw new Error(channel === 'email' ? 'E-posta doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.' : 'SMS doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.');
  }
}

/**
 * Check a verification code via Twilio Verify API
 * Returns 'approved' if correct, 'pending' if wrong code
 */
// ── Balance check ──────────────────────────────────────────────
let cachedBalance: { balance: number; lowBalance: boolean; checkedAt: number } | null = null;
const BALANCE_CACHE_TTL = 300_000; // 5 dakika
const LOW_BALANCE_THRESHOLD = 1.0; // $1

/**
 * Twilio hesap bakiyesini kontrol et ve cache'le.
 * Her OTP gönderiminden sonra çağrılır.
 */
export async function checkBalance(): Promise<{ balance: number; lowBalance: boolean }> {
  // Cache geçerliyse direkt dön
  if (cachedBalance && Date.now() - cachedBalance.checkedAt < BALANCE_CACHE_TTL) {
    return { balance: cachedBalance.balance, lowBalance: cachedBalance.lowBalance };
  }

  try {
    const config = await getConfig();
    if (!config.sid || !config.token) {
      return { balance: 0, lowBalance: true };
    }

    const auth = Buffer.from(`${config.sid}:${config.token}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Balance.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!res.ok) {
      console.error('[TWILIO] Balance check failed:', res.status);
      return cachedBalance ?? { balance: 0, lowBalance: true };
    }

    const data = await res.json();
    const balance = parseFloat(data.balance);
    const lowBalance = balance < LOW_BALANCE_THRESHOLD;

    cachedBalance = { balance, lowBalance, checkedAt: Date.now() };
    console.log(`[TWILIO] Balance: $${balance.toFixed(2)}, lowBalance: ${lowBalance}`);
    return { balance, lowBalance };
  } catch (err) {
    console.error('[TWILIO] Balance check error:', err);
    return cachedBalance ?? { balance: 0, lowBalance: true };
  }
}

/**
 * Cache'lenmiş bakiye durumunu döndür (API çağrısı yapmaz).
 * Cache yoksa yeni sorgu yapar.
 */
export async function getBalanceStatus(): Promise<{ balance: number; lowBalance: boolean }> {
  if (cachedBalance && Date.now() - cachedBalance.checkedAt < BALANCE_CACHE_TTL) {
    return { balance: cachedBalance.balance, lowBalance: cachedBalance.lowBalance };
  }
  return checkBalance();
}

// ── Verification check ─────────────────────────────────────────
export async function checkVerification(to: string, code: string, channel: 'sms' | 'email' = 'sms'): Promise<{ valid: boolean; error?: string }> {
  const config = await getConfig();

  if (config.testMode) {
    // In test mode, accept any 6-digit code
    console.log(`[TWILIO TEST] ${channel} verification check for ${to}: code=${code} (test mode — auto-approved)`);
    return { valid: true };
  }

  if (!config.sid || !config.token || !config.verifyServiceSid) {
    throw new Error('Twilio yapılandırması eksik');
  }

  try {
    const check = await getClient(config.sid, config.token)
      .verify.v2
      .services(config.verifyServiceSid)
      .verificationChecks.create({
        to,
        code,
      });

    console.log(`[TWILIO] ${channel} verification check: status=${check.status}`);

    if (check.status === 'approved') {
      return { valid: true };
    }
    return { valid: false, error: 'invalid_code' };
  } catch (err: unknown) {
    const twilioError = err as { code?: number; message?: string; status?: number };
    console.error(`[TWILIO ERROR] ${channel} check failed: code=${twilioError.code}, message=${twilioError.message}`);

    if (twilioError.code === 60200) {
      return { valid: false, error: 'invalid_code' };
    }
    if (twilioError.code === 20404) {
      return { valid: false, error: 'no_code' };
    }
    if (twilioError.code === 60203) {
      return { valid: false, error: 'too_many_attempts' };
    }
    return { valid: false, error: 'verification_failed' };
  }
}
