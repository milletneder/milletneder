'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { PartyInfo } from '@/lib/parties';

const StaticTurkeyMap = dynamic(() => import('@/components/map/StaticTurkeyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-muted flex items-center justify-center rounded-lg" style={{ aspectRatio: '2.5 / 1' }}>
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
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

    Promise.all([
      fetch(`/api/reports/${slug}`).then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      }),
      fetch('/api/parties').then((r) => r.ok ? r.json() : { parties: [] }),
    ])
      .then(([reportData, partiesData]) => {
        setReport(reportData.report);
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
        <main className="min-h-screen">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    );
  }

  if (error || !report) {
    return (
      <>
        <Header />
        <main className="min-h-screen">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
            <p className="text-sm text-muted-foreground mb-4">Rapor bulunamadı</p>
            <Link href="/raporlar" className="text-sm underline">
              Raporlara dön
            </Link>
          </div>
        </main>
      </>
    );
  }

  const d = report.report_data;

  const slugToShortName: Record<string, string> = {};
  const slugToColor: Record<string, string> = {};
  for (const p of dbParties) {
    slugToShortName[p.id] = p.shortName;
    slugToColor[p.id] = p.color;
  }

  const resolvePartyName = (raw: string): string => {
    if (!raw || raw === '-') return raw;
    if (slugToShortName[raw]) return slugToShortName[raw];
    return raw;
  };

  const parties = (d.parties || []) as any[];
  const sortedParties = [...parties].sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
  const maxVotes = sortedParties[0]?.votes || 1;

  const cities = (d.cities || []) as any[];
  const ageGroups = (d.age_groups || []) as any[];
  const incomeGroups = (d.income_groups || []) as any[];

  const voteChanges = d.vote_changes || {};
  const flows = (voteChanges.flows || []) as any[];
  const transparency = d.transparency || {};
  const summary = d.summary || {};

  const partyColorMap: Record<string, string> = {};
  for (const p of dbParties) {
    partyColorMap[p.id] = p.color;
    partyColorMap[p.shortName] = p.color;
    partyColorMap[p.name] = p.color;
  }
  parties.forEach((p: any) => {
    if (p.party) partyColorMap[p.party] = p.color;
    if (p.shortName) partyColorMap[p.shortName] = p.color;
    if (p.name) partyColorMap[p.name] = p.color;
  });
  if (!partyColorMap['Diğer']) partyColorMap['Diğer'] = '#555555';

  return (
    <>
      <Header />
      <main className="pt-12 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
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
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-4">İl Bazlı Harita</h2>
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
                  <div key={p.shortName || p.party} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                    {resolvePartyName(p.shortName || p.party)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Parti Sonuçları */}
          {sortedParties.length > 0 && (
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-6">Parti Sonuçları</h2>
              <div className="space-y-3">
                {sortedParties.map((party: any) => (
                  <div key={party.party || party.shortName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: party.color }} />
                        <span className="font-medium text-sm">
                          {resolvePartyName(party.shortName || party.party)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm tabular-nums">
                          %{(party.percentage || 0).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {(party.votes || 0).toLocaleString('tr-TR')} oy
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted h-5 rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm transition-all duration-700"
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
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-2">Ağırlıklı Sonuçlar</h2>
              <p className="text-xs text-muted-foreground mb-6">
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
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                            <span className="font-medium text-sm">{name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm tabular-nums">
                              %{(wp.weightedPct || 0).toFixed(1)}
                            </span>
                            {wp.delta != null && wp.delta !== 0 && (
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {wp.delta > 0 ? '+' : ''}{wp.delta.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-muted h-5 rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm"
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
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <div className="text-xl font-bold tabular-nums">{d.weighted.confidence.overall?.toFixed(0) || '-'}/100</div>
                      <div className="text-xs text-muted-foreground mt-1">Güven Skoru</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <div className="text-xl font-bold tabular-nums">±{(d.weighted.confidence.marginOfError || 0).toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground mt-1">Hata Payı</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <div className="text-xl font-bold tabular-nums">{(d.weighted.sampleSize || 0).toLocaleString('tr-TR')}</div>
                      <div className="text-xs text-muted-foreground mt-1">Ham Örneklem</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <div className="text-xl font-bold tabular-nums">{(d.weighted.effectiveSampleSize || 0).toLocaleString('tr-TR')}</div>
                      <div className="text-xs text-muted-foreground mt-1">Efektif Örneklem</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </section>
          )}

          {/* 3. İl Bazlı Kırılım */}
          {cities.length > 0 && (
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-6">İl Bazlı Kırılım</h2>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İl</TableHead>
                      <TableHead>1. Parti</TableHead>
                      <TableHead>Oran</TableHead>
                      <TableHead>2. Parti</TableHead>
                      <TableHead>Toplam Oy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cities.slice(0, 20).map((city: any) => (
                      <TableRow key={city.city}>
                        <TableCell className="font-medium">{city.city}</TableCell>
                        <TableCell>{resolvePartyName(city.first_party)}</TableCell>
                        <TableCell className="tabular-nums">%{(city.first_pct || 0).toFixed(1)}</TableCell>
                        <TableCell>{resolvePartyName(city.second_party)}</TableCell>
                        <TableCell className="tabular-nums">
                          {(city.total_votes || 0).toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {/* 4. Yaş Grubu Analizi */}
          {ageGroups.length > 0 && (
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-6">Yaş Grubu Analizi</h2>
              <div className="space-y-4">
                {ageGroups.map((group: any) => {
                  const dist = (group.distribution || group.parties || []) as any[];
                  return (
                    <div key={group.bracket}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{group.bracket}</span>
                        <span className="text-xs text-muted-foreground">
                          {(group.total_votes || 0).toLocaleString('tr-TR')} oy
                        </span>
                      </div>
                      <div className="flex h-5 overflow-hidden bg-muted rounded-sm">
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
                          <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: partyColorMap[p.party || p.name] || '#999' }} />
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
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-6">Gelir Grubu Analizi</h2>
              <div className="space-y-4">
                {incomeGroups.map((group: any) => {
                  const dist = (group.distribution || group.parties || []) as any[];
                  return (
                    <div key={group.bracket}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{group.bracket}</span>
                        <span className="text-xs text-muted-foreground">
                          {(group.total_votes || 0).toLocaleString('tr-TR')} oy
                        </span>
                      </div>
                      <div className="flex h-5 overflow-hidden bg-muted rounded-sm">
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
                          <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: partyColorMap[p.party || p.name] || '#999' }} />
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
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-2">Oy Değişim Akışları</h2>
              {voteChanges.total_changers && (
                <p className="text-sm text-muted-foreground mb-6">
                  Toplam {voteChanges.total_changers.toLocaleString('tr-TR')} kişi oy değiştirdi
                  (oyların %{(voteChanges.change_rate_pct || 0).toFixed(1)}&apos;i)
                </p>
              )}
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kimden</TableHead>
                      <TableHead></TableHead>
                      <TableHead>Kime</TableHead>
                      <TableHead>Kişi Sayısı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flows.map((flow: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{resolvePartyName(flow.from)}</TableCell>
                        <TableCell className="text-muted-foreground">&rarr;</TableCell>
                        <TableCell className="font-medium">{resolvePartyName(flow.to)}</TableCell>
                        <TableCell className="tabular-nums">
                          {(flow.count || 0).toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {/* 7. Şeffaflık Raporu */}
          {transparency.total_votes && (
            <section className="border-t border-border py-8">
              <h2 className="text-lg font-bold mb-6">Şeffaflık Raporu</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold tabular-nums">
                      {(transparency.total_votes || 0).toLocaleString('tr-TR')}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">Toplam Oy</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold tabular-nums">
                      {(transparency.valid_votes || 0).toLocaleString('tr-TR')}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">Geçerli Oy</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold tabular-nums">
                      {(transparency.invalid_votes || 0).toLocaleString('tr-TR')}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">Geçersiz Oy</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold tabular-nums">
                      %{(transparency.clean_rate_pct || 100).toFixed(1)}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">Temiz Oy Oranı</div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
