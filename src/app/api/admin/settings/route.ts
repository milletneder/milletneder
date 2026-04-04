import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { getSetting, setSetting, getMaskedSetting } from '@/lib/admin/settings';
import { invalidateTwilioConfigCache } from '@/lib/sms/twilio';
import { db } from '@/lib/db';
import { adminAuditLogs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = [
  'auth_method', // 'email' | 'phone'
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_phone_number',
  'twilio_test_mode', // 'true' | 'false'
];

// Sensitive keys — return masked values in GET
const MASKED_KEYS = ['twilio_auth_token'];

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 });
  }

  const settings: Record<string, { value: string | null; source: 'db' | 'none' }> = {};
  for (const key of ALLOWED_KEYS) {
    if (MASKED_KEYS.includes(key)) {
      const masked = await getMaskedSetting(key);
      settings[key] = { value: masked, source: masked ? 'db' : 'none' };
    } else {
      const dbValue = await getSetting(key);
      settings[key] = { value: dbValue, source: dbValue ? 'db' : 'none' };
    }
  }

  // Firebase Service Account durumu
  const hasFirebaseServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;

  return NextResponse.json({ settings, hasFirebaseServiceAccount });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Gecersiz ayar' }, { status: 400 });
  }

  // Validasyonlar
  if (key === 'auth_method' && !['email', 'phone'].includes(value)) {
    return NextResponse.json({ error: 'Geçersiz doğrulama yöntemi. email veya phone olmalı.' }, { status: 400 });
  }
  if (key === 'twilio_account_sid' && value && !String(value).startsWith('AC')) {
    return NextResponse.json({ error: 'Twilio Account SID "AC" ile başlamalı.' }, { status: 400 });
  }
  if (key === 'twilio_phone_number' && value && !String(value).startsWith('+')) {
    return NextResponse.json({ error: 'Twilio telefon numarası "+" ile başlamalı (ör: +1...).' }, { status: 400 });
  }
  if (key === 'twilio_test_mode' && !['true', 'false'].includes(value)) {
    return NextResponse.json({ error: 'Test modu true veya false olmalı.' }, { status: 400 });
  }

  await setSetting(key, String(value), admin.id);

  // Twilio ayarı değiştiyse cache'i temizle
  if (key.startsWith('twilio_')) {
    invalidateTwilioConfigCache();
  }

  // Audit log — hassas değerleri maskele
  const logValue = MASKED_KEYS.includes(key) ? '***' : value;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  await db.insert(adminAuditLogs).values({
    admin_id: admin.id,
    action: 'settings_update',
    target_type: 'admin_settings',
    details: `Setting updated: ${key} = ${logValue}`,
    ip_address: ip,
  });

  return NextResponse.json({ success: true });
}
