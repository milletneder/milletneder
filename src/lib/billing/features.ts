/**
 * Feature gating — hangi plan hangi özelliklere erişebilir.
 */

import type { PlanTier } from './plans';
import { tierAtLeast } from './plans';

// Feature sabitleri
export const FEATURES = {
  // Vatandaş tier
  CITY_BREAKDOWN: 'city_breakdown',             // İl tıklayınca ilçe kırılımı
  INSTANT_REPORTS: 'instant_reports',            // Aylık raporlara anında erişim
  DISTRICT_RANKING: 'district_ranking',          // İlçe bazlı sıralama
  CITY_TRENDS: 'city_trends',                    // İl bazlı aylık trend grafiği

  // Araştırmacı tier (öğrenci de dahil)
  API_ACCESS: 'api_access',                      // JSON API erişimi
  CSV_EXPORT: 'csv_export',                      // CSV/Excel export
  CROSS_TABLE: 'cross_table',                    // Çapraz tablo oluşturucu
  FULL_ARCHIVE: 'full_archive',                  // Tüm turların tam arşivi
  TREND_BUILDER: 'trend_builder',                // Özel trend grafiği
  EMBED_WIDGET: 'embed_widget',                  // Embed widget
  WEIGHTING_DETAIL: 'weighting_detail',          // Ağırlıklandırma şeffaflığı
  WEEKLY_EMAIL: 'weekly_email',                  // Haftalık analiz e-postası

  // Parti tier
  PARTY_DASHBOARD: 'party_dashboard',            // Parti odaklı canlı dashboard
  COMPETITOR_PANEL: 'competitor_panel',           // Rakip karşılaştırma
  VOTER_PROFILE: 'voter_profile',                // Seçmen profil analizi
  LOSS_GAIN_MATRIX: 'loss_gain_matrix',          // Kayıp/kazanç matrisi
  GEO_PERFORMANCE: 'geo_performance',            // Coğrafi performans haritası
  SWING_ANALYSIS: 'swing_analysis',              // Swing seçmen analizi
  SEAT_PROJECTION: 'seat_projection',            // Milletvekili projeksiyonu
  REGIONAL_ALERTS: 'regional_alerts',            // Bölgesel erken uyarı
  WHITE_LABEL_PDF: 'white_label_pdf',            // Markalı PDF rapor
  CUSTOM_REPORTS: 'custom_reports',              // Özel rapor talebi
} as const;

// Feature → minimum gerekli tier mapping
const FEATURE_MIN_TIER: Record<string, PlanTier> = {
  [FEATURES.CITY_BREAKDOWN]: 'vatandas',
  [FEATURES.INSTANT_REPORTS]: 'vatandas',
  [FEATURES.DISTRICT_RANKING]: 'vatandas',
  [FEATURES.CITY_TRENDS]: 'vatandas',

  [FEATURES.API_ACCESS]: 'arastirmaci',
  [FEATURES.CSV_EXPORT]: 'arastirmaci',
  [FEATURES.CROSS_TABLE]: 'arastirmaci',
  [FEATURES.FULL_ARCHIVE]: 'arastirmaci',
  [FEATURES.TREND_BUILDER]: 'arastirmaci',
  [FEATURES.EMBED_WIDGET]: 'arastirmaci',
  [FEATURES.WEIGHTING_DETAIL]: 'arastirmaci',
  [FEATURES.WEEKLY_EMAIL]: 'arastirmaci',

  [FEATURES.PARTY_DASHBOARD]: 'parti',
  [FEATURES.COMPETITOR_PANEL]: 'parti',
  [FEATURES.VOTER_PROFILE]: 'parti',
  [FEATURES.LOSS_GAIN_MATRIX]: 'parti',
  [FEATURES.GEO_PERFORMANCE]: 'parti',
  [FEATURES.SWING_ANALYSIS]: 'parti',
  [FEATURES.SEAT_PROJECTION]: 'parti',
  [FEATURES.REGIONAL_ALERTS]: 'parti',
  [FEATURES.WHITE_LABEL_PDF]: 'parti',
  [FEATURES.CUSTOM_REPORTS]: 'parti',
};

/**
 * Kullanıcının belirli bir feature'a erişip erişemediğini kontrol et.
 */
export function hasFeature(userTier: PlanTier, feature: string): boolean {
  const minTier = FEATURE_MIN_TIER[feature];
  if (!minTier) return true; // Tanımlanmamış feature → herkese açık
  return tierAtLeast(userTier, minTier);
}
