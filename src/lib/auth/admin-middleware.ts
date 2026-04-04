import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { verifyAdminToken } from './admin-jwt';

export async function getAdminFromRequest(request: NextRequest) {
  // 1) Cookie'den oku (nginx Basic Auth ile çakışmaz)
  // 2) Fallback: X-Admin-Token header'ından oku
  const token =
    request.cookies.get('admin_token')?.value ||
    request.headers.get('x-admin-token');

  if (!token) return null;
  const payload = verifyAdminToken(token);
  if (!payload) return null;

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, payload.adminId))
    .limit(1);

  if (!admin || !admin.is_active) return null;
  return admin;
}
