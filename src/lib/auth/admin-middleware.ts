import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { verifyAdminToken } from './admin-jwt';

export async function getAdminFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
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
