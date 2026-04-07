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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  X,
  Lock,
  AlertCircle,
  Copy,
  Check,
  Share2,
} from 'lucide-react';

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

type ModalStep = 'party-select' | 'auth' | 'profile' | 'success' | 'demographic' | 'blocked' | 'donation';

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
  const [verifiedIdentity, setVerifiedIdentity] = useState<string | null>(null);
  const [authType, setAuthType] = useState<'email' | 'phone' | null>(null);
  const [authExtraData, setAuthExtraData] = useState<{ password?: string } | undefined>();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [profileData, setProfileData] = useState<{ city: string; district: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { fingerprint } = useFingerprint();
  const { login } = useAuth();

  useEffect(() => {
    fetch('/api/auth/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.method) setAuthMethod(data.method); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      const pending = sessionStorage.getItem('pendingRegistration');
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          sessionStorage.removeItem('pendingRegistration');
          if (parsed.verifiedPhone) {
            setVerifiedIdentity(parsed.verifiedPhone);
            setAuthType('phone');
            setAuthExtraData(parsed.password ? { password: parsed.password } : undefined);
            setStep('party-select');
            setShowConfetti(false);
            setError('');
            setSearchQuery('');
            return;
          } else if (parsed.verifiedEmail) {
            setVerifiedIdentity(parsed.verifiedEmail);
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
      setVerifiedIdentity(null);
      setAuthExtraData(undefined);
      setAuthType(null);
      setProfileData(null);
      setCopied(false);
    }
  }, [isOpen, initialParty]);

  const handlePartySelect = (partyId: string) => {
    setSelectedParty(partyId);
    setShowSelectWarning(false);
  };

  const handleVoteConfirm = async () => {
    if (!selectedParty) return;

    if (isLoggedIn) {
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
      setStep('profile');
    }
  };

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

  const handleAuth = async (identityValue: string, extraData?: { password?: string }) => {
    const isPhone = /^\d{10}$/.test(identityValue.replace(/\s/g, ''));
    const type = isPhone ? 'phone' : 'email';
    setVerifiedIdentity(identityValue);
    setAuthExtraData(extraData);
    setAuthType(type);
    if (profileData) {
      await completeRegistration(identityValue, type, extraData, profileData);
    }
  };

  const handleProfileComplete = async (data: { city: string; district: string }) => {
    setProfileData(data);
    setError('');

    if (verifiedIdentity) {
      await completeRegistration(verifiedIdentity, authType, authExtraData, data);
      return;
    }

    setLoading(true);
    try {
      const statusRes = await fetch('/api/auth/sms-status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (!statusData.available) {
          setLoading(false);
          setStep('donation');
          return;
        }
      }
    } catch { /* devam et */ }

    if (fingerprint) {
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
      } catch { /* devam et */ }
    }
    setLoading(false);
    setStep('auth');
  };

  const completeRegistration = async (
    identity: string,
    type: 'email' | 'phone' | null,
    extraData: { password?: string } | undefined,
    profile: { city: string; district: string },
  ) => {
    setLoading(true);
    setError('');

    try {
      let res;
      if (type === 'phone') {
        res = await fetch('/api/auth/register-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: identity,
            city: profile.city,
            district: profile.district,
            fingerprint,
            party: selectedParty,
            roundId: activeRoundId,
            password: extraData?.password,
          }),
        });
      } else {
        res = await fetch('/api/auth/register-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: identity,
            city: profile.city,
            district: profile.district,
            fingerprint,
            party: selectedParty,
            roundId: activeRoundId,
            password: extraData?.password,
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-background border border-border shadow-lg rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
          >
            {step === 'party-select' && (
              <>
                <div className="sticky top-0 bg-background z-10 p-6 pb-3 border-b border-border">
                  <Button variant="ghost" size="icon-sm" onClick={onClose} className="absolute top-3 right-3">
                    <X className="size-4" />
                  </Button>
                  <h2 className="text-xl font-bold mb-1">Oyunu Kullan</h2>
                  <p className="text-muted-foreground text-sm mb-4">Hangi partiye oy vermek istiyorsun? Tek tıkla seç!</p>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Parti ara..."
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
                    <>
                      <Separator className="my-3" />
                      <button
                        onClick={() => handlePartySelect('karasizim')}
                        className={cn(
                          "w-full py-3 text-sm font-medium rounded-lg transition-all",
                          selectedParty === 'karasizim'
                            ? 'ring-2 ring-ring bg-accent'
                            : 'border border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        )}
                      >
                        Kararsızım — Henüz karar vermedim
                      </button>
                    </>
                  )}
                </div>

                <div className="sticky bottom-0 bg-background border-t border-border p-4">
                  {(showSelectWarning || error) && (
                    <p className="text-destructive text-xs mb-2 text-center flex items-center justify-center gap-1">
                      <AlertCircle className="size-3" />
                      {showSelectWarning ? 'Önce bir parti seçmelisin' : error}
                    </p>
                  )}
                  <Button
                    className="w-full h-12 text-base font-bold"
                    onClick={() => {
                      if (!selectedParty) { setShowSelectWarning(true); return; }
                      handleVoteConfirm();
                    }}
                    disabled={loading || !selectedParty}
                  >
                    {loading ? 'Kaydediliyor...' : 'Oyumu Onayla'}
                  </Button>
                </div>
              </>
            )}

            {step !== 'party-select' && (
              <Button variant="ghost" size="icon-sm" onClick={onClose} className="absolute top-3 right-3 z-10">
                <X className="size-4" />
              </Button>
            )}

            {step === 'blocked' && (
              <div className="p-6 text-center space-y-5">
                <div className="w-14 h-14 mx-auto bg-muted rounded-xl flex items-center justify-center">
                  <Lock className="size-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">Daha önce kayıt oldun</h2>
                  <p className="text-sm text-muted-foreground">
                    Bu cihazdan zaten bir hesap açılmış. Oyların adil sayılması
                    için her kişi yalnızca bir hesap kullanabilir.
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm">
                    Mevcut hesabınla giriş yap ve oyunu kullan.
                  </p>
                </div>
                <div className="pt-1 space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new Event('open-login')), 100); }}
                  >
                    Hesabıma Giriş Yap
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={onClose}>
                    Kapat
                  </Button>
                </div>
              </div>
            )}

            {step === 'donation' && (
              <div className="p-6 text-center space-y-5">
                <div className="w-14 h-14 mx-auto bg-muted rounded-xl flex items-center justify-center">
                  <AlertCircle className="size-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">SMS Bakiyemiz Tükendi</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Oy kullanabilmen için sana SMS ile doğrulama kodu göndermemiz gerekiyor.
                    Ancak bağımsız bir platform olarak SMS gönderim bakiyemiz şu an tükenmiş durumda.
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-left">
                  <p className="text-sm leading-relaxed">
                    <strong>milletneder.com</strong> hiçbir siyasi partiye, kuruma veya şirkete bağlı değildir.
                    Platformun devam edebilmesi tamamen bireysel bağışlara bağlıdır.
                  </p>
                </div>
                <div className="pt-1 space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => {
                      onClose();
                      setTimeout(() => {
                        const el = document.getElementById('bagis-yap');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 200);
                    }}
                  >
                    Destekçimiz Ol
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={onClose}>
                    Kapat
                  </Button>
                </div>
              </div>
            )}

            {step === 'profile' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-1">Nerelisin?</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Şehrini ve ilçeni seç — sonra telefonunu doğrulayacağız.
                </p>
                <ProfileForm
                  onComplete={handleProfileComplete}
                  onBack={() => setStep('party-select')}
                  loading={loading}
                />
                {error && <p className="text-destructive text-sm mt-3 text-center">{error}</p>}
              </div>
            )}

            {step === 'auth' && (
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
                <AuthForm
                  method={authMethod}
                  onAuthenticated={handleAuth}
                  onDirectLogin={handleDirectLogin}
                  onBack={() => setStep('profile')}
                />
                {error && <p className="text-destructive text-sm mt-3 text-center">{error}</p>}
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8 px-6 overflow-y-auto max-h-[85vh]">
                <h2 className="text-xl font-bold mb-1">Oyun Sayıldı!</h2>
                <p className="text-muted-foreground text-sm mb-6">Sesin duyuldu. Her paylaşım daha doğru sonuçlar demek!</p>

                {referralLink && (
                  <div className="bg-muted rounded-lg p-4 mb-4 text-left">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Share2 className="size-3.5" />
                      Davet Linkin:
                    </p>
                    <div className="flex gap-2">
                      <Input readOnly value={referralLink} className="flex-1 text-sm" />
                      <Button variant="outline" size="default" onClick={copyReferralLink}>
                        {copied ? <Check className="size-3.5" data-icon="inline-start" /> : <Copy className="size-3.5" data-icon="inline-start" />}
                        {copied ? 'Kopyalandı' : 'Kopyala'}
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="secondary" className="flex-1" asChild>
                        <a href={`https://x.com/intent/tweet?text=Ben+oyumu+kullandım!+Sen+de+sesini+duyur:&url=${encodeURIComponent(referralLink)}`} target="_blank" rel="noopener noreferrer">
                          X
                        </a>
                      </Button>
                      <Button className="flex-1" style={{ backgroundColor: '#25D366' }} asChild>
                        <a href={`https://wa.me/?text=${encodeURIComponent(`Ben oyumu kullandım! Sen de sesini duyur: ${referralLink}`)}`} target="_blank" rel="noopener noreferrer">
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  variant="secondary"
                  onClick={async () => {
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
                >
                  Devam
                </Button>
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
