'use client';

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CodeIcon,
  DownloadIcon,
  TableIcon,
  ArchiveIcon,
  TrendingUpIcon,
  CodeXmlIcon,
  ScaleIcon,
} from 'lucide-react';

const TOOLS = [
  {
    href: '/arastirmaci/api',
    icon: CodeIcon,
    title: 'API Erisimi',
    description:
      'JSON API ile anket verilerine programatik erisim. JWT kimlik dogrulama, rate limit bilgisi ve kod ornekleri.',
    available: true,
  },
  {
    href: '/arastirmaci/export',
    icon: DownloadIcon,
    title: 'CSV/Excel Export',
    description:
      'Parti sonuclari, il kirilimi, demografik dagilim ve ilce verilerini CSV formatinda indirin.',
    available: true,
  },
  {
    href: '/arastirmaci/capraz-tablo',
    icon: TableIcon,
    title: 'Capraz Tablo',
    description:
      'Il, yas, cinsiyet, egitim ve gelir boyutlarini parti sonuclariyla capraz tablolayarak analiz edin.',
    available: true,
  },
  {
    href: '/arastirmaci/arsiv',
    icon: ArchiveIcon,
    title: 'Arsiv',
    description:
      'Gecmis turlarin tum sonuclarina erisin, turlar arasi karsilastirma yapin.',
    available: true,
  },
  {
    href: '/arastirmaci/trend',
    icon: TrendingUpIcon,
    title: 'Trend Olusturucu',
    description:
      'Ozel trend grafikleri olusturun. Parti, il veya demografik boyutlarda zaman serisi analizi.',
    available: false,
  },
  {
    href: '/arastirmaci/embed',
    icon: CodeXmlIcon,
    title: 'Embed Widget',
    description:
      'Web sitenize milletneder sonuclarini gosteren bir widget ekleyin. Otomatik guncellenen iframe kodu.',
    available: false,
  },
  {
    href: '/arastirmaci/agirliklandirma',
    icon: ScaleIcon,
    title: 'Agirliklandirma Seffafligi',
    description:
      'Agirliklandirma metodolojisini, parametreleri ve ham/agirlikli sonuc farklarini inceleyin.',
    available: false,
  },
];

export default function ArastirmaciOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Arastirmaci Paneli
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Anket verilerine erisim, analiz ve export araclari.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.href}
              className={`relative ${!tool.available ? 'opacity-60' : ''}`}
            >
              {!tool.available && (
                <Badge
                  variant="outline"
                  className="absolute right-4 top-4 text-[10px]"
                >
                  Yakinda
                </Badge>
              )}
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
                  <Icon className="h-4 w-4 text-neutral-700" />
                </div>
                <CardTitle className="text-base">{tool.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tool.available ? (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={tool.href}>Ac</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Yakinda
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
