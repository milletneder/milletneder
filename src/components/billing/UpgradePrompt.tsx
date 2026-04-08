'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FEATURE_MIN_TIER } from '@/lib/billing/features';
import { PLAN_LABELS, PLAN_PRICES } from '@/lib/billing/plans';
import type { PlanTier } from '@/lib/billing/plans';

interface UpgradePromptProps {
  feature?: string;
  title?: string;
  description?: string;
}

/**
 * Inline upgrade CTA kartı.
 * Feature verilirse minimum tier ve fiyatı otomatik gösterir.
 */
export function UpgradePrompt({ feature, title, description }: UpgradePromptProps) {
  const minTier = feature ? (FEATURE_MIN_TIER[feature] as PlanTier) : 'vatandas';
  const planLabel = PLAN_LABELS[minTier] || 'Vatandaş';
  const price = PLAN_PRICES[minTier];

  return (
    <Card>
      <CardContent className="pt-6 text-center space-y-3">
        <Badge variant="outline">{planLabel}</Badge>
        <p className="text-sm font-medium">
          {title || 'Bu özellik premium planınıza dahil değil'}
        </p>
        <p className="text-sm text-muted-foreground">
          {description || `${planLabel} planına yükselterek bu özelliğe erişebilirsiniz.`}
        </p>
        {price && price.monthly > 0 && (
          <p className="text-xs text-muted-foreground">
            ₺{price.monthly}/ay&apos;dan başlayan fiyatlarla
          </p>
        )}
        <Button asChild>
          <Link href="/ucretler">Planları İncele</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
