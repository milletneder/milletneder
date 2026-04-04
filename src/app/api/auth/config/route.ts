import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/admin/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authMethod = await getSetting('auth_method');
    return NextResponse.json({
      method: authMethod || 'email', // default: email
    });
  } catch {
    return NextResponse.json({ method: 'email' });
  }
}
