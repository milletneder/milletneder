import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { getCustomerPortalUrl } from '@/lib/billing/lemonsqueezy';

/**
 * GET: Lemon Squeezy customer portal URL'ini dondur.
 * Fatura gecmisi ve odeme yontemi yonetimi icin.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  // --- Aboneligi bul ---
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, user.id))
    .limit(1);

  if (!subscription || !subscription.lemon_squeezy_customer_id) {
    return NextResponse.json(
      { error: 'Aktif abonelik veya musteri bilgisi bulunamadi' },
      { status: 404 }
    );
  }

  try {
    const portalUrl = await getCustomerPortalUrl(
      subscription.lemon_squeezy_customer_id
    );

    if (!portalUrl) {
      return NextResponse.json(
        { error: 'Portal URL alinamadi' },
        { status: 500 }
      );
    }

    return NextResponse.json({ portalUrl });
  } catch (error) {
    console.error('Customer portal hatasi:', error);
    return NextResponse.json(
      { error: 'Portal URL alinirken bir hata olustu' },
      { status: 500 }
    );
  }
}
