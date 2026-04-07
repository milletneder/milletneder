'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface Transaction {
  hash: string;
  type: 'OY_KULLANIM' | 'OY_DEGISIKLIK' | 'OY_DEVIR' | 'KAYIT' | 'OY_SILME' | 'HESAP_SILME';
  city: string | null;
  party: string | null;
  partyColor: string | null;
  oldParty: string | null;
  oldPartyColor: string | null;
  newParty: string | null;
  newPartyColor: string | null;
  roundId: number;
  isValid: boolean | null;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_LABELS: Record<string, string> = {
  OY_KULLANIM: 'Oy',
  OY_DEGISIKLIK: 'Değişiklik',
  OY_DEVIR: 'Devir',
  KAYIT: 'Kayıt',
  OY_SILME: 'Oy Silme',
  HESAP_SILME: 'Hesap Silme',
};

function formatFullTime(ts: string): string {
  const d = new Date(ts);
  const base = d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Istanbul',
  });
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${base}.${ms}`;
}

const STATUS_LABELS: Record<string, string> = {
  invalid: 'Geçersiz Oylar',
  flagged: 'Şüpheli Hesaplar',
};

export default function IslemlerPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    }>
      <IslemlerPage />
    </Suspense>
  );
}

function IslemlerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  useEffect(() => {
    if (initializedFromUrl) return;
    const urlType = searchParams.get('type') || '';
    const urlCity = searchParams.get('city') || '';
    const urlParty = searchParams.get('party') || '';
    const urlStatus = searchParams.get('status') || '';
    if (urlType) setTypeFilter(urlType);
    if (urlCity) setCityFilter(urlCity);
    if (urlParty) setPartyFilter(urlParty);
    if (urlStatus) setStatusFilter(urlStatus);
    setInitializedFromUrl(true);
  }, [searchParams, initializedFromUrl]);

  const fetchTransactions = useCallback(async () => {
    if (!initializedFromUrl) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (typeFilter) params.set('type', typeFilter);
      if (cityFilter) params.set('city', cityFilter);
      if (partyFilter) params.set('party', partyFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setPagination(data.pagination);
        if (data.counts) setTypeCounts(data.counts);
        if (data.flaggedCount !== undefined) setFlaggedCount(data.flaggedCount);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, typeFilter, cityFilter, partyFilter, statusFilter, initializedFromUrl]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetch('/api/results/live-count')
      .then((r) => r.json())
      .then((d) => setTotalVotes(d.totalVotes || 0))
      .catch(() => {});
  }, []);

  const handleTypeChange = (t: string) => {
    setTypeFilter(t === typeFilter ? '' : t);
    setPage(1);
  };

  const handleStatusChange = (s: string) => {
    setStatusFilter(s === statusFilter ? '' : s);
    setPage(1);
  };

  const clearAllFilters = () => {
    setTypeFilter('');
    setCityFilter('');
    setPartyFilter('');
    setStatusFilter('');
    setPage(1);
    router.replace('/islemler', { scroll: false });
  };

  const hasAnyFilter = typeFilter || cityFilter || partyFilter || statusFilter;

  return (
    <div className="min-h-screen bg-background">
      <Header totalVotes={totalVotes} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <PageHero
          title="İşlem Geçmişi"
          subtitle="Tüm platform işlemleri şeffaf ve doğrulanabilir şekilde listelenir. Her işlem benzersiz bir hash ile tanımlanır."
          stats={pagination ? [
            { label: 'Oy İşlemi', value: (typeCounts['OY_KULLANIM'] || 0).toLocaleString('tr-TR') },
            { label: 'Devir İşlemi', value: (typeCounts['OY_DEVIR'] || 0).toLocaleString('tr-TR') },
            { label: 'Değişiklik', value: (typeCounts['OY_DEGISIKLIK'] || 0).toLocaleString('tr-TR') },
            { label: 'Katılımcı', value: ((typeCounts['KAYIT'] || 0) - flaggedCount).toLocaleString('tr-TR') },
            { label: 'Silinen Oy', value: (typeCounts['OY_SILME'] || 0).toLocaleString('tr-TR') },
            { label: 'Silinen Hesap', value: (typeCounts['HESAP_SILME'] || 0).toLocaleString('tr-TR') },
            { label: 'Şüpheli Hesap', value: flaggedCount.toLocaleString('tr-TR') },
          ] : undefined}
        />

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {hasAnyFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Aktif filtreler:</span>
              {statusFilter && (
                <Badge variant="default">
                  {STATUS_LABELS[statusFilter] || statusFilter}
                  <Button variant="ghost" size="icon" onClick={() => { setStatusFilter(''); setPage(1); }} className="ml-1 size-4"><X className="size-3" /></Button>
                </Badge>
              )}
              {partyFilter && (
                <Badge variant="default">
                  Parti: {partyFilter}
                  <Button variant="ghost" size="icon" onClick={() => { setPartyFilter(''); setPage(1); }} className="ml-1 size-4"><X className="size-3" /></Button>
                </Badge>
              )}
              {typeFilter && (
                <Badge variant="default">
                  {TYPE_LABELS[typeFilter]}
                  <Button variant="ghost" size="icon" onClick={() => { setTypeFilter(''); setPage(1); }} className="ml-1 size-4"><X className="size-3" /></Button>
                </Badge>
              )}
              {cityFilter && (
                <Badge variant="default">
                  İl: {cityFilter}
                  <Button variant="ghost" size="icon" onClick={() => { setCityFilter(''); setPage(1); }} className="ml-1 size-4"><X className="size-3" /></Button>
                </Badge>
              )}
              <Button variant="link" onClick={clearAllFilters}>
                Tümünü temizle
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Tür:</span>
            {['OY_KULLANIM', 'OY_DEGISIKLIK', 'OY_DEVIR', 'KAYIT', 'OY_SILME', 'HESAP_SILME'].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? 'default' : 'outline'}
                               onClick={() => handleTypeChange(t)}
              >
                {TYPE_LABELS[t]}
              </Button>
            ))}

            <Separator orientation="vertical" className="h-4 mx-1" />
            <span className="text-xs text-muted-foreground mr-1">Durum:</span>
            {['invalid', 'flagged'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                               onClick={() => handleStatusChange(s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}

            <div className="ml-auto flex gap-2">
              <Input
                type="text"
                placeholder="Parti ara..."
                value={partyFilter}
                onChange={(e) => { setPartyFilter(e.target.value); setPage(1); }}
                className="w-28"
              />
              <Input
                type="text"
                placeholder="İl ara..."
                value={cityFilter}
                onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                className="w-28"
              />
            </div>
          </div>
        </div>

        {/* Transaction list */}
        <Card>
          <div className="hidden sm:grid grid-cols-[140px_72px_minmax(0,1fr)_140px] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">İşlem Kimliği</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tür</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Detay</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-right">Zaman</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              İşlem bulunamadı
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.hash}>
                {/* Desktop row */}
                <div
                  className={cn(
                    "hidden sm:grid grid-cols-[140px_72px_minmax(0,1fr)_140px] gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer items-center",
                    tx.isValid === false && 'bg-destructive/5'
                  )}
                  onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
                >
                  <div className="font-mono text-xs text-muted-foreground truncate">{tx.hash}</div>
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {TYPE_LABELS[tx.type]}
                    {tx.isValid === false && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">GEÇERSİZ</Badge>
                    )}
                  </div>
                  <div className="text-sm"><TxDetail tx={tx} /></div>
                  <div className="text-xs text-muted-foreground text-right tabular-nums">{formatFullTime(tx.timestamp)}</div>
                </div>

                {/* Mobile row */}
                <div
                  className={cn(
                    "sm:hidden px-4 py-3 border-b border-border/50 active:bg-muted/30",
                    tx.isValid === false && 'bg-destructive/5'
                  )}
                  onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {TYPE_LABELS[tx.type]}
                      {tx.isValid === false && (
                        <Badge variant="destructive" className="text-xs px-1 py-0 ml-1.5">GEÇERSİZ</Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatFullTime(tx.timestamp)}</span>
                  </div>
                  <div className="text-sm mb-1"><TxDetail tx={tx} /></div>
                  <div className="font-mono text-xs text-muted-foreground/50 truncate">{tx.hash}</div>
                </div>

                {/* Expanded details */}
                {expandedTx === tx.hash && (
                  <div className="px-4 py-3 bg-muted/50 border-b border-border">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">İşlem Kimliği</span>
                        <span className="font-mono text-muted-foreground break-all">{tx.hash}</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Zaman</span>
                        <span className="tabular-nums">{formatFullTime(tx.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Durum</span>
                        {tx.isValid === false ? (
                          <Badge variant="destructive" className="text-xs">Geçersiz</Badge>
                        ) : tx.isValid === true ? (
                          <Badge variant="secondary" className="text-xs">Onaylandı</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      {tx.city && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">İl</span>
                          <span>{tx.city}</span>
                        </div>
                      )}
                      {tx.roundId > 0 && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Tur</span>
                          <span>#{tx.roundId}</span>
                        </div>
                      )}
                      {tx.type === 'OY_KULLANIM' && tx.party && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Parti</span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tx.partyColor || '#555' }} />
                            <span className="font-medium">{tx.party}</span>
                          </span>
                        </div>
                      )}
                      {tx.type === 'OY_DEGISIKLIK' && (
                        <>
                          <div>
                            <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Eski Parti</span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tx.oldPartyColor || '#555' }} />
                              <span className="text-muted-foreground line-through">{tx.oldParty}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Yeni Parti</span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tx.newPartyColor || '#555' }} />
                              <span className="font-medium">{tx.newParty}</span>
                            </span>
                          </div>
                        </>
                      )}
                      {tx.type === 'OY_SILME' && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-0.5">Parti</span>
                          {tx.party ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: tx.partyColor || '#555' }} />
                              <span className="font-medium">{tx.party}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">[şifreli oy]</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
                           onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="size-3.5" data-icon="inline-start" />
              Önceki
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                let p: number;
                if (pagination.totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= pagination.totalPages - 3) {
                  p = pagination.totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
                           onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Sonraki
              <ChevronRight className="size-3.5" data-icon="inline-end" />
            </Button>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-8">
          <Separator className="mb-6" />
          <Card className="bg-muted/50">
            <CardContent className="pt-5 space-y-3">
              <h3 className="text-xs font-bold">Şeffaflık Hakkında</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bu sayfa, platformda gerçekleşen tüm işlemleri şeffaf bir şekilde listeler.
                Her işlem benzersiz bir kriptografik hash ile tanımlanır ve değiştirilemez.
                Kullanıcı kimlikleri anonim hash&apos;ler ile gösterilir —
                hiçbir kişisel veri açığa çıkmaz.
              </p>
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold">İşlem Türleri</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                  <div><strong className="text-foreground">Oy</strong> — İlk kez oy vermek</div>
                  <div><strong className="text-foreground">Değişiklik</strong> — Oyu başka partiye taşımak</div>
                  <div><strong className="text-foreground">Devir</strong> — Önceki turdan otomatik devir</div>
                  <div><strong className="text-foreground">Kayıt</strong> — Yeni hesap oluşturma</div>
                  <div><strong className="text-foreground">Oy Silme</strong> — Hesap silindiğinde oyun kaldırılması</div>
                  <div><strong className="text-foreground">Hesap Silme</strong> — Kullanıcı hesabının silinmesi</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold">Şüpheli Hesap Tespiti</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aynı cihazdan birden fazla hesap oluşturulduğu tespit edildiğinde, ilgili tüm hesaplar
                  otomatik olarak şüpheli işaretlenir ve oyları geçersiz sayılır. Bu hesaplar katılımcı
                  sayısına dahil edilmez. Şüpheli hesap sayısı şeffaflık gereği üstte gösterilir.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function TxDetail({ tx }: { tx: Transaction }) {
  if (tx.type === 'KAYIT') {
    return (
      <span>
        {tx.city && <span className="font-medium">{tx.city}</span>}
        {tx.city && <span className="text-muted-foreground/30 mx-1.5">·</span>}
        <span className="text-muted-foreground">Yeni hesap</span>
      </span>
    );
  }

  if (tx.type === 'OY_KULLANIM') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="font-medium">{tx.city}</span>
            <span className="text-muted-foreground/30">·</span>
          </>
        )}
        <span className="w-2.5 h-2.5 inline-block shrink-0 rounded-sm" style={{ backgroundColor: tx.partyColor || '#555' }} />
        <span className="font-medium">{tx.party}</span>
      </span>
    );
  }

  if (tx.type === 'OY_DEVIR') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="font-medium">{tx.city}</span>
            <span className="text-muted-foreground/30">·</span>
          </>
        )}
        <span className="w-2.5 h-2.5 inline-block shrink-0 rounded-sm" style={{ backgroundColor: tx.partyColor || '#555' }} />
        <span className="font-medium">{tx.party}</span>
        <span className="text-muted-foreground text-xs">devir</span>
      </span>
    );
  }

  if (tx.type === 'OY_DEGISIKLIK') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="font-medium">{tx.city}</span>
            <span className="text-muted-foreground/30">·</span>
          </>
        )}
        <span className="w-2.5 h-2.5 inline-block shrink-0 rounded-sm" style={{ backgroundColor: tx.oldPartyColor || '#555' }} />
        <span className="text-muted-foreground line-through">{tx.oldParty}</span>
        <ArrowRight className="size-3 text-muted-foreground/50 shrink-0" />
        <span className="w-2.5 h-2.5 inline-block shrink-0 rounded-sm" style={{ backgroundColor: tx.newPartyColor || '#555' }} />
        <span className="font-medium">{tx.newParty}</span>
      </span>
    );
  }

  if (tx.type === 'OY_SILME') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="font-medium">{tx.city}</span>
            <span className="text-muted-foreground/30">·</span>
          </>
        )}
        {tx.party ? (
          <>
            <span className="w-2.5 h-2.5 inline-block shrink-0 rounded-sm" style={{ backgroundColor: tx.partyColor || '#555' }} />
            <span className="font-medium">{tx.party}</span>
          </>
        ) : (
          <span className="text-muted-foreground">[şifreli oy]</span>
        )}
        <span className="text-muted-foreground text-xs">silindi</span>
      </span>
    );
  }

  if (tx.type === 'HESAP_SILME') {
    return (
      <span>
        {tx.city && <span className="font-medium">{tx.city}</span>}
        {tx.city && <span className="text-muted-foreground/30 mx-1.5">·</span>}
        <span className="text-muted-foreground">Hesap silindi</span>
      </span>
    );
  }

  return null;
}
