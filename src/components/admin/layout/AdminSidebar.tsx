'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/rounds', label: 'Turlar' },
  { href: '/admin/parties', label: 'Partiler' },
  { href: '/admin/users', label: 'Kullanıcılar' },
  { href: '/admin/votes', label: 'Oylar' },
  { href: '/admin/weighting', label: 'Ağırlıklandırma' },
  { href: '/admin/reference-data', label: 'Referans Veriler' },
  { href: '/admin/voter-counts', label: 'Seçmen Sayıları' },
  { href: '/admin/auth-logs', label: 'Auth Logları' },
  { href: '/admin/audit-log', label: 'Denetim Kaydı' },
  { href: '/admin/settings', label: 'Ayarlar' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('admin_sidebar_collapsed', String(next));
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`h-screen border-r border-neutral-200 bg-white flex flex-col transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between px-3 h-12 border-b border-neutral-200">
        {!collapsed && (
          <span className="text-sm font-bold text-black">Admin</span>
        )}
        <button
          onClick={toggleCollapse}
          className="text-black hover:bg-neutral-50 p-1 text-sm"
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed ? '\u00BB' : '\u00AB'}
        </button>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-4 py-2 text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-neutral-100 text-black font-medium'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'
            }`}
            title={collapsed ? item.label : undefined}
          >
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
