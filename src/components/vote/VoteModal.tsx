'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PartyGrid from './PartyGrid';
import DemographicForm from './DemographicForm';
import AuthForm from '@/components/auth/AuthForm';
import ProfileForm from './ProfileForm';
import Confetti from '@/components/ui/Confetti';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useAuth } from '@/lib/auth/AuthContext';

interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  logoUrl?: string;
}

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  isLoggedIn: boolean;
  activeRoundId?: string;
  initialParty?: string;
}

type ModalStep = 'party-select' | 'firebase-auth' | 'profile' | 'success' | 'demographic' | 'blocked';

export default function VoteModal({
  isOpen,
  onClose,
  parties,
  isLoggedIn,
  activeRoundId,
  initialParty,
}: VoteModalProps) {
  const [step, setStep] = useState<ModalStep>('party-select');
  const [selectedParty, setSelectedParty] = useState<string | null>(initialParty || null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSelectWarning, setShowSelectWarning] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null); // Firebase token (email) or verified phone
  const [authExtraData, setAuthExtraData] = useState<{ password?: string } | undefined>();
  const [authType, setAuthType] = useState<'email' | 'phone' | null>(null);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const { fingerprint } = useFingerprint();
  const { login } = useAuth();

  // Auth method'u al
  useEffect(() => {
    fetch('/api/auth/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.method) setAuthMethod(data.method);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Pending registration kontrolü (Header'dan yönlendirme)
      const pending = sessionStorage.getItem('pendingRegistration');
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          sessionStorage.removeItem('pendingRegistration');
          if (parsed.verifiedPhone) {
            setAuthToken(parsed.verifiedPhone);
            setAuthType('phone');
            setAuthExtraData(parsed.password ? { password: parsed.password } : undefined);
            setStep('party-select');
            setShowConfetti(false);
            setError('');
            setSearchQuery('');
            return;
          } else if (parsed.firebaseIdToken) {
            setAuthToken(parsed.firebaseIdToken);
            setAuthType('email');
            setAuthExtraData(parsed.password ? { password: parsed.password } : undefined);
            setStep('party-select');
            setShowConfetti(false);
            setError('');
            setSearchQuery('');
            return;
          }
        } catch {
          sessionStorage.removeItem('pendingRegistration');
        }
      }
      setStep('party-select');
      setSelectedParty(initialParty || null);
      setShowConfetti(false);
      setError('');
      setSearchQuery('');
      setAuthToken(null);
      setAuthType(null);
      setAuthExtraData(undefined);
    }
  }, [isOpen, initialParty]);

  const handlePartySelect = (partyId: string) => {
    setSelectedParty(partyId);
    setShowSelectWarning(false);
  };

  const handleVoteConfirm = async () => {
    if (!selectedParty) return;

    if (isLoggedIn) {
      // Mevcut kullanici — direkt oy ver
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ party: selectedParty, roundId: activeRoundId }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Oy verirken bir hata oluştu');
          return;
        }

        setStep('success');
        setShowConfetti(true);
        setReferralLink(data.referralLink || '');
      } catch {
        setError('Bağlantı hatası. Tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    } else {
      // Pending registration varsa (Header'dan yönlendirme) — auth atlayıp profil'e git
      if (authToken) {
        await handleAuth(authToken, authExtraData);
        return;
      }
      // Giriş yapılmamış — önce fingerprint kontrolü yap
      if (fingerprint) {
        setLoading(true);
        try {
          const fpRes = await fetch('/api/auth/check-fingerprint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint }),
          });
          const fpData = await fpRes.json();
          if (fpData.exists) {
            setLoading(false);
            setStep('blocked');
            return;
          }
        } catch {
          // API hatası durumunda engelleme — devam et
        }
        setLoading(false);
      }
      setStep('firebase-auth');
    }
  };

  // Phone+password ile direkt login (SMS göndermeden, mevcut kullanıcılar için)
  const handleDirectLogin = async (token: string) => {
    setLoading(true);
    setError('');
    try {
      login(token);

      const voteRes = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ party: selectedParty, roundId: activeRoundId }),
      });

      const voteData = await voteRes.json();
      if (!voteRes.ok) {
        if (voteRes.status === 400 && voteData.error?.includes('Zaten')) {
          setStep('success');
          setShowConfetti(true);
          return;
        }
        setError(voteData.error || 'Oy verirken bir hata oluştu');
        return;
      }

      setStep('success');
      setShowConfetti(true);
      setReferralLink(voteData.referralLink || '');
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (tokenOrPhone: string, extraData?: { password?: string }) => {
    // Detect if this is a phone (digits) or Firebase token
    const isPhone = /^\d{10}$/.test(tokenOrPhone.replace(/\s/g, ''));
    setAuthToken(tokenOrPhone);
    setAuthType(isPhone ? 'phone' : 'email');
    setAuthExtraData(extraData);
    setLoading(true);
    setError('');

    try {
      let res;
      if (isPhone) {
        // Phone auth — verify OTP was already done, check user status
        res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: tokenOrPhone, code: '000000', password: extraData?.password }),
        });
        // verify-otp might fail because code was already used, but phone is marked as verified
        // In that case, we just need to check if user needs profile
        if (!res.ok) {
          // Phone already verified, just need profile form
          setStep('profile');
          setLoading(false);
          return;
        }
      } else {
        // Email auth — Firebase token
        res = await fetch('/api/auth/firebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseIdToken: tokenOrPhone, ...(extraData?.password && { password: extraData.password }) }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kimlik doğrulama hatası');
        setLoading(false);
        return;
      }

      if (data.isNewUser && !data.token) {
        setStep('profile');
        setLoading(false);
        return;
      }

      // Existing user — login and vote
      login(data.token);

      const voteRes = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ party: selectedParty, roundId: activeRoundId }),
      });

      const voteData = await voteRes.json();
      if (!voteRes.ok) {
        if (voteRes.status === 400 && voteData.error?.includes('Zaten')) {
          setStep('success');
          setShowConfetti(true);
          return;
        }
        setError(voteData.error || 'Oy verirken bir hata oluştu');
        return;
      }

      setStep('success');
      setShowConfetti(true);
      setReferralLink(voteData.referralLink || '');
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async (data: { city: string; district: string }) => {
    if (!authToken) return;
    setLoading(true);
    setError('');

    try {
      let res;
      if (authType === 'phone') {
        // Phone registration — use register-phone endpoint
        res = await fetch('/api/auth/register-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: authToken,
            city: data.city,
            district: data.district,
            fingerprint,
            party: selectedParty,
            roundId: activeRoundId,
            password: authExtraData?.password,
          }),
        });
      } else {
        // Email registration — use firebase endpoint
        res = await fetch('/api/auth/firebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseIdToken: authToken,
            city: data.city,
            district: data.district,
            fingerprint,
            party: selectedParty,
            roundId: activeRoundId,
            password: authExtraData?.password,
          }),
        });
      }

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Kayıt sırasında bir hata oluştu');
        setLoading(false);
        return;
      }

      login(result.token);
      setReferralLink(result.referralLink || '');
      setShowConfetti(true);
      setStep('success');
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
  };

  if (!isOpen) return null;

  return (
    <>
      <Confetti trigger={showConfetti} />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white border border-neutral-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          >
            {step === 'party-select' && (
              <>
                <div className="sticky top-0 bg-white z-10 p-6 pb-3 border-b border-neutral-100">
                  <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-black text-xl">{'×'}</button>
                  <h2 className="text-2xl font-bold text-black mb-2">Oyunu Kullan</h2>
                  <p className="text-neutral-500 text-sm mb-4">Hangi partiye oy vermek istiyorsun? Tek tıkla seç!</p>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Parti ara..."
                    className="w-full border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-black placeholder:text-neutral-400"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-3 pb-3">
                  <PartyGrid
                    parties={parties.filter(p => p.id !== 'karasizim')}
                    selectedParty={selectedParty}
                    onSelect={handlePartySelect}
                    searchQuery={searchQuery}
                  />
                  {!searchQuery && (
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                      <button
                        onClick={() => handlePartySelect('karasizim')}
                        className={`w-full py-3 text-sm font-medium transition-all ${
                          selectedParty === 'karasizim'
                            ? 'border-2 border-black bg-neutral-50 text-black'
                            : 'border border-neutral-200 text-neutral-500 hover:border-black hover:text-black'
                        }`}
                      >
                        Kararsızım — Henüz karar vermedim
                      </button>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-neutral-100 p-4">
                  {(showSelectWarning || error) && (
                    <p className="text-red-600 text-xs mb-2 text-center">
                      {showSelectWarning ? 'Önce bir parti seçmelisin' : error}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      if (!selectedParty) { setShowSelectWarning(true); return; }
                      handleVoteConfirm();
                    }}
                    disabled={loading}
                    className={`w-full py-4 font-bold text-lg transition-colors disabled:opacity-50 ${
                      selectedParty ? 'bg-black text-white hover:bg-neutral-800' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    {loading ? 'Kaydediliyor...' : 'Oyumu Onayla'}
                  </button>
                </div>
              </>
            )}

            {step !== 'party-select' && (
              <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-black text-xl z-10">{'×'}</button>
            )}

            {step === 'blocked' && (
              <div className="p-6 text-center space-y-5">
                <div className="w-14 h-14 mx-auto bg-neutral-100 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-black">Daha önce kayıt oldun</h2>
                  <p className="text-sm text-neutral-500">
                    Bu cihazdan zaten bir hesap açılmış. Oyların adil sayılması
                    için her kişi yalnızca bir hesap kullanabilir.
                  </p>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 p-4">
                  <p className="text-sm text-neutral-700">
                    Mevcut hesabınla giriş yap ve oyunu kullan.
                  </p>
                </div>
                <div className="pt-1 space-y-3">
                  <button
                    onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new Event('open-login')), 100); }}
                    className="w-full bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors"
                  >
                    Hesabıma Giriş Yap
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full text-neutral-500 text-sm hover:text-black transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}

            {step === 'firebase-auth' && (
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
                <AuthForm
                  method={authMethod}
                  onAuthenticated={handleAuth}
                  onDirectLogin={handleDirectLogin}
                  onBack={() => setStep('party-select')}
                />
                {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}
              </div>
            )}

            {step === 'profile' && (
              <div className="p-6 overflow-y-auto max-h-[85vh]">
                <h2 className="text-2xl font-bold text-black mb-2">Profil Bilgileri</h2>
                <p className="text-neutral-500 text-sm mb-6">
                  Son adım — şehrini ve ilçeni seç, oyun sayılsın.
                </p>
                <ProfileForm
                  onComplete={handleProfileComplete}
                  onBack={() => setStep('firebase-auth')}
                />
                {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8 px-6 overflow-y-auto max-h-[85vh]">
                <h2 className="text-2xl font-bold text-black mb-2">Oyun Sayıldı!</h2>
                <p className="text-neutral-500 mb-6">Sesin duyuldu. Her paylaşım daha doğru sonuçlar demek!</p>

                {referralLink && (
                  <div className="bg-neutral-50 border border-neutral-200 p-4 mb-4">
                    <p className="text-sm text-neutral-500 mb-2">Davet Linkin:</p>
                    <div className="flex gap-2">
                      <input readOnly value={referralLink} className="flex-1 bg-neutral-100 text-black text-sm px-3 py-2 border border-neutral-200" />
                      <button onClick={copyReferralLink} className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors">Kopyala</button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <a href={`https://x.com/intent/tweet?text=Ben+oyumu+kullandım!+Sen+de+sesini+duyur:&url=${encodeURIComponent(referralLink)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-black text-white py-2 text-sm text-center hover:bg-neutral-800 transition-all">X</a>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`Ben oyumu kullandım! Sen de sesini duyur: ${referralLink}`)}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#25D366] text-white py-2 text-sm text-center hover:brightness-110 transition-all">WhatsApp</a>
                    </div>
                  </div>
                )}

                <button
                  onClick={async () => {
                    // Demografik bilgiler doluysa modalı kapat, değilse formu göster
                    try {
                      const t = localStorage.getItem('token');
                      if (t) {
                        const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${t}` } });
                        if (res.ok) {
                          const d = await res.json();
                          const u = d.user;
                          if (u?.gender && u?.age_bracket && u?.education && u?.income_bracket && u?.turnout_intention && u?.previous_vote_2023) {
                            onClose();
                            return;
                          }
                        }
                      }
                    } catch { /* devam et */ }
                    setStep('demographic');
                  }}
                  className="bg-neutral-100 text-black px-6 py-3 hover:bg-neutral-200 transition-colors"
                >
                  Devam
                </button>
              </div>
            )}

            {step === 'demographic' && (
              <div className="p-6 overflow-y-auto max-h-[85vh]">
                <DemographicForm
                  loading={loading}
                  parties2023={parties.filter(p => p.id !== 'karasizim').map(p => ({ id: p.id, name: p.name, shortName: p.shortName, color: p.color, logoUrl: p.logoUrl }))}
                  onSave={async (data) => {
                    setLoading(true);
                    try {
                      const token = localStorage.getItem('token');
                      await fetch('/api/user/profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          age_bracket: data.ageBracket,
                          income_bracket: data.incomeBracket,
                          gender: data.gender,
                          education: data.education,
                          turnout_intention: data.turnoutIntention,
                          previous_vote_2023: data.previousVote2023,
                        }),
                      });
                    } catch { /* silently ignore */ } finally {
                      setLoading(false);
                      onClose();
                    }
                  }}
                  onSkip={onClose}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
