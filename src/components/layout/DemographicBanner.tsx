'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

const DEMOGRAPHIC_FIELDS = [
  'age_bracket',
  'gender',
  'education',
  'income_bracket',
  'turnout_intention',
  'previous_vote_2023',
] as const;

export default function DemographicBanner() {
  const { isLoggedIn, token } = useAuth();
  const [show, setShow] = useState(false);
  const [missingCount, setMissingCount] = useState(0);

  const checkProfile = useCallback(() => {
    if (!isLoggedIn || !token) return;
    if (sessionStorage.getItem('demo_banner_dismissed')) return;

    fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.user) return;
        const missing = DEMOGRAPHIC_FIELDS.filter(f => !data.user[f]);
        if (missing.length > 0) {
          setMissingCount(missing.length);
          setShow(true);
        } else {
          setShow(false);
        }
      })
      .catch(() => {});
  }, [isLoggedIn, token]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  // Profil güncellendiğinde yeniden kontrol et
  useEffect(() => {
    const handler = () => checkProfile();
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [checkProfile]);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('demo_banner_dismissed', '1');
  };

  return (
    <div className="bg-black border-b border-neutral-800">
      <div className="max-w-screen-2xl mx-auto px-6 py-2 flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-300 flex-1">
          <span className="text-white font-medium">Profilinde {missingCount} eksik bilgi var.</span>
          {' '}Demografik bilgiler anketin doğruluğunu artırır.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/profil"
            className="text-xs font-bold text-black bg-white hover:bg-neutral-200 px-3 py-1 transition-colors whitespace-nowrap"
          >
            Tamamla
          </Link>
          <button
            onClick={dismiss}
            className="text-neutral-500 hover:text-white text-sm leading-none px-1"
            aria-label="Kapat"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
