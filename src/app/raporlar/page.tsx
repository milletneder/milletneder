'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface ReportSummary {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  view_count: number | null;
  published_at: string | null;
  total_votes: number | null;
}

export default function RaporlarPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
          <PageHero
            title="Aylık Raporlar"
            subtitle="Her ayın sonunda yayınlanan detaylı seçim analizi raporları."
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="px-6 py-12 text-center text-muted-foreground text-sm">
                Henüz yayınlanmış rapor yok.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/raporlar/${report.slug}`}
                  className="block group"
                >
                  <Card className="hover:border-foreground/20 transition-colors">
                    <CardContent className="p-6">
                      <h2 className="text-base font-bold mb-2 group-hover:underline">
                        {report.title}
                      </h2>
                      {report.summary && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {report.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {report.total_votes != null && (
                          <span>{report.total_votes.toLocaleString('tr-TR')} oy</span>
                        )}
                        {report.view_count != null && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>{report.view_count.toLocaleString('tr-TR')} görüntülenme</span>
                          </>
                        )}
                        {report.published_at && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>
                              {new Date(report.published_at).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
