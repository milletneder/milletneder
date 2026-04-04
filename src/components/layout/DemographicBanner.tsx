'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import DemographicForm from '@/components/vote/DemographicForm';

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
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parties2023, setParties2023] = useState<Array<{ id: string; name: string; shortName: string; color: string; logoUrl?: string }>>([]);
  const [existingData, setExistingData] = useState<{
    ageBracket?: string;
    incomeBracket?: string;
    gender?: string;
    education?: string;
    turnoutIntention?: string;
    previousVote2023?: string;
  }>({});

  const checkProfile = useCallback(() => {
    if (!isLoggedIn || !token) return;

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
          setExistingData({
            ageBracket: data.user.age_bracket || undefined,
            incomeBracket: data.user.income_bracket || undefined,
            gender: data.user.gender || undefined,
            education: data.user.education || undefined,
            turnoutIntention: data.user.turnout_intention || undefined,
            previousVote2023: data.user.previous_vote_2023 || undefined,
          });
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

  // Partileri yükle (modal açılınca lazım)
  useEffect(() => {
    if (!showModal || parties2023.length > 0) return;
    fetch('/api/parties')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.parties) {
          setParties2023(
            data.parties
              .filter((p: { id: string }) => p.id !== 'karasizim')
              .map((p: { id: string; name: string; shortName: string; color: string; logoUrl?: string }) => ({
                id: p.id, name: p.name, shortName: p.shortName, color: p.color, logoUrl: p.logoUrl,
              }))
          );
        }
      })
      .catch(() => {});
  }, [showModal, parties2023.length]);

  if (!show) return null;

  const handleSave = async (data: {
    ageBracket?: string;
    incomeBracket?: string;
    gender?: string;
    education?: string;
    turnoutIntention?: string;
    previousVote2023?: string;
  }) => {
    setLoading(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age_bracket: data.ageBracket,
          income_bracket: data.incomeBracket,
          gender: data.gender,
          education: data.education,
          turnout_intention: data.turnoutIntention,
          previous_vote_2023: data.previousVote2023,
        }),
      });
      window.dispatchEvent(new Event('profile-updated'));
      setShowModal(false);
      setShow(false);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-black border-b border-neutral-800">
        <div className="max-w-screen-2xl mx-auto px-6 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-300 flex-1">
            <span className="text-white font-medium">Profilinde {missingCount} eksik bilgi var.</span>
            {' '}Demografik bilgiler anketin doğruluğunu artırır.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-bold text-black bg-white hover:bg-neutral-200 px-3 py-1 transition-colors whitespace-nowrap"
          >
            Sonuçları Güvenilir Hale Getir
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <DemographicForm
                loading={loading}
                parties2023={parties2023}
                existingData={existingData}
                onSave={handleSave}
                onSkip={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
