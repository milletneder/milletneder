'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Vote,
  CalendarDays,
  Flag,
  Database,
  Scale,
  Settings,
  ScrollText,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Ana',
    items: [
      { href: '/admin', label: 'Genel Bakış', icon: LayoutDashboard },
      { href: '/admin/users', label: 'Kullanıcılar', icon: Users },
      { href: '/admin/votes', label: 'Oylar', icon: Vote },
      { href: '/admin/rounds', label: 'Turlar', icon: CalendarDays },
    ],
  },
  {
    label: 'Veri Yönetimi',
    items: [
      { href: '/admin/parties', label: 'Partiler', icon: Flag },
      { href: '/admin/reference-data', label: 'Referans Verisi', icon: Database },
      { href: '/admin/weighting', label: 'Ağırlıklandırma', icon: Scale },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/admin/settings', label: 'Ayarlar', icon: Settings },
      { href: '/admin/logs', label: 'Günlükler', icon: ScrollText },
    ],
  },
];

export default function AdminSidebarComponent() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-sm font-bold">milletneder</span>
          <Badge variant="outline" className="text-xs">Admin</Badge>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Yönetim Paneli
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
