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

  if (config.testMode) {
    console.log(`[TWILIO TEST] SMS to ${phone}: ${body}`);
    return;
  }

  if (!config.sid || !config.token) {
    throw new Error('Twilio Account SID ve Auth Token ayarlanmalı (Admin Panel > Ayarlar)');
  }
  if (!config.from) {
    throw new Error('Twilio telefon numarası ayarlanmalı (Admin Panel > Ayarlar)');
  }

  await getClient(config.sid, config.token).messages.create({
    body,
    from: config.from,
    to: phone,
  });
}
