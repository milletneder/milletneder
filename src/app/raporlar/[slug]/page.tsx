'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';
import { table } from '@/lib/ui';
import type { PartyInfo } from '@/lib/parties';

const StaticTurkeyMap = dynamic(() => import('@/components/map/StaticTurkeyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-neutral-50 flex items-center justify-center" style={{ aspectRatio: '2.5 / 1' }}>
      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Report {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  report_data: any;
  published_at: string | null;
}

export default function ReportDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [report, setReport] = useState<Report | null>(null);
  const [dbParties, setDbParties] = useState<PartyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;

    // Rapor ve parti bilgilerini paralel çek
    Promise.all([
      fetch(`/api/reports/${slug}`).then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      }),
      fetch('/api/parties').then((r) => r.ok ? r.json() : { parties: [] }),
    ])
      .then(([reportData, partiesData]) => {
        setReport(reportData.report);
        // DB formatını PartyInfo formatına çevir
        const mapped = (partiesData.parties || []).map((p: any) => ({
          id: p.slug,
          name: p.name,
          shortName: p.short_name,
          color: p.color,
          textColor: p.text_color,
        }));
        setDbParties(mapped);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <div className="max-w-3xl mx-auto px-6 pb-16 text-sm text-neutral-400">
            Yükleniyor...
          </div>
        </main>
      </>
    );
  }

  if (error || !report) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <div className="max-w-3xl mx-auto px-6 pb-16">
            <p className="text-sm text-neutral-500 mb-4">Rapor bulunamadı</p>
            <Link href="/raporlar" className="text-sm text-black underline">
              Raporlara dön
            </Link>
          </div>
        </main>
      </>
    );
  }

  const d = report.report_data;

  // DB'den gelen parti bilgileri ile slug → kısa ad eşleştirmesi
  const slugToShortName: Record<string, string> = {};
  const slugToColor: Record<string, string> = {};
  for (const p of dbParties) {
    slugToShortName[p.id] = p.shortName;
    slugToColor[p.id] = p.color;
  }

  // Slug → display name çözümleme (DB'den gelen kısa adları kullanır)
  const resolvePartyName = (raw: string): string => {
    if (!raw || raw === '-') return raw;
    // DB'den gelen kısa adı kullan
    if (slugToShortName[raw]) return slugToShortName[raw];
    return raw; // Zaten çözümlenmiş isim
  };

  // Parti verileri — seed data formatı: { party, shortName, votes, percentage, color }
  const parties = (d.parties || []) as any[];
  const sortedParties = [...parties].sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
  const maxVotes = sortedParties[0]?.votes || 1;

  // Şehir verileri — seed data formatı: { city, total_votes, first_party, first_pct, second_party, second_pct }
  const cities = (d.cities || []) as any[];

  // Yaş verileri — seed data formatı: { bracket, total_votes, distribution: [{ party, pct }] }
  const ageGroups = (d.age_groups || []) as any[];

  // Gelir verileri — aynı format
  const incomeGroups = (d.income_groups || []) as any[];

  // Oy değişim — seed data formatı: { total_changers, change_rate_pct, flows: [{ from, to, count }] }
  const voteChanges = d.vote_changes || {};
  const flows = (voteChanges.flows || []) as any[];

  // Şeffaflık — seed data formatı: { total_votes, valid_votes, invalid_votes, clean_rate_pct }
  const transparency = d.transparency || {};

  // Özet — seed data formatı: { total_votes, valid_votes, invalid_votes, participating_cities }
  const summary = d.summary || {};

  // Parti renkleri lookup — slug, kısa ad ve uzun isim hepsiyle eşle
  const partyColorMap: Record<string, string> = {};
  // Önce DB'den gelen renkler
  for (const p of dbParties) {
    partyColorMap[p.id] = p.color;        // slug: 'ak-parti'
    partyColorMap[p.shortName] = p.color;  // kısa ad: 'AK Parti'
    partyColorMap[p.name] = p.color;       // uzun ad: 'AK Parti'
  }
  // Rapor JSONB'sindeki renkleri de ekle
  parties.forEach((p: any) => {
    if (p.party) partyColorMap[p.party] = p.color;
    if (p.shortName) partyColorMap[p.shortName] = p.color;
    if (p.name) partyColorMap[p.name] = p.color;
  });
  if (!partyColorMap['Diğer']) partyColorMap['Diğer'] = '#555555';

  return (
    <>
      <Header />
      <main className="pt-12 min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <PageHero
            title={report.title}
            subtitle={report.summary || undefined}
            backLink={{ href: '/raporlar', label: 'Tüm Raporlar' }}
            stats={[
              { label: 'Toplam Oy', value: (summary.total_votes || transparency.total_votes || 0).toLocaleString('tr-TR') },
              { label: 'Geçerli Oy', value: (summary.valid_votes || transparency.valid_votes || 0).toLocaleString('tr-TR') },
              { label: 'Katılan İl', value: summary.participating_cities || cities.length || 0 },
              { label: 'Temiz Oy Oranı', value: `%${(transparency.clean_rate_pct || 100).toFixed(1)}` },
            ]}
          />

          {/* Harita */}
          {cities.length > 0 && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-4">İl Bazlı Harita</h2>
              <StaticTurkeyMap
                cityColors={cities.map((city: any) => ({
                  cityName: city.city,
                  color: partyColorMap[city.first_party] || partyColorMap[resolvePartyName(city.first_party)] || '#e5e5e5',
                  party: resolvePartyName(city.first_party),
                  percentage: city.first_pct,
                }))}
              />
              <div className="flex flex-wrap gap-3 mt-8">
                {sortedParties.slice(0, 8).map((p: any) => (
                  <div key={p.shortName || p.party} className="flex items-center gap-1.5 text-xs text-neutral-600">
                    <div className="w-2.5 h-2.5" style={{ backgroundColor: p.color }} />
                    {resolvePartyName(p.shortName || p.party)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Parti Sonuçları */}
          {sortedParties.length > 0 && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-6">Parti Sonuçları</h2>
              <div className="space-y-3">
                {sortedParties.map((party: any) => (
                  <div key={party.party || party.shortName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3" style={{ backgroundColor: party.color }} />
                        <span className="text-black font-medium text-sm">
                          {resolvePartyName(party.shortName || party.party)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-black font-bold text-sm tabular-nums">
                          %{(party.percentage || 0).toFixed(1)}
                        </span>
                        <span className="text-neutral-400 text-xs tabular-nums">
                          {(party.votes || 0).toLocaleString('tr-TR')} oy
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-100 h-5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          backgroundColor: party.color,
                          width: `${((party.votes || 0) / maxVotes) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ağırlıklı Sonuçlar */}
          {d.weighted && d.weighted.parties?.length > 0 && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-2">Ağırlıklı Sonuçlar</h2>
              <p className="text-xs text-neutral-400 mb-6">
                Demografik ağırlıklandırma uygulanmış sonuçlar. Hata payı: ±{(d.weighted.confidence?.marginOfError || 0).toFixed(1)} puan
              </p>
              <div className="space-y-3 mb-6">
                {[...d.weighted.parties]
                  .sort((a: any, b: any) => (b.weightedPct || 0) - (a.weightedPct || 0))
                  .map((wp: any) => {
                    const color = partyColorMap[wp.party] || slugToColor[wp.party] || '#555';
                    const name = resolvePartyName(wp.party);
                    return (
                      <div key={wp.party}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3" style={{ backgroundColor: color }} />
                            <span className="text-black font-medium text-sm">{name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-black font-bold text-sm tabular-nums">
                              %{(wp.weightedPct || 0).toFixed(1)}
                            </span>
                            {wp.delta != null && wp.delta !== 0 && (
                              <span className={`text-xs tabular-nums ${wp.delta > 0 ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                {wp.delta > 0 ? '+' : ''}{wp.delta.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-neutral-100 h-5 overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              backgroundColor: color,
                              width: `${(wp.weightedPct || 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
              {d.weighted.confidence && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-neutral-200 p-3 text-center">
                    <div className="text-xl font-bold text-black">{d.weighted.confidence.overall?.toFixed(0) || '-'}/100</div>
                    <div className="text-[11px] text-neutral-400 mt-1">Güven Skoru</div>
                  </div>
                  <div className="border border-neutral-200 p-3 text-center">
                    <div className="text-xl font-bold text-black">±{(d.weighted.confidence.marginOfError || 0).toFixed(1)}</div>
                    <div className="text-[11px] text-neutral-400 mt-1">Hata Payı</div>
                  </div>
                  <div className="border border-neutral-200 p-3 text-center">
                    <div className="text-xl font-bold text-black">{(d.weighted.sampleSize || 0).toLocaleString('tr-TR')}</div>
                    <div className="text-[11px] text-neutral-400 mt-1">Ham Örneklem</div>
                  </div>
                  <div className="border border-neutral-200 p-3 text-center">
                    <div className="text-xl font-bold text-black">{(d.weighted.effectiveSampleSize || 0).toLocaleString('tr-TR')}</div>
                    <div className="text-[11px] text-neutral-400 mt-1">Efektif Örneklem</div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 3. İl Bazlı Kırılım */}
          {cities.length > 0 && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-6">İl Bazlı Kırılım</h2>
              <div className={table.container}>
                <table className="w-full">
                  <thead className={table.head}>
                    <tr>
                      <th className={table.th}>İl</th>
                      <th className={table.th}>1. Parti</th>
                      <th className={table.th}>Oran</th>
                      <th className={table.th}>2. Parti</th>
                      <th className={table.th}>Toplam Oy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cities.slice(0, 20).map((city: any) => (
                      <tr key={city.city} className={table.row}>
                        <td className={`${table.td} font-medium`}>{city.city}</td>
                        <td className={table.td}>{resolvePartyName(city.first_party)}</td>
                        <td className={`${table.td} tabular-nums`}>%{(city.first_pct || 0).toFixed(1)}</td>
                        <td className={table.td}>{resolvePartyName(city.second_party)}</td>
                        <td className={`${table.td} tabular-nums`}>
                          {(city.total_votes || 0).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 4. Yaş Grubu Analizi */}
          {ageGroups.length > 0 && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-6">Yaş Grubu Analizi</h2>
              <div className="space-y-4">
                {ageGroups.map((group: any) => {
                  const dist = (group.distribution || group.parties || []) as any[];
                  return (
                    <div key={group.bracket}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-black">{group.bracket}</span>
                        <span className="text-xs text-neutral-400">
                          {(group.total_votes || 0).toLocaleString('tr-TR')} oy
                        </span>
                      </div>
                      <div className="flex h-5 overflow-hidden bg-neutral-100">
                        {dist.map((p: any, i: number) => (
                          <div
                            key={i}
                            className="h-full"
                            style={{
                              backgroundColor: partyColorMap[p.party || p.name] || '#999',
                              width: `${p.pct || p.percentage || 0}%`,
                            }}
                            title={`${resolvePartyName(p.party || p.name)}: %${(p.pct || p.percentage || 0).toFixed(1)}`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {dist.map((p: any, i: number) => (
                          <div key={i} className="flex items-center gap-1 text-[11px] text-neutral-500">
                            <div className="w-2 h-2" style={{ backgroundColor: partyColorMap[p.party || p.name] || '#999' }} />
                            {resolvePartyName(p.party || p.name)} %{(p.pct || p.percentage || 0).toFixed(1)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. Gelir Grubu Analizi */}
          {incomeGroups.length > 0 && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-6">Gelir Grubu Analizi</h2>
              <div className="space-y-4">
                {incomeGroups.map((group: any) => {
                  const dist = (group.distribution || group.parties || []) as any[];
                  return (
                    <div key={group.bracket}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-black">{group.bracket}</span>
                        <span className="text-xs text-neutral-400">
                          {(group.total_votes || 0).toLocaleString('tr-TR')} oy
                        </span>
                      </div>
                      <div className="flex h-5 overflow-hidden bg-neutral-100">
                        {dist.map((p: any, i: number) => (
                          <div
                            key={i}
                            className="h-full"
                            style={{
                              backgroundColor: partyColorMap[p.party || p.name] || '#999',
                              width: `${p.pct || p.percentage || 0}%`,
                            }}
                            title={`${resolvePartyName(p.party || p.name)}: %${(p.pct || p.percentage || 0).toFixed(1)}`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {dist.map((p: any, i: number) => (
                          <div key={i} className="flex items-center gap-1 text-[11px] text-neutral-500">
                            <div className="w-2 h-2" style={{ backgroundColor: partyColorMap[p.party || p.name] || '#999' }} />
                            {resolvePartyName(p.party || p.name)} %{(p.pct || p.percentage || 0).toFixed(1)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 6. Oy Değişim Akışları */}
          {flows.length > 0 && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-2">Oy Değişim Akışları</h2>
              {voteChanges.total_changers && (
                <p className="text-sm text-neutral-500 mb-6">
                  Toplam {voteChanges.total_changers.toLocaleString('tr-TR')} kişi oy değiştirdi
                  (oyların %{(voteChanges.change_rate_pct || 0).toFixed(1)}&apos;i)
                </p>
              )}
              <div className={table.container}>
                <table className="w-full">
                  <thead className={table.head}>
                    <tr>
                      <th className={table.th}>Kimden</th>
                      <th className={table.th}></th>
                      <th className={table.th}>Kime</th>
                      <th className={table.th}>Kişi Sayısı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flows.map((flow: any, i: number) => (
                      <tr key={i} className={table.row}>
                        <td className={`${table.td} font-medium`}>{resolvePartyName(flow.from)}</td>
                        <td className={`${table.td} text-neutral-400`}>&rarr;</td>
                        <td className={`${table.td} font-medium`}>{resolvePartyName(flow.to)}</td>
                        <td className={`${table.td} tabular-nums`}>
                          {(flow.count || 0).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 7. Şeffaflık Raporu */}
          {transparency.total_votes && (
            <section className="border-t border-neutral-100 py-8">
              <h2 className="text-lg font-bold text-black mb-6">Şeffaflık Raporu</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-neutral-200 p-4 text-center">
                  <div className="text-2xl font-bold tabular-nums text-black">
                    {(transparency.total_votes || 0).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-1">Toplam Oy</div>
                </div>
                <div className="border border-neutral-200 p-4 text-center">
                  <div className="text-2xl font-bold tabular-nums text-black">
                    {(transparency.valid_votes || 0).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-1">Geçerli Oy</div>
                </div>
                <div className="border border-neutral-200 p-4 text-center">
                  <div className="text-2xl font-bold tabular-nums text-black">
                    {(transparency.invalid_votes || 0).toLocaleString('tr-TR')}
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-1">Geçersiz Oy</div>
                </div>
                <div className="border border-neutral-200 p-4 text-center">
                  <div className="text-2xl font-bold tabular-nums text-black">
                    %{(transparency.clean_rate_pct || 100).toFixed(1)}
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-1">Temiz Oy Oranı</div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
