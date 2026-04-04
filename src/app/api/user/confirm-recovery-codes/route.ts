import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Giris yapmaniz gerekiyor' }, { status: 401 });
    }

    // Kullanici zaten onayladiysa tekrar islem yapma
    if (user.recovery_codes_confirmed) {
      return NextResponse.json({ success: true });
    }

    // recovery_codes_confirmed = true olarak güncelle
    // NOT: votes.party artık null yapılmıyor — hiçbir endpoint votes.party'den okumuyor.
    // Tüm istatistikler anonymous_vote_counts'tan, işlemler vote_transaction_log'dan okunuyor.
    // votes.party sadece legacy uyumluluk ve admin debug için kalıyor.
    await db
      .update(users)
      .set({ recovery_codes_confirmed: true, updated_at: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Confirm recovery codes error:', error);
    return NextResponse.json({ error: 'Islem basarisiz' }, { status: 500 });
  }
}
