'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PageHero from '@/components/layout/PageHero';

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
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
          <PageHero
            title="Aylık Raporlar"
            subtitle="Her ayın sonunda yayınlanan detaylı seçim analizi raporları."
          />

          {loading ? (
            <div className="text-sm text-neutral-400">Yükleniyor...</div>
          ) : reports.length === 0 ? (
            <div className="border border-neutral-200 px-6 py-12 text-center text-neutral-400 text-sm">
              Henüz yayınlanmış rapor yok.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/raporlar/${report.slug}`}
                  className="block border border-neutral-200 p-6 hover:border-black transition-colors group"
                >
                  <h2 className="text-base font-bold text-black mb-2 group-hover:underline">
                    {report.title}
                  </h2>
                  {report.summary && (
                    <p className="text-sm text-neutral-500 mb-4 line-clamp-3">
                      {report.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                    {report.total_votes != null && (
                      <span>{report.total_votes.toLocaleString('tr-TR')} oy</span>
                    )}
                    {report.view_count != null && (
                      <>
                        <span className="text-neutral-200">|</span>
                        <span>{report.view_count.toLocaleString('tr-TR')} görüntülenme</span>
                      </>
                    )}
                    {report.published_at && (
                      <>
                        <span className="text-neutral-200">|</span>
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
