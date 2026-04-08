'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { FEATURES } from '@/lib/billing/features';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboardIcon,
  CodeIcon,
  DownloadIcon,
  TableIcon,
  ArchiveIcon,
  TrendingUpIcon,
  CodeXmlIcon,
  ScaleIcon,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/arastirmaci', label: 'Genel Bakis', icon: LayoutDashboardIcon, exact: true },
  { href: '/arastirmaci/api', label: 'API Erisimi', icon: CodeIcon },
  { href: '/arastirmaci/export', label: 'CSV Export', icon: DownloadIcon },
  { href: '/arastirmaci/capraz-tablo', label: 'Capraz Tablo', icon: TableIcon },
  { href: '/arastirmaci/arsiv', label: 'Arsiv', icon: ArchiveIcon },
  { href: '/arastirmaci/trend', label: 'Trend Olusturucu', icon: TrendingUpIcon, disabled: true },
  { href: '/arastirmaci/embed', label: 'Embed Widget', icon: CodeXmlIcon, disabled: true },
  { href: '/arastirmaci/agirliklandirma', label: 'Agirliklandirma', icon: ScaleIcon, disabled: true },
];

export default function ArastirmaciLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn } = useAuth();
  const { allowed } = useFeature(FEATURES.API_ACCESS);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/giris?redirect=/arastirmaci');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  if (!allowed) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-lg px-4 py-16">
          <UpgradePrompt
            feature={FEATURES.API_ACCESS}
            title="Arastirmaci Paneli"
            description="API erisimi, CSV export, capraz tablo ve daha fazlasi icin Arastirmaci planina yukseltmeniz gerekiyor."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <nav className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-20 space-y-1">
              <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Arastirmaci Paneli
              </p>
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <div
                      key={item.href}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-400 cursor-not-allowed"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                        Yakinda
                      </Badge>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-neutral-100 font-medium text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile Navigation */}
          <div className="mb-4 w-full overflow-x-auto md:hidden">
            <div className="flex gap-1 pb-2">
              {NAV_ITEMS.filter((item) => !item.disabled).map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'bg-neutral-100 font-medium text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </>
  );
}
