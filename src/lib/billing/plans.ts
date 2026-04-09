/**
 * Plan tier tanımları ve yardımcı fonksiyonlar.
 * Variant ID mapping admin settings'ten runtime'da okunur.
 *
 * NOT: 'parti' tier'ı kaldırıldı. Siyasi parti panelleri artık kurumsal
 * hesap modeliyle çalışır (party_accounts tablosu + /parti/giris).
 */

export type PlanTier = 'free' | 'vatandas' | 'ogrenci' | 'arastirmaci';

export const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  vatandas: 1,
  ogrenci: 2,       // Araştırmacı ile aynı özellikler, indirimli fiyat
  arastirmaci: 3,
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Ücretsiz',
  vatandas: 'Vatandaş',
  ogrenci: 'Öğrenci',
  arastirmaci: 'Araştırmacı',
};

export const PLAN_PRICES: Record<PlanTier, { monthly: number; yearly: number | null }> = {
  free: { monthly: 0, yearly: null },
  vatandas: { monthly: 99, yearly: 999 },
  ogrenci: { monthly: 249, yearly: 2499 },
  arastirmaci: { monthly: 499, yearly: 4999 },
};

// Admin settings'teki variant key'leri
export const VARIANT_SETTING_KEYS: Record<string, { tier: PlanTier; interval: 'monthly' | 'yearly' }> = {
  lemonsqueezy_vatandas_monthly_variant: { tier: 'vatandas', interval: 'monthly' },
  lemonsqueezy_vatandas_yearly_variant: { tier: 'vatandas', interval: 'yearly' },
  lemonsqueezy_ogrenci_monthly_variant: { tier: 'ogrenci', interval: 'monthly' },
  lemonsqueezy_ogrenci_yearly_variant: { tier: 'ogrenci', interval: 'yearly' },
  lemonsqueezy_arastirmaci_monthly_variant: { tier: 'arastirmaci', interval: 'monthly' },
  lemonsqueezy_arastirmaci_yearly_variant: { tier: 'arastirmaci', interval: 'yearly' },
};

/**
 * Tier'ın başka bir tier'dan yüksek veya eşit olup olmadığını kontrol et.
 * Öğrenci tier'ı araştırmacı ile aynı feature seviyesinde.
 */
export function tierAtLeast(userTier: PlanTier, requiredTier: PlanTier): boolean {
  const effectiveRank = userTier === 'ogrenci' ? TIER_RANK.arastirmaci : TIER_RANK[userTier];
  return effectiveRank >= TIER_RANK[requiredTier];
}

/**
 * Variant ID → plan tier çözümle.
 * variantMap: admin settings'ten okunan { variantId: settingKey } mapping
 */
export function tierFromVariantId(
  variantId: string,
  variantMap: Record<string, string>
): { tier: PlanTier; interval: 'monthly' | 'yearly' } | null {
  const settingKey = variantMap[variantId];
  if (!settingKey) return null;
  return VARIANT_SETTING_KEYS[settingKey] || null;
}
