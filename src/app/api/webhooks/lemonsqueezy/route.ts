import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscriptions, subscriptionEvents, users } from '@/lib/db/schema';
import { getSetting } from '@/lib/admin/settings';
import { VARIANT_SETTING_KEYS, PlanTier } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

/**
 * Variant ID'den plan tier'i coz.
 * Admin settings'teki her variant key'i kontrol ederek eslesen tier'i bulur.
 */
async function resolveTierFromVariantId(
  variantId: string
): Promise<{ tier: PlanTier; interval: 'monthly' | 'yearly' } | null> {
  for (const [settingKey, meta] of Object.entries(VARIANT_SETTING_KEYS)) {
    const storedVariantId = await getSetting(settingKey);
    if (storedVariantId === variantId) {
      return meta;
    }
  }
  return null;
}

/**
 * Webhook event'ini subscription_events tablosuna logla.
 */
async function logEvent(
  subscriptionId: number | null,
  userId: number | null,
  eventType: string,
  payload: unknown
) {
  await db.insert(subscriptionEvents).values({
    subscription_id: subscriptionId,
    user_id: userId,
    event_type: eventType,
    payload,
  });
}

export async function POST(request: NextRequest) {
  // --- 1. Raw body oku ---
  const rawBody = await request.text();

  // --- 2. Signature dogrula ---
  const signature = request.headers.get('X-Signature') || '';
  const webhookSecret =
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET ||
    (await getSetting('lemonsqueezy_webhook_secret'));

  if (!webhookSecret) {
    console.error('Lemon Squeezy webhook secret tanimli degil');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');

  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const digestBuffer = Buffer.from(digest, 'hex');

    if (
      signatureBuffer.length !== digestBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
    ) {
      console.error('Webhook signature dogrulanamadi');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch {
    console.error('Webhook signature dogrulanamadi (parse hatasi)');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // --- 3. Payload parse et ---
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName: string = payload.meta?.event_name;
  const userId = payload.meta?.custom_data?.user_id
    ? Number(payload.meta.custom_data.user_id)
    : null;

  if (!eventName) {
    return NextResponse.json({ error: 'Missing event_name' }, { status: 400 });
  }

  const attrs = payload.data?.attributes || {};
  const lsSubscriptionId = String(payload.data?.id || '');
  const variantId = String(attrs.variant_id || '');
  const lsCustomerId = String(attrs.customer_id || '');
  const lsOrderId = String(attrs.order_id || attrs.first_subscription_item?.order_id || '');
  const status = String(attrs.status || '');
  const billingAnchor = attrs.billing_anchor;

  // Tarihler
  const currentPeriodEnd = attrs.current_period_end ? new Date(attrs.current_period_end) : null;
  const renewsAt = attrs.renews_at ? new Date(attrs.renews_at) : null;
  const endsAt = attrs.ends_at ? new Date(attrs.ends_at) : null;
  const cancelledAt = attrs.cancelled_at ? new Date(attrs.cancelled_at) : null;
  const createdAt = attrs.created_at ? new Date(attrs.created_at) : null;

  try {
    // --- 4. Event'e gore isle ---
    switch (eventName) {
      case 'subscription_created': {
        if (!userId) {
          console.error('subscription_created: user_id eksik');
          await logEvent(null, null, eventName, payload);
          return NextResponse.json({ ok: true });
        }

        const resolved = await resolveTierFromVariantId(variantId);
        const planTier = resolved?.tier || 'free';
        const billingInterval = resolved?.interval || 'monthly';

        const [inserted] = await db
          .insert(subscriptions)
          .values({
            user_id: userId,
            lemon_squeezy_subscription_id: lsSubscriptionId,
            lemon_squeezy_customer_id: lsCustomerId,
            lemon_squeezy_order_id: lsOrderId,
            variant_id: variantId,
            plan_tier: planTier,
            status,
            billing_interval: billingInterval,
            current_period_start: createdAt,
            current_period_end: currentPeriodEnd,
            renews_at: renewsAt,
            ends_at: endsAt,
            custom_data: payload.meta?.custom_data || null,
          })
          .onConflictDoUpdate({
            target: subscriptions.lemon_squeezy_subscription_id,
            set: {
              variant_id: variantId,
              plan_tier: planTier,
              status,
              billing_interval: billingInterval,
              lemon_squeezy_customer_id: lsCustomerId,
              lemon_squeezy_order_id: lsOrderId,
              current_period_start: createdAt,
              current_period_end: currentPeriodEnd,
              renews_at: renewsAt,
              ends_at: endsAt,
              updated_at: new Date(),
            },
          })
          .returning();

        await db
          .update(users)
          .set({ subscription_tier: planTier, updated_at: new Date() })
          .where(eq(users.id, userId));

        await logEvent(inserted?.id || null, userId, eventName, payload);
        break;
      }

      case 'subscription_updated': {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.lemon_squeezy_subscription_id, lsSubscriptionId))
          .limit(1);

        if (!existing) {
          console.error('subscription_updated: kayit bulunamadi', lsSubscriptionId);
          await logEvent(null, userId, eventName, payload);
          return NextResponse.json({ ok: true });
        }

        const updateData: Record<string, any> = {
          status,
          current_period_end: currentPeriodEnd,
          renews_at: renewsAt,
          ends_at: endsAt,
          cancelled_at: cancelledAt,
          updated_at: new Date(),
        };

        // Variant degistiyse tier'i guncelle
        if (variantId && variantId !== existing.variant_id) {
          updateData.variant_id = variantId;
          const resolved = await resolveTierFromVariantId(variantId);
          if (resolved) {
            updateData.plan_tier = resolved.tier;
            updateData.billing_interval = resolved.interval;

            await db
              .update(users)
              .set({ subscription_tier: resolved.tier, updated_at: new Date() })
              .where(eq(users.id, existing.user_id));
          }
        }

        await db
          .update(subscriptions)
          .set(updateData)
          .where(eq(subscriptions.id, existing.id));

        await logEvent(existing.id, existing.user_id, eventName, payload);
        break;
      }

      case 'subscription_cancelled': {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.lemon_squeezy_subscription_id, lsSubscriptionId))
          .limit(1);

        if (existing) {
          await db
            .update(subscriptions)
            .set({
              cancelled_at: cancelledAt || new Date(),
              status: 'cancelled',
              ends_at: endsAt,
              updated_at: new Date(),
            })
            .where(eq(subscriptions.id, existing.id));

          // Grace period: users.subscription_tier degistirme, ends_at'e kadar gecerli
          await logEvent(existing.id, existing.user_id, eventName, payload);
        } else {
          await logEvent(null, userId, eventName, payload);
        }
        break;
      }

      case 'subscription_expired': {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.lemon_squeezy_subscription_id, lsSubscriptionId))
          .limit(1);

        if (existing) {
          await db
            .update(subscriptions)
            .set({ status: 'expired', updated_at: new Date() })
            .where(eq(subscriptions.id, existing.id));

          await db
            .update(users)
            .set({ subscription_tier: 'free', updated_at: new Date() })
            .where(eq(users.id, existing.user_id));

          await logEvent(existing.id, existing.user_id, eventName, payload);
        } else {
          await logEvent(null, userId, eventName, payload);
        }
        break;
      }

      case 'subscription_resumed': {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.lemon_squeezy_subscription_id, lsSubscriptionId))
          .limit(1);

        if (existing) {
          await db
            .update(subscriptions)
            .set({
              cancelled_at: null,
              status: 'active',
              updated_at: new Date(),
            })
            .where(eq(subscriptions.id, existing.id));

          await logEvent(existing.id, existing.user_id, eventName, payload);
        } else {
          await logEvent(null, userId, eventName, payload);
        }
        break;
      }

      case 'subscription_payment_success': {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.lemon_squeezy_subscription_id, lsSubscriptionId))
          .limit(1);

        if (existing) {
          await db
            .update(subscriptions)
            .set({
              current_period_end: currentPeriodEnd,
              renews_at: renewsAt,
              status: 'active',
              updated_at: new Date(),
            })
            .where(eq(subscriptions.id, existing.id));

          await logEvent(existing.id, existing.user_id, eventName, payload);
        } else {
          await logEvent(null, userId, eventName, payload);
        }
        break;
      }

      case 'subscription_payment_failed': {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.lemon_squeezy_subscription_id, lsSubscriptionId))
          .limit(1);

        if (existing) {
          await db
            .update(subscriptions)
            .set({ status: 'past_due', updated_at: new Date() })
            .where(eq(subscriptions.id, existing.id));

          await logEvent(existing.id, existing.user_id, eventName, payload);
        } else {
          await logEvent(null, userId, eventName, payload);
        }
        break;
      }

      default: {
        // Bilinmeyen event — sadece logla
        await logEvent(null, userId, eventName, payload);
        console.warn('Bilinmeyen webhook event:', eventName);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook isleme hatasi:', error);
    // Hata durumunda bile event'i logla
    try {
      await logEvent(null, userId, `${eventName}_error`, {
        ...payload,
        _error: String(error),
      });
    } catch {
      // Loglama da basarisiz olduysa yut
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
