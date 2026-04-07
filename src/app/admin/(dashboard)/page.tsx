'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Users,
  Vote,
  UserPlus,
  BarChart3,
  ShieldAlert,
  XCircle,
  CalendarDays,
} from 'lucide-react';

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
  activeRound: { id: number; start_date: string; end_date: string } | null;
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
  fallbackRescue: { total: number; today: number };
  errorBreakdown: { error_code: string | null; count: number }[];
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

const providerLabels: Record<string, string> = {
  firebase: 'Firebase',
  twilio: 'Twilio',
  vatansms: 'VatanSMS',
};

const trendChartConfig: ChartConfig = {
  registrations: { label: 'Kayıt', color: 'var(--color-foreground)' },
  logins: { label: 'Giriş', color: 'var(--color-muted-foreground)' },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatData | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; registrations: number; logins: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, chartsRes] = await Promise.all([
          fetch('/api/admin/dashboard/stats'),
          fetch('/api/admin/dashboard/charts'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (chartsRes.ok) {
          const data = await chartsRes.json();
          const regMap = new Map<string, number>();
          const loginMap = new Map<string, number>();
          (data.registrations || []).forEach((d: { date: string; count: number }) => {
            const label = d.date ? new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Istanbul' }) : '';
            regMap.set(label, d.count ?? 0);
          });
          (data.logins || []).forEach((d: { date: string; count: number }) => {
            const label = d.date ? new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Istanbul' }) : '';
            loginMap.set(label, d.count ?? 0);
          });
          const allDates = [...new Set([...regMap.keys(), ...loginMap.keys()])].sort();
          setTrendData(allDates.map((date) => ({
            date,
            registrations: regMap.get(date) || 0,
            logins: loginMap.get(date) || 0,
          })));
        }
      } catch { /* silent */ }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardContent className="pt-5"><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card><CardContent className="pt-5"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Gerçek Kullanıcı', value: stats.realUsers, icon: Users },
    { label: 'Geçerli Oy', value: stats.validVotes, icon: Vote },
    { label: 'Bugün Kayıt', value: stats.todayRegistrations, icon: UserPlus },
    { label: 'Bugün Oy', value: stats.todayVotes, icon: BarChart3 },
    { label: 'Şüpheli Hesap', value: stats.flaggedAccounts, icon: ShieldAlert },
    { label: 'Geçersiz Oy', value: stats.invalidVotes, icon: XCircle },
  ];

  const errorData = (stats.errorBreakdown || []).map((e) => ({
    name: errorCodeLabels[e.error_code ?? ''] || e.error_code || 'Bilinmeyen',
    count: e.count,
  }));

  const errorChartConfig: ChartConfig = {
    count: { label: 'Sayı', color: 'var(--color-foreground)' },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">Genel Bakış</h1>

      {/* Stat kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <card.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {(card.value ?? 0).toLocaleString('tr-TR')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Chart + Aktif Tur */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Günlük Kayıt & Oy Trendi */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Günlük Kayıt & Giriş Trendi (30 gün)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ChartContainer config={trendChartConfig} className="h-48 w-full">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area dataKey="registrations" fill="var(--color-foreground)" fillOpacity={0.15} stroke="var(--color-foreground)" strokeWidth={1.5} type="monotone" />
                  <Area dataKey="logins" fill="var(--color-muted-foreground)" fillOpacity={0.08} stroke="var(--color-muted-foreground)" strokeWidth={1.5} type="monotone" />
                </AreaChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </CardContent>
        </Card>

        {/* Aktif Tur */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Aktif Tur</CardTitle>
              {stats.activeRound && <Badge variant="default">Aktif</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {stats.activeRound ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span>Tur #{stats.activeRound.id}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Başlangıç: {new Date(stats.activeRound.start_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p>
                  <p>Bitiş: {new Date(stats.activeRound.end_date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Toplam Oy</span>
                    <span className="font-medium tabular-nums">{(stats.validVotes + stats.invalidVotes).toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Geçerli</span>
                    <span className="font-medium tabular-nums">{stats.validVotes.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Geçersiz</span>
                    <span className="font-medium tabular-nums">{stats.invalidVotes.toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aktif tur yok.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Auth & Güvenlik + Cihaz */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Auth & Güvenlik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Tamamlanmamış Kayıt', value: stats.totalIncomplete },
                { label: 'Bugün Giriş', value: stats.todayLogins },
                { label: 'OTP Gönderim', value: stats.todayOtpSent },
                { label: 'OTP Doğrulama', value: stats.todayOtpVerified },
                { label: 'Başarısız Giriş (bugün)', value: stats.todayLoginFails },
                { label: 'Engellenen Kayıt', value: stats.todayBlocked },
                { label: 'Başarısız Giriş (toplam)', value: stats.totalLoginFails },
                { label: 'Çoklu Hesap Cihazı', value: stats.multiAccountDevices },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium tabular-nums">{(item.value ?? 0).toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hata Dağılımı */}
        {errorData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bugünkü Hata Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={errorChartConfig} className="h-48 w-full">
                <BarChart data={errorData} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={10} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-foreground)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* SMS Sağlayıcıları */}
      {stats.smsStats && stats.smsStats.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">SMS Sağlayıcıları</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.smsStats.map((s) => (
              <Card key={s.provider}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">{providerLabels[s.provider] || s.provider}</span>
                    <Badge variant="outline">Bugün: {s.today}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Toplam', value: s.total },
                      { label: 'Gönderim', value: s.sent },
                      { label: 'Başarısız', value: s.failed },
                      { label: 'Fallback', value: s.fallback_count },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="text-lg font-bold tabular-nums">{m.value}</div>
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {stats.fallbackRescue && stats.fallbackRescue.total > 0 && (
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">Fallback Kurtarma</span>
                    <Badge variant="outline">Bugün: {stats.fallbackRescue.today}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold tabular-nums">{stats.fallbackRescue.total}</div>
                      <div className="text-xs text-muted-foreground">Toplam</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold tabular-nums">{stats.fallbackRescue.today}</div>
                      <div className="text-xs text-muted-foreground">Bugün</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Birincil sağlayıcı başarısız olup yedek tarafından karşılanan gönderimler
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
