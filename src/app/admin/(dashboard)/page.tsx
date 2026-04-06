'use client';
import { useState, useEffect } from 'react';

interface SmsProviderStat {
  provider: string;
  total: number;
  today: number;
  sent: number;
  failed: number;
  fallback_count: number;
}

interface StatData {
  realUsers: number;
  dummyUsers: number;
  validVotes: number;
  invalidVotes: number;
  flaggedAccounts: number;
  todayRegistrations: number;
  todayVotes: number;
  activeRound: {
    id: number;
    start_date: string;
    end_date: string;
  } | null;
  todayLogins: number;
  todayLoginFails: number;
  todayBlocked: number;
  totalIncomplete: number;
  totalLoginFails: number;
  todayOtpSent: number;
  todayOtpVerified: number;
  uniqueDevices: number;
  multiAccountDevices: number;
  smsStats: SmsProviderStat[];
  errorBreakdown: { error_code: string | null; count: number }[];
}

interface ChartRawItem {
  date: string;
  count: number;
}

interface ChartData {
  dailyRegistrations: { label: string; value: number }[];
  dailyVotes: { label: string; value: number }[];
}

function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number }[];
  title: string;
}) {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 32;
  const gap = 8;
  const chartHeight = 160;
  const svgWidth = data.length * (barWidth + gap);

  return (
    <div>
      <h3 className="text-sm font-medium text-black mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={chartHeight + 40}
          className="block"
        >
          {data.map((d, i) => {
            const barHeight = (d.value / maxValue) * chartHeight;
            const x = i * (barWidth + gap);
            const y = chartHeight - barHeight;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="black"
                  rx={2}
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="text-xs fill-black"
                  fontSize={10}
                >
                  {d.value}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  className="text-xs fill-neutral-500"
                  fontSize={9}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

const errorCodeLabels: Record<string, string> = {
  token_invalid: 'Token Hatası',
  account_disabled: 'Hesap Devre Dışı',
  user_not_found: 'Kullanıcı Bulunamadı',
  wrong_password: 'Yanlış Şifre',
  server_error: 'Sunucu Hatası',
  ip_rate_limit: 'IP Limiti',
  fingerprint_limit: 'Cihaz Limiti',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, chartsRes] = await Promise.all([
          fetch('/api/admin/dashboard/stats'),
          fetch('/api/admin/dashboard/charts'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (chartsRes.ok) {
          const chartsData = await chartsRes.json();
          const mapItems = (items: ChartRawItem[]) =>
            (items || []).map((d: ChartRawItem) => ({
              label: d.date ? new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Istanbul' }) : '',
              value: d.count ?? 0,
            }));
          setCharts({
            dailyRegistrations: mapItems(chartsData.registrations),
            dailyVotes: mapItems(chartsData.votes),
          });
        }
      } catch {
        // silently fail
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const mainCards = stats
    ? [
        { label: 'Gerçek Kullanıcı', value: stats.realUsers },
        { label: 'Geçerli Oy', value: stats.validVotes },
        { label: 'Geçersiz Oy', value: stats.invalidVotes },
        { label: 'Şüpheli Hesap', value: stats.flaggedAccounts },
        { label: 'Bugünkü Kayıt', value: stats.todayRegistrations },
        { label: 'Bugünkü Oy', value: stats.todayVotes },
      ]
    : [];

  const authCards = stats
    ? [
        { label: 'Tamamlanmamış Kayıt', value: stats.totalIncomplete, color: 'border-black' },
        { label: 'Bugün Giriş', value: stats.todayLogins, color: 'border-black' },
        { label: 'Bugün OTP Gönderim', value: stats.todayOtpSent, color: 'border-black' },
        { label: 'Bugün OTP Doğrulama', value: stats.todayOtpVerified, color: 'border-black' },
        { label: 'Bugün Başarısız Giriş', value: stats.todayLoginFails, color: 'border-black' },
        { label: 'Bugün Engellenen Kayıt', value: stats.todayBlocked, color: 'border-black' },
        { label: 'Toplam Başarısız Giriş', value: stats.totalLoginFails, color: 'border-black' },
      ]
    : [];

  const deviceCards = stats
    ? [
        { label: 'Benzersiz Cihaz', value: stats.uniqueDevices },
        { label: 'Çoklu Hesap Cihazı', value: stats.multiAccountDevices },
      ]
    : [];

  const providerLabels: Record<string, string> = {
    firebase: 'Firebase',
    twilio: 'Twilio',
    vatansms: 'VatanSMS',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-black">Dashboard</h1>

      {!stats ? (
        <div className="text-neutral-500 text-sm">Yükleniyor...</div>
      ) : (
        <>
          {/* Ana Metrikler */}
          <div>
            <h2 className="text-sm font-medium text-neutral-500 mb-2">Genel</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {mainCards.map((card) => (
                <div
                  key={card.label}
                  className="border-l-4 border-black border border-neutral-200 p-4"
                >
                  <div className="text-2xl font-bold text-black">
                    {(card.value ?? 0).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auth Metrikleri */}
          <div>
            <h2 className="text-sm font-medium text-neutral-500 mb-2">Auth & Güvenlik</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {authCards.map((card) => (
                <div
                  key={card.label}
                  className="border-l-4 border-black border border-neutral-200 p-4"
                >
                  <div className="text-2xl font-bold text-black">
                    {(card.value ?? 0).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SMS Sağlayıcı İstatistikleri */}
          {stats.smsStats && stats.smsStats.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-neutral-500 mb-2">SMS Sağlayıcıları</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.smsStats.map((s) => (
                  <div key={s.provider} className="border border-neutral-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-black">
                        {providerLabels[s.provider] || s.provider}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Bugün: {s.today}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <div className="text-lg font-bold text-black">{s.total}</div>
                        <div className="text-[10px] text-neutral-500">Toplam</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-black">{s.sent}</div>
                        <div className="text-[10px] text-neutral-500">Gönderim</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-black">{s.failed}</div>
                        <div className="text-[10px] text-neutral-500">Başarısız</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-black">{s.fallback_count}</div>
                        <div className="text-[10px] text-neutral-500">Fallback</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cihaz Metrikleri */}
          <div>
            <h2 className="text-sm font-medium text-neutral-500 mb-2">Cihaz</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {deviceCards.map((card) => (
                <div
                  key={card.label}
                  className="border-l-4 border-black border border-neutral-200 p-4"
                >
                  <div className="text-2xl font-bold text-black">
                    {(card.value ?? 0).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {card.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hata Dağılımı */}
          {stats.errorBreakdown && stats.errorBreakdown.length > 0 && (
            <div className="border border-neutral-200 p-4">
              <h2 className="text-sm font-medium text-black mb-3">Bugünkü Hata Dağılımı</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.errorBreakdown.map((item) => (
                  <div key={item.error_code ?? 'unknown'} className="flex items-center justify-between bg-neutral-50 px-3 py-2">
                    <span className="text-xs text-neutral-600">
                      {errorCodeLabels[item.error_code ?? ''] || item.error_code || 'Bilinmeyen'}
                    </span>
                    <span className="text-sm font-bold text-black ml-2">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.activeRound && (
            <div className="border border-neutral-200 p-4">
              <h2 className="text-sm font-medium text-black mb-2">
                Aktif Tur
              </h2>
              <div className="flex gap-6 text-sm text-neutral-700">
                <span>Tur #{stats.activeRound.id}</span>
                <span>
                  Başlangıç:{' '}
                  {new Date(stats.activeRound.start_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                </span>
                <span>
                  Bitiş:{' '}
                  {new Date(stats.activeRound.end_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                </span>
              </div>
            </div>
          )}

          {charts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-neutral-200 p-4">
                <BarChart
                  data={charts.dailyRegistrations}
                  title="Günlük Kayıtlar"
                />
              </div>
              <div className="border border-neutral-200 p-4">
                <BarChart
                  data={charts.dailyVotes}
                  title="Günlük Oylar"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
