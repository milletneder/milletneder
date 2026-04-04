'use client';

import { btn } from '@/lib/ui';

interface AdminTopbarProps {
  adminName: string;
  onLogout: () => void;
}

export default function AdminTopbar({ adminName, onLogout }: AdminTopbarProps) {
  return (
    <header className="h-12 border-b border-neutral-200 bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-600">{adminName}</span>
        <button
          onClick={onLogout}
          className={btn.small}
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
