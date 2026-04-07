'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { LogOut, User } from 'lucide-react';

interface AdminTopbarProps {
  adminName: string;
  onLogout: () => void;
}

const BREADCRUMB_MAP: Record<string, string> = {
  '/admin': 'Genel Bakış',
  '/admin/users': 'Kullanıcılar',
  '/admin/votes': 'Oylar',
  '/admin/rounds': 'Turlar',
  '/admin/parties': 'Partiler',
  '/admin/reference-data': 'Referans Verisi',
  '/admin/weighting': 'Ağırlıklandırma',
  '/admin/settings': 'Ayarlar',
  '/admin/logs': 'Günlükler',
  '/admin/voter-counts': 'Seçmen Sayıları',
  '/admin/auth-logs': 'Auth Günlükleri',
  '/admin/audit-log': 'Denetim Kaydı',
};

export default function AdminTopbar({ adminName, onLogout }: AdminTopbarProps) {
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href?: string }[] = [];

  if (segments.length >= 2) {
    // /admin is always first
    breadcrumbs.push({ label: 'Admin', href: '/admin' });

    if (segments.length === 2) {
      // e.g. /admin/users
      const path = `/${segments.join('/')}`;
      breadcrumbs.push({ label: BREADCRUMB_MAP[path] || segments[1] });
    } else if (segments.length >= 3) {
      // e.g. /admin/users/123
      const parentPath = `/${segments[0]}/${segments[1]}`;
      breadcrumbs.push({
        label: BREADCRUMB_MAP[parentPath] || segments[1],
        href: parentPath,
      });
      breadcrumbs.push({ label: `#${segments[2]}` });
    }
  }

  return (
    <header className="h-12 border-b border-border bg-background flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <BreadcrumbItem key={i}>
                  {i > 0 && <BreadcrumbSeparator />}
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <User className="size-3.5" data-icon="inline-start" />
            {adminName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onLogout} className="text-muted-foreground">
            <LogOut className="size-3.5" />
            Çıkış Yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
