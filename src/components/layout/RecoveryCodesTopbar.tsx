'use client';
import { useState, useEffect } from 'react';
import RecoveryCodesModal from '@/components/auth/RecoveryCodesModal';

interface RecoveryCodesTopbarProps {
  codes?: string[];
}

export default function RecoveryCodesTopbar({ codes: initialCodes }: RecoveryCodesTopbarProps) {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [codes, setCodes] = useState<string[]>(initialCodes || []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const controller = new AbortController();
    fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.user) return;
        const u = data.user;
        if (
          u.vote_encryption_version === 1 &&
          !u.recovery_codes_confirmed
        ) {
          setVisible(true);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (initialCodes && initialCodes.length > 0) {
      setCodes(initialCodes);
      setShowModal(true);
      setVisible(true);
    }
  }, [initialCodes]);

  const handleConfirm = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      await fetch('/api/user/confirm-recovery-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    }
    setShowModal(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="bg-black border-b border-neutral-800">
        <div className="max-w-screen-2xl mx-auto px-6 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-300 flex-1">
            <span className="text-white font-medium">Oy tercihiniz henüz şifrelenmedi.</span>
            {' '}Kurtarma kodlarınızı kaydederek oyunuzu şifreleyin.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-bold text-black bg-white hover:bg-neutral-200 px-3 py-1 transition-colors whitespace-nowrap"
          >
            Oyumu Şifrele
          </button>
        </div>
      </div>

      {showModal && (
        <RecoveryCodesModal
          codes={codes}
          onConfirm={handleConfirm}
          onClose={() => setShowModal(false)}
          showRegenerateFlow={codes.length === 0}
        />
      )}
    </>
  );
}
