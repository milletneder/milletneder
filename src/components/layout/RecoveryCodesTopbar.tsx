'use client';
import { useState, useEffect } from 'react';
import RecoveryCodesModal from '@/components/auth/RecoveryCodesModal';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

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
      <div className="bg-primary border-b border-primary/80">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/70 flex items-center gap-2">
            <ShieldAlert className="size-3.5 shrink-0" />
            <span>
              <span className="text-primary-foreground font-medium">Oy tercihiniz henüz koruma altında değil.</span>
              {' '}Kurtarma kodlarınızı kaydederek oyunuzu korumaya alın.
            </span>
          </p>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setShowModal(true)}
          >
            Oyumu Korumaya Al
          </Button>
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
