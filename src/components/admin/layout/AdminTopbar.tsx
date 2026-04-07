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
import { usePathname } from 'next/navigation';

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

export default function AdminTopbar() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href?: string }[] = [];

  if (segments.length >= 2) {
    breadcrumbs.push({ label: 'Admin', href: '/admin' });

    if (segments.length === 2) {
      const path = `/${segments.join('/')}`;
      breadcrumbs.push({ label: BREADCRUMB_MAP[path] || segments[1] });
    } else if (segments.length >= 3) {
      const parentPath = `/${segments[0]}/${segments[1]}`;
      breadcrumbs.push({
        label: BREADCRUMB_MAP[parentPath] || segments[1],
        href: parentPath,
      });
      breadcrumbs.push({ label: `#${segments[2]}` });
    }
  }

  return (
    <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
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
    </header>
  );
}
