'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { FEATURES } from '@/lib/billing/features';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard,
  Swords,
  UserSearch,
  ArrowLeftRight,
  Map,
  Target,
  BarChart3,
  Bell,
  FileText,
  FileEdit,
} from 'lucide-react';

const partiNav = [
  { href: '/parti', label: 'Genel Bakis', icon: LayoutDashboard },
  { href: '/parti/rakipler', label: 'Rakipler', icon: Swords },
  { href: '/parti/secmen-profili', label: 'Secmen Profili', icon: UserSearch },
  { href: '/parti/kayip-kazanc', label: 'Kayip/Kazanc', icon: ArrowLeftRight },
  { href: '/parti/harita', label: 'Harita', icon: Map },
  { href: '/parti/swing', label: 'Swing', icon: Target },
  { href: '/parti/projeksiyon', label: 'Projeksiyon', icon: BarChart3 },
  { href: '/parti/uyarilar', label: 'Uyarilar', icon: Bell },
  { href: '/parti/pdf-rapor', label: 'PDF Rapor', icon: FileText },
  { href: '/parti/ozel-rapor', label: 'Ozel Rapor', icon: FileEdit },
];

export default function PartiLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, token } = useAuth();
  const { allowed, tier } = useFeature(FEATURES.PARTY_DASHBOARD);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/giris?redirect=/parti');
      return;
    }
    if (!allowed) {
      router.replace('/ucretler');
      return;
    }
    setChecking(false);
  }, [isLoggedIn, allowed, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  function isActive(href: string) {
    if (href === '/parti') return pathname === '/parti';
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl flex h-14 items-center px-4 lg:px-6">
          <Link href="/" className="mr-4 font-semibold text-sm">
            #milletneder
          </Link>
          <Badge variant="outline" className="text-xs">Parti Paneli</Badge>
          <div className="flex-1" />
          <Link href="/profil" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Profilim
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl flex min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r bg-background py-4 px-3">
          <nav className="flex flex-col gap-0.5">
            {partiNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-neutral-100 text-neutral-900 font-medium dark:bg-neutral-800 dark:text-neutral-50'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-50'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden border-b overflow-x-auto">
          <div className="flex gap-1 px-4 py-2">
            {partiNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    active
                      ? 'bg-neutral-100 text-neutral-900 font-medium dark:bg-neutral-800'
                      : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 py-6 px-4 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
