import twilio from 'twilio';
import { getSetting } from '@/lib/admin/settings';

// Cache DB settings for 60 seconds to avoid hitting DB on every SMS
let cachedConfig: { sid: string; token: string; from: string; testMode: boolean; cachedAt: number } | null = null;
const CACHE_TTL = 60_000;

async function getConfig() {
  if (cachedConfig && Date.now() - cachedConfig.cachedAt < CACHE_TTL) {
    return cachedConfig;
  }

  // DB settings take priority, fall back to env vars
  const sid = await getSetting('twilio_account_sid') || process.env.TWILIO_ACCOUNT_SID || '';
  const token = await getSetting('twilio_auth_token') || process.env.TWILIO_AUTH_TOKEN || '';
  const from = await getSetting('twilio_phone_number') || process.env.TWILIO_PHONE_NUMBER || '';
  const testModeStr = await getSetting('twilio_test_mode');
  const testMode = testModeStr !== null ? testModeStr === 'true' : process.env.TWILIO_TEST_MODE === 'true';

  cachedConfig = { sid, token, from, testMode, cachedAt: Date.now() };
  return cachedConfig;
}

// Invalidate cache when settings change (called from settings API)
export function invalidateTwilioConfigCache() {
  cachedConfig = null;
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

export async function sendOTP(phone: string, code: string): Promise<void> {
  const config = await getConfig();
  const body = `milletneder.com dogrulama kodunuz: ${code}`;

  // Normalize phone numbers — strip all spaces, dashes, parens
  const fromNumber = config.from.replace(/[\s\-\(\)]/g, '');
  const toNumber = phone.replace(/[\s\-\(\)]/g, '');

  if (config.testMode) {
    console.log(`[TWILIO TEST] SMS to ${toNumber}: ${body}`);
    return;
  }

  if (!config.sid || !config.token) {
    throw new Error('Twilio Account SID ve Auth Token ayarlanmalı (Admin Panel > Ayarlar)');
  }
  if (!fromNumber) {
    throw new Error('Twilio telefon numarası ayarlanmalı (Admin Panel > Ayarlar)');
  }

  console.log(`[TWILIO] Sending SMS: from=${fromNumber}, to=${toNumber}`);

  try {
    const message = await getClient(config.sid, config.token).messages.create({
      body,
      from: fromNumber,
      to: toNumber,
    });
    console.log(`[TWILIO] SMS sent successfully: SID=${message.sid}, status=${message.status}`);
  } catch (err: unknown) {
    const twilioError = err as { code?: number; message?: string; moreInfo?: string };
    console.error(`[TWILIO ERROR] code=${twilioError.code}, message=${twilioError.message}, moreInfo=${twilioError.moreInfo}`);

    // Rethrow with more descriptive message
    if (twilioError.code === 21608) {
      throw new Error('Twilio numarası SMS gönderme yetkisine sahip değil. Twilio panelinden numaranın SMS capability\'si kontrol edin.');
    }
    if (twilioError.code === 21211) {
      throw new Error(`Geçersiz hedef numara: ${toNumber}`);
    }
    if (twilioError.code === 21606 || twilioError.code === 21612) {
      throw new Error('Twilio numarası bu bölgeye SMS gönderemiyor. Uluslararası SMS izinlerini kontrol edin.');
    }
    if (twilioError.code === 21408) {
      throw new Error('Twilio hesabında uluslararası SMS izni yok. Twilio Console > Settings > Geo Permissions\'dan Türkiye\'yi etkinleştirin.');
    }
    if (twilioError.code === 21219) {
      throw new Error(`Trial hesaplarda sadece doğrulanmış numaralara SMS gönderilebilir. ${toNumber} numarasını Twilio Console > Verified Caller IDs\'den doğrulayın.`);
    }
    throw err;
  }
}
