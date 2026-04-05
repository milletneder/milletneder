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
export async function sendVerification(phone: string): Promise<void> {
  const config = await getConfig();

  if (config.testMode) {
    console.log(`[TWILIO TEST] Verification request to ${phone} (test mode — no SMS sent)`);
    return;
  }

  if (!config.sid || !config.token) {
    throw new Error('Twilio Account SID ve Auth Token ayarlanmalı (Admin Panel > Ayarlar)');
  }
  if (!config.verifyServiceSid) {
    throw new Error('Twilio Verify Service SID ayarlanmalı (Admin Panel > Ayarlar)');
  }

  console.log(`[TWILIO] Sending verification to ${phone} via Verify API`);

  try {
    const verification = await getClient(config.sid, config.token)
      .verify.v2
      .services(config.verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: 'sms',
      });

    console.log(`[TWILIO] Verification sent: SID=${verification.sid}, status=${verification.status}`);
  } catch (err: unknown) {
    const twilioError = err as { code?: number; message?: string; moreInfo?: string; status?: number };
    console.error(`[TWILIO ERROR] code=${twilioError.code}, message=${twilioError.message}, moreInfo=${twilioError.moreInfo}`);

    if (twilioError.code === 60200) {
      throw new Error('Geçersiz telefon numarası.');
    }
    if (twilioError.code === 60203) {
      throw new Error('Çok fazla doğrulama denemesi. Lütfen 10 dakika bekleyin.');
    }
    if (twilioError.code === 60212) {
      throw new Error('Bu numara doğrulama için kullanılamıyor.');
    }
    throw err;
  }
}

/**
 * Check a verification code via Twilio Verify API
 * Returns 'approved' if correct, 'pending' if wrong code
 */
export async function checkVerification(phone: string, code: string): Promise<{ valid: boolean; error?: string }> {
  const config = await getConfig();

  if (config.testMode) {
    // In test mode, accept any 6-digit code
    console.log(`[TWILIO TEST] Verification check for ${phone}: code=${code} (test mode — auto-approved)`);
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
        to: phone,
        code,
      });

    console.log(`[TWILIO] Verification check: status=${check.status}`);

    if (check.status === 'approved') {
      return { valid: true };
    }
    return { valid: false, error: 'invalid_code' };
  } catch (err: unknown) {
    const twilioError = err as { code?: number; message?: string; status?: number };
    console.error(`[TWILIO ERROR] Check failed: code=${twilioError.code}, message=${twilioError.message}`);

    if (twilioError.code === 60200) {
      return { valid: false, error: 'invalid_code' };
    }
    if (twilioError.code === 20404) {
      return { valid: false, error: 'no_code' };
    }
    if (twilioError.code === 60203) {
      return { valid: false, error: 'too_many_attempts' };
    }
    throw err;
  }
}
