'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';

const PAGE_TITLES: Record<string, string> = {
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

export function SiteHeader() {
  const pathname = usePathname();

  // Find matching title — try exact match first, then parent path
  const segments = pathname.split('/').filter(Boolean);
  let title = PAGE_TITLES[pathname];
  if (!title && segments.length >= 3) {
    const parentPath = `/${segments[0]}/${segments[1]}`;
    title = PAGE_TITLES[parentPath];
    if (title) title += ` #${segments[2]}`;
  }
  if (!title) title = 'Admin';

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="mx-2 w-px h-4 bg-border shrink-0" />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  );
}

// Keep default export for backward compat
export default SiteHeader;
