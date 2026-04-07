'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';

interface PartyDetailModalProps {
  party: {
    partyId: string;
    partyName: string;
    color: string;
    voteCount: number;
    percentage: number;
    delta?: number;
    rawPct?: number;
  } | null;
  totalVotes: number;
  onClose: () => void;
}

export default function PartyDetailModal({ party, totalVotes, onClose }: PartyDetailModalProps) {
  if (!party) return null;

  const hasWeighting = party.delta != null && party.delta !== 0;
  const rawPct = party.rawPct ?? (hasWeighting ? party.percentage - party.delta! : party.percentage);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-background border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-md sm:mx-4 max-h-[85vh] overflow-y-auto shadow-lg"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: party.color }} />
              <h2 className="text-lg font-bold">{party.partyName}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Main percentage */}
            <div className="text-center">
              <div className="text-5xl font-bold tabular-nums">
                %{party.percentage.toFixed(1)}
              </div>
              {hasWeighting && (
                <p className="text-sm text-muted-foreground mt-1">
                  Ağırlıklı sonuç
                </p>
              )}
            </div>

            {/* Visual bar */}
            <div>
              <div className="w-full bg-muted h-6 rounded-lg overflow-hidden">
                <motion.div
                  className="h-full rounded-lg"
                  style={{ backgroundColor: party.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${party.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">%0</span>
                <span className="text-xs text-muted-foreground">%50</span>
                <span className="text-xs text-muted-foreground">%100</span>
              </div>
            </div>

            {/* Detail rows */}
            <div className="space-y-3">
              <DetailRow
                label="Toplam Oy"
                value={party.voteCount.toLocaleString('tr-TR')}
                description={`Toplam ${totalVotes.toLocaleString('tr-TR')} geçerli oyun içinden`}
              />

              {hasWeighting && (
                <>
                  <DetailRow
                    label="Ham Oran"
                    value={`%${rawPct.toFixed(1)}`}
                    description="Ağırlıklandırma uygulanmadan önceki oran"
                  />
                  <DetailRow
                    label="Ağırlıklı Oran"
                    value={`%${party.percentage.toFixed(1)}`}
                    description="Demografik düzeltmeler sonrası oran"
                  />
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Ağırlıklandırma Etkisi</span>
                      <span className="text-sm font-bold tabular-nums">
                        {party.delta! > 0 ? '+' : ''}{party.delta!.toFixed(1)} puan
                      </span>
                    </div>

                    {/* Raw vs Weighted comparison bars */}
                    <div className="space-y-2 mt-3">
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs text-muted-foreground">Ham</span>
                          <span className="text-xs text-muted-foreground tabular-nums">%{rawPct.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-background h-3 rounded-sm overflow-hidden">
                          <motion.div
                            className="h-full opacity-40 rounded-sm"
                            style={{ backgroundColor: party.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${rawPct}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs text-muted-foreground">Ağırlıklı</span>
                          <span className="text-xs text-muted-foreground tabular-nums">%{party.percentage.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-background h-3 rounded-sm overflow-hidden">
                          <motion.div
                            className="h-full rounded-sm"
                            style={{ backgroundColor: party.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${party.percentage}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      {party.delta! > 0
                        ? `${party.partyName} seçmeni ankette az temsil ediliyor. Demografik düzeltmeler sonucunda oran ${Math.abs(party.delta!).toFixed(1)} puan artırıldı.`
                        : `${party.partyName} seçmeni ankette fazla temsil ediliyor. Demografik düzeltmeler sonucunda oran ${Math.abs(party.delta!).toFixed(1)} puan azaltıldı.`
                      }
                    </p>
                  </div>
                </>
              )}

              {!hasWeighting && (
                <DetailRow
                  label="Oy Oranı"
                  value={`%${party.percentage.toFixed(1)}`}
                  description="Ham oy dağılımına göre hesaplanan oran"
                />
              )}
            </div>

            <Separator />

            {/* Explanation */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {hasWeighting
                ? 'Bu sonuçlar yaş, cinsiyet, eğitim ve bölge gibi demografik faktörler göz önüne alınarak ağırlıklandırılmıştır. Amaç, online anketin Türkiye genelini daha doğru temsil etmesini sağlamaktır.'
                : 'Bu sonuçlar kullanıcıların doğrudan oylarına dayalı ham dağılımdır. Ağırlıklandırma aktif olduğunda demografik düzeltmeler uygulanır.'
              }
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DetailRow({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="text-sm font-bold tabular-nums ml-4">{value}</span>
    </div>
  );
}
