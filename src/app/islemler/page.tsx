'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';

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

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0 || diffMs > 86400000) {
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' });
  }

  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk`;
  return `${diffHour} sa`;
}

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

import { Suspense } from 'react';

const STATUS_LABELS: Record<string, string> = {
  invalid: 'Geçersiz Oylar',
  flagged: 'Şüpheli Hesaplar',
};

export default function IslemlerPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
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

  // URL query params'dan filtreleri oku (sadece ilk yüklemede)
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
    } catch {
      // ignore
    }
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
    // URL'yi de temizle
    router.replace('/islemler', { scroll: false });
  };

  const hasAnyFilter = typeFilter || cityFilter || partyFilter || statusFilter;

  return (
    <div className="min-h-screen bg-white">
      <Header totalVotes={totalVotes} />

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
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
          {/* Aktif filtre göstergesi */}
          {hasAnyFilter && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-400">Aktif filtreler:</span>
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-900 text-white">
                  {STATUS_LABELS[statusFilter] || statusFilter}
                  <button onClick={() => { setStatusFilter(''); setPage(1); }} className="ml-1 hover:text-neutral-300">&times;</button>
                </span>
              )}
              {partyFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-900 text-white">
                  Parti: {partyFilter}
                  <button onClick={() => { setPartyFilter(''); setPage(1); }} className="ml-1 hover:text-neutral-300">&times;</button>
                </span>
              )}
              {typeFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-900 text-white">
                  {TYPE_LABELS[typeFilter]}
                  <button onClick={() => { setTypeFilter(''); setPage(1); }} className="ml-1 hover:text-neutral-300">&times;</button>
                </span>
              )}
              {cityFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-900 text-white">
                  İl: {cityFilter}
                  <button onClick={() => { setCityFilter(''); setPage(1); }} className="ml-1 hover:text-neutral-300">&times;</button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="px-2 py-1 text-xs text-neutral-400 hover:text-black underline"
              >
                Tümünü temizle
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400 mr-1">Tür:</span>
            {['OY_KULLANIM', 'OY_DEGISIKLIK', 'OY_DEVIR', 'KAYIT', 'OY_SILME', 'HESAP_SILME'].map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                  typeFilter === t
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-black'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}

            <span className="text-neutral-200 mx-1">|</span>
            <span className="text-xs text-neutral-400 mr-1">Durum:</span>
            {['invalid', 'flagged'].map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-black'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}

            <div className="ml-auto flex gap-2">
              <input
                type="text"
                placeholder="Parti ara..."
                value={partyFilter}
                onChange={(e) => { setPartyFilter(e.target.value); setPage(1); }}
                className="border border-neutral-200 px-3 py-1.5 text-xs w-28 focus:border-black focus:outline-none"
              />
              <input
                type="text"
                placeholder="İl ara..."
                value={cityFilter}
                onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                className="border border-neutral-200 px-3 py-1.5 text-xs w-28 focus:border-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Transaction list */}
        <div className="border border-neutral-100">
          {/* Table header — desktop */}
          <div className="hidden sm:grid grid-cols-[140px_72px_minmax(0,1fr)_140px] gap-3 px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">İşlem Kimliği</span>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">Tür</span>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">Detay</span>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold text-right">Zaman</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-sm">
              İşlem bulunamadı
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.hash}>
                {/* Desktop row */}
                <div
                  className={`hidden sm:grid grid-cols-[140px_72px_minmax(0,1fr)_140px] gap-3 px-4 py-2.5 border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors cursor-pointer items-center ${tx.isValid === false ? 'bg-red-50/40' : ''}`}
                  onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
                >
                  <div className="font-mono text-xs text-neutral-400 truncate">
                    {tx.hash}
                  </div>
                  <div className="text-xs font-medium text-neutral-500 flex items-center gap-1.5">
                    {TYPE_LABELS[tx.type]}
                    {tx.isValid === false && (
                      <span className="text-[10px] text-red-500 font-medium">GEÇERSİZ</span>
                    )}
                  </div>
                  <div className="text-sm text-neutral-600">
                    <TxDetail tx={tx} />
                  </div>
                  <div className="text-xs text-neutral-400 text-right tabular-nums">
                    {formatFullTime(tx.timestamp)}
                  </div>
                </div>

                {/* Mobile row */}
                <div
                  className={`sm:hidden px-4 py-3 border-b border-neutral-50 active:bg-neutral-50 ${tx.isValid === false ? 'bg-red-50/40' : ''}`}
                  onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-neutral-500">
                      {TYPE_LABELS[tx.type]}
                      {tx.isValid === false && (
                        <span className="text-[10px] text-red-500 font-medium ml-1.5">GEÇERSİZ</span>
                      )}
                    </span>
                    <span className="text-xs text-neutral-400 tabular-nums">{formatFullTime(tx.timestamp)}</span>
                  </div>
                  <div className="text-sm text-neutral-600 mb-1">
                    <TxDetail tx={tx} />
                  </div>
                  <div className="font-mono text-xs text-neutral-300 truncate">{tx.hash}</div>
                </div>

                {/* Expanded details */}
                {expandedTx === tx.hash && (
                  <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">İşlem Kimliği</span>
                        <span className="font-mono text-neutral-600 break-all">{tx.hash}</span>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">Zaman</span>
                        <span className="text-neutral-600 tabular-nums">{formatFullTime(tx.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">Durum</span>
                        {tx.isValid === false ? (
                          <span className="text-neutral-800 font-medium">Geçersiz</span>
                        ) : tx.isValid === true ? (
                          <span className="text-neutral-800 font-medium">Onaylandı</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </div>
                      {tx.city && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">İl</span>
                          <span className="text-neutral-600">{tx.city}</span>
                        </div>
                      )}
                      {tx.roundId > 0 && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">Tur</span>
                          <span className="text-neutral-600">#{tx.roundId}</span>
                        </div>
                      )}
                      {tx.type === 'OY_KULLANIM' && tx.party && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">Parti</span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5" style={{ backgroundColor: tx.partyColor || '#555' }} />
                            <span className="text-neutral-800 font-medium">{tx.party}</span>
                          </span>
                        </div>
                      )}
                      {tx.type === 'OY_DEGISIKLIK' && (
                        <>
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">Eski Parti</span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5" style={{ backgroundColor: tx.oldPartyColor || '#555' }} />
                              <span className="text-neutral-500 line-through">{tx.oldParty}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">Yeni Parti</span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5" style={{ backgroundColor: tx.newPartyColor || '#555' }} />
                              <span className="text-neutral-800 font-medium">{tx.newParty}</span>
                            </span>
                          </div>
                        </>
                      )}
                      {tx.type === 'OY_SILME' && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-neutral-400 block mb-0.5">Parti</span>
                          {tx.party ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5" style={{ backgroundColor: tx.partyColor || '#555' }} />
                              <span className="text-neutral-800 font-medium">{tx.party}</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400">[şifreli oy]</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-200 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Önceki
            </button>

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
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-black text-white'
                        : 'text-neutral-500 hover:bg-neutral-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-200 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki
            </button>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-8 pt-6 border-t border-neutral-100">
          <div className="bg-neutral-50 px-5 py-4 space-y-3">
            <h3 className="text-xs font-bold text-black">Şeffaflık Hakkında</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Bu sayfa, platformda gerçekleşen tüm işlemleri şeffaf bir şekilde listeler.
              Her işlem benzersiz bir kriptografik hash ile tanımlanır ve değiştirilemez.
              Kullanıcı kimlikleri anonim hash&apos;ler ile gösterilir —
              hiçbir kişisel veri açığa çıkmaz.
            </p>
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-black">İşlem Türleri</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-neutral-500">
                <div><strong className="text-neutral-700">Oy</strong> — İlk kez oy vermek</div>
                <div><strong className="text-neutral-700">Değişiklik</strong> — Oyu başka partiye taşımak</div>
                <div><strong className="text-neutral-700">Devir</strong> — Önceki turdan otomatik devir</div>
                <div><strong className="text-neutral-700">Kayıt</strong> — Yeni hesap oluşturma</div>
                <div><strong className="text-neutral-700">Oy Silme</strong> — Hesap silindiğinde oyun kaldırılması</div>
                <div><strong className="text-neutral-700">Hesap Silme</strong> — Kullanıcı hesabının silinmesi</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-black">Şüpheli Hesap Tespiti</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Aynı cihazdan birden fazla hesap oluşturulduğu tespit edildiğinde, ilgili tüm hesaplar
                otomatik olarak şüpheli işaretlenir ve oyları geçersiz sayılır. Bu hesaplar katılımcı
                sayısına dahil edilmez. Şüpheli hesap sayısı şeffaflık gereği üstte gösterilir.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TxDetail({ tx }: { tx: Transaction }) {
  if (tx.type === 'KAYIT') {
    return (
      <span>
        {tx.city && <span className="text-neutral-800 font-medium">{tx.city}</span>}
        {tx.city && <span className="text-neutral-300 mx-1.5">·</span>}
        <span className="text-neutral-400">Yeni hesap</span>
      </span>
    );
  }

  if (tx.type === 'OY_KULLANIM') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="text-neutral-800 font-medium">{tx.city}</span>
            <span className="text-neutral-300">·</span>
          </>
        )}
        <span className="w-2.5 h-2.5 inline-block flex-shrink-0" style={{ backgroundColor: tx.partyColor || '#555' }} />
        <span className="font-medium text-neutral-800">{tx.party}</span>
      </span>
    );
  }

  if (tx.type === 'OY_DEVIR') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="text-neutral-800 font-medium">{tx.city}</span>
            <span className="text-neutral-300">·</span>
          </>
        )}
        <span className="w-2.5 h-2.5 inline-block flex-shrink-0" style={{ backgroundColor: tx.partyColor || '#555' }} />
        <span className="font-medium text-neutral-800">{tx.party}</span>
        <span className="text-neutral-400 text-xs">devir</span>
      </span>
    );
  }

  if (tx.type === 'OY_DEGISIKLIK') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="text-neutral-800 font-medium">{tx.city}</span>
            <span className="text-neutral-300">·</span>
          </>
        )}
        <span className="w-2.5 h-2.5 inline-block flex-shrink-0" style={{ backgroundColor: tx.oldPartyColor || '#555' }} />
        <span className="text-neutral-400 line-through">{tx.oldParty}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-neutral-300 flex-shrink-0">
          <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
        <span className="w-2.5 h-2.5 inline-block flex-shrink-0" style={{ backgroundColor: tx.newPartyColor || '#555' }} />
        <span className="font-medium text-neutral-800">{tx.newParty}</span>
      </span>
    );
  }

  if (tx.type === 'OY_SILME') {
    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {tx.city && (
          <>
            <span className="text-neutral-800 font-medium">{tx.city}</span>
            <span className="text-neutral-300">·</span>
          </>
        )}
        {tx.party ? (
          <>
            <span className="w-2.5 h-2.5 inline-block flex-shrink-0" style={{ backgroundColor: tx.partyColor || '#555' }} />
            <span className="font-medium text-neutral-800">{tx.party}</span>
          </>
        ) : (
          <span className="text-neutral-400">[şifreli oy]</span>
        )}
        <span className="text-neutral-400 text-xs">silindi</span>
      </span>
    );
  }

  if (tx.type === 'HESAP_SILME') {
    return (
      <span>
        {tx.city && <span className="text-neutral-800 font-medium">{tx.city}</span>}
        {tx.city && <span className="text-neutral-300 mx-1.5">·</span>}
        <span className="text-neutral-400">Hesap silindi</span>
      </span>
    );
  }

  return null;
}
