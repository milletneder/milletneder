import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { getSetting } from '@/lib/admin/settings';
import { createCheckout } from '@/lib/billing/lemonsqueezy';
import { PlanTier } from '@/lib/billing/plans';

export async function POST(request: NextRequest) {
  // --- Auth ---
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
  }

  // --- Body parse ---
  let body: { planTier?: string; billingInterval?: 'monthly' | 'yearly' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek' }, { status: 400 });
  }

  const { planTier, billingInterval } = body;

  if (!planTier) {
    return NextResponse.json({ error: 'planTier gerekli' }, { status: 400 });
  }

  // --- Variant ID coz ---
  let settingKey: string;

  if (planTier === 'parti') {
    settingKey = 'lemonsqueezy_parti_variant';
  } else {
    if (!billingInterval || !['monthly', 'yearly'].includes(billingInterval)) {
      return NextResponse.json({ error: 'billingInterval gerekli (monthly veya yearly)' }, { status: 400 });
    }
    settingKey = `lemonsqueezy_${planTier}_${billingInterval}_variant`;
  }

  const variantId = await getSetting(settingKey);
  if (!variantId) {
    return NextResponse.json(
      { error: 'Bu plan icin variant tanimlanmamis. Lutfen admin panelinden yapilandirin.' },
      { status: 400 }
    );
  }

  // --- Checkout olustur ---
  try {
    const checkoutUrl = await createCheckout(variantId, user.id);

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Checkout URL olusturulamadi' }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error('Checkout olusturma hatasi:', error);
    return NextResponse.json(
      { error: 'Checkout olusturulurken bir hata olustu' },
      { status: 500 }
    );
  }
}
