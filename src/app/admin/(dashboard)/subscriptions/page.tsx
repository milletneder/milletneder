'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Users, CreditCard, UserPlus, UserMinus } from 'lucide-react';
import { PLAN_LABELS, type PlanTier } from '@/lib/billing/plans';

interface Stats {
  activeCount: number;
  totalRevenue: number;
  newThisMonth: number;
  cancelledThisMonth: number;
  tierDistribution: { tier: string; count: number }[];
}

interface Subscriber {
  id: number;
  user_id: number;
  plan_tier: string;
  status: string;
  billing_interval: string | null;
  renews_at: string | null;
  created_at: string;
  user_identity_hash: string | null;
  user_city: string | null;
}

interface SubscriptionEvent {
  id: number;
  event_type: string;
  user_id: number | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusLabels: Record<string, string> = {
  active: 'Aktif',
  cancelled: 'İptal',
  expired: 'Süresi Dolmuş',
  paused: 'Duraklatılmış',
  past_due: 'Ödeme Gecikmiş',
  unpaid: 'Ödenmemiş',
  on_trial: 'Deneme',
};

const eventTypeLabels: Record<string, string> = {
  subscription_created: 'Abonelik Oluşturuldu',
  subscription_updated: 'Abonelik Güncellendi',
  subscription_cancelled: 'Abonelik İptal Edildi',
  subscription_resumed: 'Abonelik Devam Etti',
  subscription_expired: 'Abonelik Süresi Doldu',
  subscription_paused: 'Abonelik Duraklatıldı',
  subscription_unpaused: 'Abonelik Devam Ettirildi',
  payment_success: 'Ödeme Başarılı',
  payment_failed: 'Ödeme Başarısız',
};

const intervalLabels: Record<string, string> = {
  monthly: 'Aylık',
  yearly: 'Yıllık',
};

const tierChartConfig: ChartConfig = {
  count: { label: 'Abone', color: 'var(--color-foreground)' },
};

function formatCurrency(value: number): string {
  return value.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function SubscriptionsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [recentEvents, setRecentEvents] = useState<SubscriptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      try {
        const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setSubscribers(data.subscribers?.data || []);
          setPagination(data.subscribers?.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
          });
          setRecentEvents(data.recentEvents || []);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [page, tierFilter, statusFilter]);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-5">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Aktif Abone',
      value: (stats?.activeCount ?? 0).toLocaleString('tr-TR'),
      icon: Users,
    },
    {
      label: 'Aylık Gelir Tahmini',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: CreditCard,
    },
    {
      label: 'Bu Ay Yeni',
      value: (stats?.newThisMonth ?? 0).toLocaleString('tr-TR'),
      icon: UserPlus,
    },
    {
      label: 'Bu Ay İptal',
      value: (stats?.cancelledThisMonth ?? 0).toLocaleString('tr-TR'),
      icon: UserMinus,
    },
  ];

  const chartData = (stats?.tierDistribution || []).map((d) => ({
    name: PLAN_LABELS[d.tier as PlanTier] || d.tier,
    count: d.count,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">Abonelikler</h1>

      {/* Stat kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <card.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold tabular-nums">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan dağılımı chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Plan Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tierChartConfig} className="h-48 w-full">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  width={100}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-foreground)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Abone listesi */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Abone Listesi</h2>
          <div className="flex gap-3">
            <Select
              value={tierFilter}
              onValueChange={(v) => {
                setTierFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Planlar</SelectItem>
                <SelectItem value="vatandas">Vatandaş</SelectItem>
                <SelectItem value="ogrenci">Öğrenci</SelectItem>
                <SelectItem value="arastirmaci">Araştırmacı</SelectItem>
                <SelectItem value="parti">Siyasi Parti</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="cancelled">İptal</SelectItem>
                <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                <SelectItem value="paused">Duraklatılmış</SelectItem>
                <SelectItem value="past_due">Ödeme Gecikmiş</SelectItem>
                <SelectItem value="on_trial">Deneme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Periyot</TableHead>
                <TableHead>Yenileme</TableHead>
                <TableHead>Kayıt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {sub.user_identity_hash
                      ? sub.user_identity_hash.substring(0, 12) + '...'
                      : '—'}
                    {sub.user_city && (
                      <span className="ml-2 text-foreground">{sub.user_city}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PLAN_LABELS[sub.plan_tier as PlanTier] || sub.plan_tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={sub.status === 'active' ? 'default' : 'secondary'}
                    >
                      {statusLabels[sub.status] || sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {sub.billing_interval
                      ? intervalLabels[sub.billing_interval] || sub.billing_interval
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.renews_at
                      ? new Date(sub.renews_at).toLocaleDateString('tr-TR', {
                          timeZone: 'Europe/Istanbul',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.created_at
                      ? new Date(sub.created_at).toLocaleDateString('tr-TR', {
                          timeZone: 'Europe/Istanbul',
                        })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {subscribers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    Abone bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Sayfa {pagination.page} / {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      </div>

      {/* Son olaylar */}
      {recentEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Son Olaylar</h2>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Olay Tipi</TableHead>
                  <TableHead>Kullanıcı ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.created_at
                        ? new Date(event.created_at).toLocaleString('tr-TR', {
                            timeZone: 'Europe/Istanbul',
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {eventTypeLabels[event.event_type] || event.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {event.user_id ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
