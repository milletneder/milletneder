'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDashboard } from './PartyDashboardProvider';
import { usePartyAuth } from '@/lib/auth/PartyAuthContext';
import {
  LayoutDashboard,
  Map,
  Swords,
  UserSearch,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  Compass,
  Target,
  Sliders,
  BarChart3,
  Bell,
  FileText,
  FileEdit,
  ExternalLink,
  LogOut,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: 'genel-bakis', label: 'Genel Bakis', icon: LayoutDashboard },
  { href: 'harita', label: 'Harita', icon: Map },
  { href: 'rakipler', label: 'Rakipler', icon: Swords },
  { href: 'secmen-profili', label: 'Secmen Profili', icon: UserSearch },
  { href: 'kayip-kazanc', label: 'Kayip / Kazanc', icon: ArrowLeftRight },
  { href: 'zayif-noktalar', label: 'Zayif Noktalar', icon: TrendingDown },
  { href: 'guclu-noktalar', label: 'Guclu Noktalar', icon: TrendingUp },
  { href: 'bolgesel', label: 'Bolgesel', icon: Compass },
  { href: 'swing', label: 'Swing Secmen', icon: Target },
  { href: 'agirliklandirma', label: 'Agirliklandirma', icon: Sliders },
  { href: 'projeksiyon', label: 'Projeksiyon', icon: BarChart3 },
  { href: 'uyarilar', label: 'Uyarilar', icon: Bell },
  { href: 'pdf-rapor', label: 'PDF Rapor', icon: FileText },
  { href: 'ozel-rapor', label: 'Ozel Rapor', icon: FileEdit },
];

interface ShellProps {
  children: React.ReactNode;
}

export function PartyDashboardShell({ children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { source, partyInfo } = useDashboard();
  const { account, logout } = usePartyAuth();

  async function handleLogout() {
    await logout();
    router.replace('/parti/giris');
  }

  // Base path: /parti veya /demo/parti
  const basePath = source.kind === 'demo' ? '/demo/parti' : '/parti';

  // "Genel Bakis" icin index path (href bos olabilir)
  const resolveHref = (href: string) => {
    if (href === 'genel-bakis') return basePath;
    return `${basePath}/${href}`;
  };

  const isActive = (href: string) => {
    const resolved = resolveHref(href);
    if (href === 'genel-bakis') return pathname === basePath;
    return pathname === resolved || pathname.startsWith(resolved + '/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl flex h-14 items-center px-4 lg:px-6 gap-3">
          <Link href="/" className="font-semibold text-sm whitespace-nowrap">
            #milletneder
          </Link>
          <Badge variant="outline" className="text-xs">
            Parti Paneli
          </Badge>
          {source.kind === 'demo' && (
            <Badge variant="secondary" className="text-xs">
              Demo Modu
            </Badge>
          )}
          {partyInfo?.name && (
            <span className="hidden md:inline text-xs text-muted-foreground truncate">
              {partyInfo.name}
            </span>
          )}
          <div className="flex-1" />
          {source.kind === 'auth' ? (
            <div className="flex items-center gap-3">
              {account?.email && (
                <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[180px]">
                  {account.email}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="size-3.5" />
                Cikis
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:iletisim@milletneder.com">
                Tam Hesap <ExternalLink className="size-3" />
              </a>
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl flex min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r bg-background py-4 px-3 shrink-0">
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              if (item.comingSoon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                      Yakinda
                    </Badge>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={resolveHref(item.href)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav (horizontal scroll) */}
        <div className="md:hidden border-b overflow-x-auto sticky top-14 z-30 bg-background">
          <div className="flex gap-1 px-4 py-2 whitespace-nowrap">
            {NAV_ITEMS.filter((i) => !i.comingSoon).map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={resolveHref(item.href)}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 py-6 px-4 lg:px-8">
          {children}
        </main>
      </div>

      {/* Demo footer CTA */}
      {source.kind === 'demo' && (
        <footer className="border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 lg:px-6 py-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Bu panel demo modundadir - gercek veri gosterir, tam ozellikli surumdur.</span>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:iletisim@milletneder.com">Abone Ol</a>
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
