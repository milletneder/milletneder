import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  cancelSubscription,
  resumeSubscription,
} from '@/lib/billing/lemonsqueezy';

/**
 * GET: Kullanicinin abonelik bilgisini dondur.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, user.id))
    .limit(1);

  if (!subscription) {
    return NextResponse.json({
      tier: user.subscription_tier || 'free',
      subscription: null,
    });
  }

  return NextResponse.json({
    tier: subscription.plan_tier,
    subscription: {
      id: subscription.id,
      lemon_squeezy_subscription_id: subscription.lemon_squeezy_subscription_id,
      plan_tier: subscription.plan_tier,
      status: subscription.status,
      billing_interval: subscription.billing_interval,
      current_period_end: subscription.current_period_end,
      renews_at: subscription.renews_at,
      ends_at: subscription.ends_at,
      cancelled_at: subscription.cancelled_at,
      created_at: subscription.created_at,
    },
  });
}

/**
 * PATCH: Aboneligi iptal et veya devam ettir.
 */
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  // --- Body parse ---
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { action } = body;
  if (!action || !['cancel', 'resume'].includes(action)) {
    return NextResponse.json(
      { error: 'action gerekli (cancel veya resume)' },
      { status: 400 }
    );
  }

  // --- Aboneligi bul ---
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, user.id))
    .limit(1);

  if (!subscription) {
    return NextResponse.json({ error: 'Aktif abonelik bulunamadi' }, { status: 404 });
  }

  try {
    if (action === 'cancel') {
      await cancelSubscription(subscription.lemon_squeezy_subscription_id);

      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          cancelled_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      return NextResponse.json({
        message: 'Abonelik iptal edildi. Mevcut donem sonuna kadar gecerli.',
        status: 'cancelled',
      });
    }

    if (action === 'resume') {
      if (subscription.status !== 'cancelled') {
        return NextResponse.json(
          { error: 'Sadece iptal edilmis abonelikler devam ettirilebilir' },
          { status: 400 }
        );
      }

      await resumeSubscription(subscription.lemon_squeezy_subscription_id);

      await db
        .update(subscriptions)
        .set({
          status: 'active',
          cancelled_at: null,
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      return NextResponse.json({
        message: 'Abonelik devam ettiriliyor.',
        status: 'active',
      });
    }
  } catch (error) {
    console.error('Abonelik islemi hatasi:', error);
    return NextResponse.json(
      { error: 'Islem sirasinda bir hata olustu' },
      { status: 500 }
    );
  }
}
