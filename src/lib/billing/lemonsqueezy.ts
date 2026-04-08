/**
 * Lemon Squeezy API client wrapper.
 * Server-side only — API key'i istemciye expose etme.
 */

import {
  lemonSqueezySetup,
  createCheckout as lsCreateCheckout,
  cancelSubscription as lsCancelSubscription,
  updateSubscription as lsUpdateSubscription,
  getSubscription as lsGetSubscription,
  getCustomer as lsGetCustomer,
} from '@lemonsqueezy/lemonsqueezy.js';

import { getSetting } from '@/lib/admin/settings';

let initialized = false;

/**
 * Lemon Squeezy SDK'yı başlat.
 * API key'i önce env'den, yoksa admin settings'ten okur.
 */
async function ensureInitialized() {
  if (initialized) return;

  let apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    apiKey = await getSetting('lemonsqueezy_api_key') || undefined;
  }

  if (!apiKey) {
    throw new Error('Lemon Squeezy API key tanımlı değil');
  }

  lemonSqueezySetup({ apiKey });
  initialized = true;
}

/**
 * Config cache'ini temizle (admin settings değişince çağrılır).
 */
export function invalidateLSConfigCache() {
  initialized = false;
}

/**
 * Store ID'yi al.
 */
async function getStoreId(): Promise<string> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID || (await getSetting('lemonsqueezy_store_id')) || '';
  if (!storeId) throw new Error('Lemon Squeezy Store ID tanımlı değil');
  return storeId;
}

/**
 * Checkout URL oluştur.
 */
export async function createCheckout(variantId: string, userId: number, userEmail?: string) {
  await ensureInitialized();
  const storeId = await getStoreId();

  const { data, error } = await lsCreateCheckout(storeId, variantId, {
    checkoutOptions: {
      embed: true,
    },
    checkoutData: {
      email: userEmail || undefined,
      custom: {
        user_id: String(userId),
      },
    },
    productOptions: {
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://milletneder.com'}/profil?checkout=success`,
    },
  });

  if (error) {
    console.error('Lemon Squeezy checkout error:', error);
    throw new Error('Checkout oluşturulamadı');
  }

  return data?.data?.attributes?.url || null;
}

/**
 * Abonelik detaylarını al.
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  await ensureInitialized();

  const { data, error } = await lsGetSubscription(subscriptionId);
  if (error) {
    console.error('Lemon Squeezy subscription fetch error:', error);
    return null;
  }

  return data?.data?.attributes || null;
}

/**
 * Aboneliği iptal et.
 */
export async function cancelSubscription(subscriptionId: string) {
  await ensureInitialized();

  const { data, error } = await lsUpdateSubscription(subscriptionId, {
    cancelled: true,
  });

  if (error) {
    console.error('Lemon Squeezy cancel error:', error);
    throw new Error('Abonelik iptal edilemedi');
  }

  return data?.data?.attributes || null;
}

/**
 * İptal edilmiş aboneliği geri başlat.
 */
export async function resumeSubscription(subscriptionId: string) {
  await ensureInitialized();

  const { data, error } = await lsUpdateSubscription(subscriptionId, {
    cancelled: false,
  });

  if (error) {
    console.error('Lemon Squeezy resume error:', error);
    throw new Error('Abonelik devam ettirilemedi');
  }

  return data?.data?.attributes || null;
}

/**
 * Customer portal URL al (fatura geçmişi, ödeme yöntemi).
 */
export async function getCustomerPortalUrl(customerId: string): Promise<string | null> {
  await ensureInitialized();

  const { data, error } = await lsGetCustomer(customerId);
  if (error) {
    console.error('Lemon Squeezy customer fetch error:', error);
    return null;
  }

  return data?.data?.attributes?.urls?.customer_portal || null;
}
