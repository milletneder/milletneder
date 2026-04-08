'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import DemographicForm from '@/components/vote/DemographicForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    const handler = () => checkProfile();
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [checkProfile]);

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
      // Tüm alanlar doluysa modal'ı kapat, yoksa açık bırak (sonraki adıma geçsin)
      const allFilled = data.ageBracket && data.incomeBracket && data.gender && data.education && data.turnoutIntention && data.previousVote2023;
      if (allFilled) {
        setShowModal(false);
        setShow(false);
      }
      // existingData'yı güncelle ki form doğru adımdan devam etsin
      setExistingData({
        ageBracket: data.ageBracket,
        incomeBracket: data.incomeBracket,
        gender: data.gender,
        education: data.education,
        turnoutIntention: data.turnoutIntention,
        previousVote2023: data.previousVote2023,
      });
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-primary border-b border-primary/80">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-primary-foreground/70 flex items-center gap-2">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>
              <span className="text-primary-foreground font-medium">Profilinde {missingCount} eksik bilgi var.</span>
              {' '}Demografik bilgiler anketin doğruluğunu artırır.
            </span>
          </p>
          <Button
            variant="secondary"
                       onClick={() => setShowModal(true)}
          >
            Tamamla
          </Button>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demografik Bilgilerini Tamamla</DialogTitle>
          </DialogHeader>
          <DemographicForm
            loading={loading}
            parties2023={parties2023}
            existingData={existingData}
            onSave={handleSave}
            onSkip={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
