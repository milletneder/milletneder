import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { getSetting, setSetting, getMaskedSetting } from '@/lib/admin/settings';
import { invalidateTwilioConfigCache } from '@/lib/sms/twilio';
import { invalidateVatansmsConfigCache } from '@/lib/sms/vatansms';
import { invalidateProviderCache } from '@/lib/sms/provider';
import { db } from '@/lib/db';
import { adminAuditLogs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = [
  'auth_method', // 'email' | 'phone'
  'sms_provider', // 'twilio' | 'vatansms'
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_verify_service_sid',
  'twilio_phone_number', // kept for backward compat, not used by Verify API
  'twilio_test_mode', // 'true' | 'false'
  'vatansms_api_id',
  'vatansms_api_user',
  'vatansms_api_pass',
  'vatansms_sender',
  'vatansms_test_mode', // 'true' | 'false'
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'smtp_from',
  'force_low_balance', // 'true' | 'false' — test icin bakiye dusuk simule eder
];

// Sensitive keys — return masked values in GET
const MASKED_KEYS = ['twilio_auth_token', 'vatansms_api_pass', 'smtp_pass'];

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

  return NextResponse.json({ settings });
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
  if (key === 'sms_provider' && !['twilio', 'vatansms'].includes(value)) {
    return NextResponse.json({ error: 'Geçersiz SMS sağlayıcı. twilio veya vatansms olmalı.' }, { status: 400 });
  }
  if (key === 'vatansms_test_mode' && !['true', 'false'].includes(value)) {
    return NextResponse.json({ error: 'Test modu true veya false olmalı.' }, { status: 400 });
  }
  if (key === 'twilio_account_sid' && value && !String(value).startsWith('AC')) {
    return NextResponse.json({ error: 'Twilio Account SID "AC" ile başlamalı.' }, { status: 400 });
  }
  if (key === 'twilio_verify_service_sid' && value && !String(value).startsWith('VA')) {
    return NextResponse.json({ error: 'Twilio Verify Service SID "VA" ile başlamalı.' }, { status: 400 });
  }
  if (key === 'twilio_phone_number') {
    // Normalize: remove spaces, dashes, parens — keep only +digits
    const normalized = String(value).replace(/[\s\-\(\)]/g, '');
    if (normalized && !normalized.startsWith('+')) {
      return NextResponse.json({ error: 'Twilio telefon numarası "+" ile başlamalı (ör: +1...).' }, { status: 400 });
    }
    // Save normalized version
    if (normalized !== value) {
      await setSetting(key, normalized, admin.id);
      if (key.startsWith('twilio_')) invalidateTwilioConfigCache();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
      await db.insert(adminAuditLogs).values({ admin_id: admin.id, action: 'settings_update', target_type: 'admin_settings', details: `Setting updated: ${key} = ${normalized} (normalized from: ${value})`, ip_address: ip });
      return NextResponse.json({ success: true, normalized });
    }
  }
  if (key === 'twilio_test_mode' && !['true', 'false'].includes(value)) {
    return NextResponse.json({ error: 'Test modu true veya false olmalı.' }, { status: 400 });
  }
  if (key === 'force_low_balance' && !['true', 'false'].includes(value)) {
    return NextResponse.json({ error: 'Bakiye simülasyonu true veya false olmalı.' }, { status: 400 });
  }

  await setSetting(key, String(value), admin.id);

  // Sağlayıcı ayarı değiştiyse ilgili cache'leri temizle
  if (key.startsWith('twilio_')) {
    invalidateTwilioConfigCache();
  }
  if (key.startsWith('vatansms_')) {
    invalidateVatansmsConfigCache();
  }
  if (key === 'sms_provider') {
    invalidateProviderCache();
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
