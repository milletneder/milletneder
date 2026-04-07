'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import RecoveryCodesModal from './RecoveryCodesModal';

export default function RecoveryCodesSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setShowModal(true)}>
        <ShieldCheck className="size-4 mr-1.5" />
        Kurtarma Kodlarını Yönet
      </Button>

      {showModal && (
        <RecoveryCodesModal
          codes={[]}
          showRegenerateFlow
          onConfirm={async () => {
            const token = localStorage.getItem('token');
            if (token) {
              await fetch('/api/user/confirm-recovery-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              });
            }
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
