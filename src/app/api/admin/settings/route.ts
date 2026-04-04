import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { getSetting, setSetting } from '@/lib/admin/settings';
import { db } from '@/lib/db';
import { adminAuditLogs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = [
  'auth_method', // 'email' | 'phone'
];

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 401 });
  }

  const settings: Record<string, { value: string | null; source: 'db' | 'none' }> = {};
  for (const key of ALLOWED_KEYS) {
    const dbValue = await getSetting(key);
    settings[key] = { value: dbValue, source: dbValue ? 'db' : 'none' };
  }

  // Firebase Service Account durumu
  const hasFirebaseServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;

  return NextResponse.json({ settings, hasFirebaseServiceAccount });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 401 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Gecersiz ayar' }, { status: 400 });
  }

  // auth_method validasyonu
  if (key === 'auth_method' && !['email', 'phone'].includes(value)) {
    return NextResponse.json({ error: 'Geçersiz doğrulama yöntemi. email veya phone olmalı.' }, { status: 400 });
  }

  await setSetting(key, String(value), admin.id);

  // Audit log
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  await db.insert(adminAuditLogs).values({
    admin_id: admin.id,
    action: 'settings_update',
    target_type: 'admin_settings',
    details: `Setting updated: ${key} = ${value}`,
    ip_address: ip,
  });

  return NextResponse.json({ success: true });
}
