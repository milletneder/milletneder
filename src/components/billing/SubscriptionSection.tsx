'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PLAN_LABELS, type PlanTier } from '@/lib/billing/plans';
import { CreditCard, ArrowUpRight, ExternalLink, XCircle, RotateCcw } from 'lucide-react';

interface Subscription {
  plan_tier: PlanTier;
  status: 'active' | 'cancelled' | 'past_due' | 'paused' | 'expired';
  billing_interval: 'monthly' | 'yearly';
  current_period_end: string | null;
  renews_at: string | null;
  ends_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  cancelled: 'İptal Edildi',
  past_due: 'Ödeme Bekliyor',
  paused: 'Duraklatıldı',
  expired: 'Süresi Doldu',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SubscriptionSection({ token }: { token: string }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setSubscription(null);
        return;
      }
      const data = await res.json();
      setSubscription(data.subscription ?? null);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  async function handlePortal() {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelOrResume(action: 'cancel' | 'resume') {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchSubscription();
      }
    } finally {
      setActionLoading(false);
    }
  }

  /* ---------- Loading skeleton ---------- */
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-52" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ---------- Free tier / no subscription ---------- */
  if (!subscription || subscription.plan_tier === 'free') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Abonelik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">Mevcut Plan:</span>
            <Badge variant="outline">Ücretsiz</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Planınızı yükselterek daha fazla özelliğe erişin.
          </p>
          <Button asChild>
            <Link href="/ucretler">
              <ArrowUpRight className="size-4 mr-1.5" />
              Planları İncele
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ---------- Active subscription ---------- */
  const isCancelled = subscription.status === 'cancelled';
  const planLabel = PLAN_LABELS[subscription.plan_tier] ?? subscription.plan_tier;
  const statusLabel = STATUS_LABELS[subscription.status] ?? subscription.status;
  const intervalLabel = subscription.billing_interval === 'yearly' ? 'Yıllık' : 'Aylık';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Abonelik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan + Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Plan:</span>
          <Badge variant="outline">{planLabel}</Badge>
          <Badge variant={isCancelled ? 'secondary' : 'outline'}>
            {statusLabel}
          </Badge>
        </div>

        {/* Billing interval */}
        <div className="text-sm text-muted-foreground">
          Faturalandırma: {intervalLabel}
        </div>

        {/* Period end / renewal */}
        {subscription.current_period_end && (
          <div className="text-sm text-muted-foreground">
            {isCancelled
              ? `Erişim bitiş tarihi: ${formatDate(subscription.ends_at ?? subscription.current_period_end)}`
              : `Sonraki yenileme: ${formatDate(subscription.renews_at ?? subscription.current_period_end)}`}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" asChild>
            <Link href="/ucretler">
              <ArrowUpRight className="size-4 mr-1.5" />
              Planı Yükselt
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={handlePortal}
            disabled={actionLoading}
          >
            <ExternalLink className="size-4 mr-1.5" />
            Aboneliği Yönet
          </Button>

          {isCancelled ? (
            <Button
              variant="outline"
              onClick={() => handleCancelOrResume('resume')}
              disabled={actionLoading}
            >
              <RotateCcw className="size-4 mr-1.5" />
              Aboneliği Devam Ettir
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={actionLoading}>
                  <XCircle className="size-4 mr-1.5" />
                  Aboneliği İptal Et
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Aboneliği iptal et</AlertDialogTitle>
                  <AlertDialogDescription>
                    Aboneliğinizi iptal etmek istediğinizden emin misiniz?
                    Mevcut dönem sonuna kadar erişim devam eder. Daha sonra
                    tekrar abone olabilirsiniz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleCancelOrResume('cancel')}>
                    Evet, iptal et
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
