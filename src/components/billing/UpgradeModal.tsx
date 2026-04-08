'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FEATURE_MIN_TIER } from '@/lib/billing/features';
import { PLAN_LABELS, PLAN_PRICES } from '@/lib/billing/plans';
import type { PlanTier } from '@/lib/billing/plans';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  title?: string;
  description?: string;
}

/**
 * Dialog tabanlı upgrade prompt.
 * Kullanıcı tıklama gibi etkileşimli aksiyonları engeller.
 */
export function UpgradeModal({ open, onOpenChange, feature, title, description }: UpgradeModalProps) {
  const minTier = feature ? (FEATURE_MIN_TIER[feature] as PlanTier) : 'vatandas';
  const planLabel = PLAN_LABELS[minTier] || 'Vatandaş';
  const price = PLAN_PRICES[minTier];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <Badge variant="outline">{planLabel}</Badge>
          </div>
          <DialogTitle>
            {title || 'Premium Özellik'}
          </DialogTitle>
          <DialogDescription>
            {description || `Bu özelliğe erişmek için ${planLabel} planına yükseltmeniz gerekiyor.`}
          </DialogDescription>
        </DialogHeader>
        {price && price.monthly > 0 && (
          <p className="text-sm text-muted-foreground">
            ₺{price.monthly}/ay&apos;dan başlayan fiyatlarla
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/ucretler">Planları İncele</Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
