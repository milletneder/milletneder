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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  LogOut,
  ChevronsUpDown,
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

interface AdminSidebarProps {
  adminName?: string;
  adminEmail?: string;
  onLogout?: () => void;
}

export default function AdminSidebarComponent({ adminName, adminEmail, onLogout }: AdminSidebarProps) {
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {adminName?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">{adminName || 'Admin'}</span>
                      <span className="text-xs text-muted-foreground truncate">{adminEmail || ''}</span>
                    </div>
                  </div>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuItem onClick={onLogout} className="text-muted-foreground">
                  <LogOut className="size-3.5" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
