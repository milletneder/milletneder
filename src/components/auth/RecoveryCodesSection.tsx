'use client';
import { useState } from 'react';
import RecoveryCodesModal from './RecoveryCodesModal';

export default function RecoveryCodesSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-black text-white px-4 py-2.5 text-xs font-medium hover:bg-neutral-800 transition-colors"
      >
        Kurtarma Kodlarını Yönet
      </button>

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
