'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import RecoveryCodesSection from '@/components/auth/RecoveryCodesSection';
import PageHero from '@/components/layout/PageHero';
import { useAuth } from '@/lib/auth/AuthContext';
import { badge, btn, input, table } from '@/lib/ui';
import { CITIES, AGE_BRACKETS, INCOME_BRACKETS, GENDER_OPTIONS, EDUCATION_BRACKETS, TURNOUT_OPTIONS } from '@/lib/constants';

interface UserProfile {
  id: number;
  city: string;
  district: string | null;
  age_bracket: string | null;
  income_bracket: string | null;
  gender: string | null;
  education: string | null;
  turnout_intention: string | null;
  previous_vote_2023: string | null;
  referral_code: string;
  badges: string[];
  created_at: string;
  auth_provider: string;
  password_hash: string | null;
  vote_encryption_version?: number;
  recovery_codes_confirmed?: boolean;
  recovery_codes_generated_at?: string;
}

interface VoteHistoryItem {
  roundId: number;
  roundTitle: string;
  startDate: string;
  endDate: string;
  party: string;
  partyColor?: string;
  changeCount: number;
  isValid: boolean;
  isPublished: boolean;
}

interface UserStats {
  totalRoundsParticipated: number;
  totalVoteChanges: number;
  firstVoteDate: string | null;
  memberSinceDays: number;
}


const BADGE_THRESHOLDS = [3, 10, 25, 50];
const BADGE_LABELS: Record<string, string> = {
  davetci: 'Davetçi (3+)',
  elci: 'Elçi (10+)',
  lider: 'Lider (25+)',
  efsane: 'Efsane (50+)',
};

export default function ProfilPage() {
  const { isLoggedIn, token, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [voteHistory, setVoteHistory] = useState<VoteHistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editCity, setEditCity] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editAgeBracket, setEditAgeBracket] = useState('');
  const [editIncomeBracket, setEditIncomeBracket] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editTurnout, setEditTurnout] = useState('');
  const [editPreviousVote, setEditPreviousVote] = useState('');
  const [partyList, setPartyList] = useState<Array<{id: string; name: string; shortName: string; color: string; logoUrl?: string}>>([]);
  const [partySearch, setPartySearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Copy referral
  const [copied, setCopied] = useState(false);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [profileRes, historyRes, statsRes, partiesRes] = await Promise.all([
          fetch('/api/user/profile', { headers: headers() }),
          fetch('/api/user/vote-history', { headers: headers() }),
          fetch('/api/user/stats', { headers: headers() }),
          fetch('/api/parties'),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.user);
          setReferralCount(data.referralCount ?? 0);
        }

        if (historyRes.ok) {
          const data = await historyRes.json();
          setVoteHistory(data.history ?? []);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        if (partiesRes.ok) {
          const data = await partiesRes.json();
          setPartyList(
            (data.parties || []).map((p: { slug: string; name: string; short_name: string; color: string; logo_url?: string }) => ({
              id: p.slug,
              name: p.name,
              shortName: p.short_name,
              color: p.color,
              logoUrl: p.logo_url,
            }))
          );
        }
      } catch (err) {
        console.error('Profil verisi alınamadı:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isLoggedIn, token, headers]);

  const handleSave = async (field: string) => {
    if (!token) return;
    setSaving(true);

    const body: Record<string, string | null> = {};
    if (field === 'city') body.city = editCity;
    if (field === 'district') body.district = editDistrict || null;
    if (field === 'age_bracket') body.age_bracket = editAgeBracket || null;
    if (field === 'income_bracket') body.income_bracket = editIncomeBracket || null;
    if (field === 'gender') body.gender = editGender || null;
    if (field === 'education') body.education = editEducation || null;
    if (field === 'turnout_intention') body.turnout_intention = editTurnout || null;
    if (field === 'previous_vote_2023') body.previous_vote_2023 = editPreviousVote || null;

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, ...data.user } : prev);
        setEditingField(null);
        // DemographicBanner'ın yeniden kontrol etmesi için event dispatch et
        window.dispatchEvent(new Event('profile-updated'));
      }
    } catch (err) {
      console.error('Kaydetme hatası:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) {
        logout();
        router.push('/');
      }
    } catch (err) {
      console.error('Hesap silme hatası:', err);
    } finally {
      setDeleting(false);
    }
  };

  const copyReferralCode = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = (field: string) => {
    if (!profile) return;
    setEditingField(field);
    if (field === 'city') setEditCity(profile.city || '');
    if (field === 'district') setEditDistrict(profile.district || '');
    if (field === 'age_bracket') setEditAgeBracket(profile.age_bracket || '');
    if (field === 'income_bracket') setEditIncomeBracket(profile.income_bracket || '');
    if (field === 'gender') setEditGender(profile.gender || '');
    if (field === 'education') setEditEducation(profile.education || '');
    if (field === 'turnout_intention') setEditTurnout(profile.turnout_intention || '');
    if (field === 'previous_vote_2023') setEditPreviousVote(profile.previous_vote_2023 || '');
  };

  const getAgeBracketLabel = (value: string | null) => {
    if (!value) return '-';
    return AGE_BRACKETS.find((b) => b.value === value)?.label ?? value;
  };

  const getIncomeBracketLabel = (value: string | null) => {
    if (!value) return '-';
    return INCOME_BRACKETS.find((b) => b.value === value)?.label ?? value;
  };

  const getGenderLabel = (value: string | null) => {
    if (!value) return '-';
    return GENDER_OPTIONS.find((g) => g.value === value)?.label ?? value;
  };

  const getEducationLabel = (value: string | null) => {
    if (!value) return '-';
    return EDUCATION_BRACKETS.find((b) => b.value === value)?.label ?? value;
  };

  const getTurnoutLabel = (value: string | null) => {
    if (!value) return '-';
    return TURNOUT_OPTIONS.find((t) => t.value === value)?.label ?? value;
  };

  const getPreviousVoteLabel = (value: string | null) => {
    if (!value) return '-';
    if (value === 'yok') return 'Oy kullanmadım';
    const party = partyList.find(p => p.id === value);
    return party?.name || value;
  };

  const getPartyData = (value: string | null) => {
    if (!value || value === 'yok') return null;
    return partyList.find(p => p.id === value) || null;
  };

  // 2023 oy seçimi için doğrudan kaydet (tek tıkla)
  const handlePreviousVoteSave = async (value: string) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ previous_vote_2023: value || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, ...data.user } : prev);
        setEditingField(null);
        setPartySearch('');
      }
    } catch (err) {
      console.error('Kaydetme hatası:', err);
    } finally {
      setSaving(false);
    }
  };

  const getNextBadgeInfo = () => {
    for (const threshold of BADGE_THRESHOLDS) {
      if (referralCount < threshold) {
        return { target: threshold, remaining: threshold - referralCount };
      }
    }
    return null;
  };

  // Not logged in — redirect to homepage
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  // Loading — boş sayfa göster, spinner yok
  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-6 pt-24 pb-16" />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          <p className="text-neutral-500 text-sm">Profil bulunamadı.</p>
        </main>
      </>
    );
  }

  const nextBadge = getNextBadgeInfo();

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <PageHero
          title="Hesabım"
          subtitle="Hesap bilgilerin, oy geçmişin ve kişisel istatistiklerin."
        />
        {/* Section 1: Hesap Bilgileri */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-black mb-6">Hesap Bilgileri</h2>
          <div className="border border-neutral-200 divide-y divide-neutral-100">
            {/* İl */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 w-32">İl</span>
              {editingField === 'city' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className={input.select + ' flex-1'}
                  >
                    <option value="">Seçiniz</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSave('city')} disabled={saving} className={btn.small}>
                    Kaydet
                  </button>
                  <button onClick={() => setEditingField(null)} className={btn.small}>
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-black">{profile.city || '-'}</span>
                  <button onClick={() => startEdit('city')} className="text-xs text-neutral-400 hover:text-black">
                    Düzenle
                  </button>
                </div>
              )}
            </div>

            {/* İlçe */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 w-32">İlçe</span>
              {editingField === 'district' ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className={input.text + ' flex-1'}
                    placeholder="İlçe giriniz"
                  />
                  <button onClick={() => handleSave('district')} disabled={saving} className={btn.small}>
                    Kaydet
                  </button>
                  <button onClick={() => setEditingField(null)} className={btn.small}>
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-black">{profile.district || '-'}</span>
                  <button onClick={() => startEdit('district')} className="text-xs text-neutral-400 hover:text-black">
                    Düzenle
                  </button>
                </div>
              )}
            </div>

            {/* Yas grubu */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 w-32">Yaş grubu</span>
              {editingField === 'age_bracket' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={editAgeBracket}
                    onChange={(e) => setEditAgeBracket(e.target.value)}
                    className={input.select + ' flex-1'}
                  >
                    <option value="">Seçiniz</option>
                    {AGE_BRACKETS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSave('age_bracket')} disabled={saving} className={btn.small}>
                    Kaydet
                  </button>
                  <button onClick={() => setEditingField(null)} className={btn.small}>
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-black">{getAgeBracketLabel(profile.age_bracket)}</span>
                  <button onClick={() => startEdit('age_bracket')} className="text-xs text-neutral-400 hover:text-black">
                    Düzenle
                  </button>
                </div>
              )}
            </div>

            {/* Gelir grubu */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 w-32">Gelir grubu</span>
              {editingField === 'income_bracket' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={editIncomeBracket}
                    onChange={(e) => setEditIncomeBracket(e.target.value)}
                    className={input.select + ' flex-1'}
                  >
                    <option value="">Seçiniz</option>
                    {INCOME_BRACKETS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSave('income_bracket')} disabled={saving} className={btn.small}>
                    Kaydet
                  </button>
                  <button onClick={() => setEditingField(null)} className={btn.small}>
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-black">{getIncomeBracketLabel(profile.income_bracket)}</span>
                  <button onClick={() => startEdit('income_bracket')} className="text-xs text-neutral-400 hover:text-black">
                    Düzenle
                  </button>
                </div>
              )}
            </div>
            {/* Cinsiyet */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 w-32">Cinsiyet</span>
              {editingField === 'gender' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className={input.select + ' flex-1'}
                  >
                    <option value="">Seçiniz</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSave('gender')} disabled={saving} className={btn.small}>
                    Kaydet
                  </button>
                  <button onClick={() => setEditingField(null)} className={btn.small}>
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-black">{getGenderLabel(profile.gender)}</span>
                  <button onClick={() => startEdit('gender')} className="text-xs text-neutral-400 hover:text-black">
                    Düzenle
                  </button>
                </div>
              )}
            </div>

            {/* Eğitim */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 w-32">Eğitim</span>
              {editingField === 'education' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={editEducation}
                    onChange={(e) => setEditEducation(e.target.value)}
                    className={input.select + ' flex-1'}
                  >
                    <option value="">Seçiniz</option>
                    {EDUCATION_BRACKETS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSave('education')} disabled={saving} className={btn.small}>
                    Kaydet
                  </button>
                  <button onClick={() => setEditingField(null)} className={btn.small}>
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-black">{getEducationLabel(profile.education)}</span>
                  <button onClick={() => startEdit('education')} className="text-xs text-neutral-400 hover:text-black">
                    Düzenle
                  </button>
                </div>
              )}
            </div>

            {/* Katılım niyeti */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 w-32">Seçime katılım</span>
              {editingField === 'turnout_intention' ? (
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={editTurnout}
                    onChange={(e) => setEditTurnout(e.target.value)}
                    className={input.select + ' flex-1'}
                  >
                    <option value="">Seçiniz</option>
                    {TURNOUT_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleSave('turnout_intention')} disabled={saving} className={btn.small}>
                    Kaydet
                  </button>
                  <button onClick={() => setEditingField(null)} className={btn.small}>
                    İptal
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-black">{getTurnoutLabel(profile.turnout_intention)}</span>
                  <button onClick={() => startEdit('turnout_intention')} className="text-xs text-neutral-400 hover:text-black">
                    Düzenle
                  </button>
                </div>
              )}
            </div>

            {/* 2023 seçim oyu */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 w-32">2023 oyu</span>
                {editingField !== 'previous_vote_2023' ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-black inline-flex items-center gap-2">
                      {(() => {
                        const party = getPartyData(profile.previous_vote_2023);
                        if (party) return (
                          <>
                            <span
                              className="w-5 h-5 flex-shrink-0 flex items-center justify-center"
                              style={{
                                backgroundColor: party.logoUrl ? 'transparent' : party.color,
                                borderRadius: party.logoUrl ? '0' : '50%',
                              }}
                            >
                              {party.logoUrl ? (
                                <img src={party.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                              ) : (
                                <span className="text-[7px] font-bold text-white">{party.shortName}</span>
                              )}
                            </span>
                            {party.name}
                          </>
                        );
                        return getPreviousVoteLabel(profile.previous_vote_2023);
                      })()}
                    </span>
                    <button onClick={() => { startEdit('previous_vote_2023'); setPartySearch(''); }} className="text-xs text-neutral-400 hover:text-black">
                      Düzenle
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex justify-end">
                    <button onClick={() => { setEditingField(null); setPartySearch(''); }} className="text-xs text-neutral-400 hover:text-black">
                      İptal
                    </button>
                  </div>
                )}
              </div>
              {editingField === 'previous_vote_2023' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    className={input.text + ' w-full mb-3'}
                    placeholder="Parti ara..."
                    autoFocus
                    autoComplete="off"
                    name="party-search-2023"
                  />
                  <div className="max-h-72 overflow-y-auto space-y-1.5">
                    {/* Oy kullanmadım seçeneği */}
                    {(!partySearch || 'oy kullanmadım'.includes(partySearch.toLowerCase())) && (
                      <button
                        onClick={() => handlePreviousVoteSave('yok')}
                        disabled={saving}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                          profile.previous_vote_2023 === 'yok'
                            ? 'border-2 border-black bg-neutral-50'
                            : 'border border-neutral-200 bg-white hover:border-black'
                        }`}
                      >
                        <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-neutral-200 rounded-full">
                          <span className="text-neutral-500 text-xs">—</span>
                        </span>
                        <span className="text-sm font-medium text-neutral-700">Oy kullanmadım</span>
                        {profile.previous_vote_2023 === 'yok' && (
                          <span className="ml-auto w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">{'\u2713'}</span>
                          </span>
                        )}
                      </button>
                    )}
                    {/* Parti listesi — tüm aktif partiler (karasızım hariç) */}
                    {partyList
                      .filter(p => p.id !== 'karasizim')
                      .filter(p => {
                        if (!partySearch) return true;
                        const q = partySearch.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
                        const name = p.name.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
                        const short = p.shortName.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
                        return name.includes(q) || short.includes(q);
                      })
                      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
                      .map(party => {
                        const isSelected = profile.previous_vote_2023 === party.id;
                        return (
                          <button
                            key={party.id}
                            onClick={() => handlePreviousVoteSave(party.id)}
                            disabled={saving}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? 'border-2 border-black bg-neutral-50'
                                : 'border border-neutral-200 bg-white hover:border-black'
                            }`}
                          >
                            <div
                              className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                              style={{
                                backgroundColor: party.logoUrl ? 'transparent' : party.color,
                                borderRadius: party.logoUrl ? '0' : '50%',
                                color: '#ffffff',
                              }}
                            >
                              {party.logoUrl ? (
                                <img src={party.logoUrl} alt={party.name} className="max-w-full max-h-full object-contain" />
                              ) : (
                                <span className="text-[10px] font-bold">{party.shortName}</span>
                              )}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-black' : 'text-neutral-700'}`}>
                              {party.name}
                            </span>
                            {isSelected && (
                              <span className="ml-auto w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">{'\u2713'}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* Section 2: Rozetler & Davet */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-black mb-6">Rozetler &amp; Davet</h2>

          {/* Badges */}
          {profile.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.badges.map((b) => (
                <span key={b} className={badge.dark}>
                  {BADGE_LABELS[b] ?? b}
                </span>
              ))}
            </div>
          )}
          {profile.badges.length === 0 && (
            <p className="text-xs text-neutral-400 mb-4">Henüz rozet kazanılmadı.</p>
          )}

          {/* Referral code */}
          <div className="border border-neutral-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-500">Davet Kodunuz</span>
              <span className="text-xs text-neutral-400">{referralCount} davet</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm font-mono text-black">
                {profile.referral_code}
              </code>
              <button onClick={copyReferralCode} className={btn.small}>
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
          </div>

          {/* Next badge progress */}
          {nextBadge && (
            <div className="border border-neutral-200 p-4">
              <p className="text-xs text-neutral-500 mb-2">
                Sonraki rozete {nextBadge.remaining} davet kaldı
              </p>
              <div className="w-full bg-neutral-100 h-2">
                <div
                  className="bg-black h-2 transition-all"
                  style={{ width: `${(referralCount / nextBadge.target) * 100}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Oy Geçmişi */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-black mb-6">Oy Geçmişi</h2>
          <div className={table.container}>
            <table className="w-full">
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Tur</th>
                  <th className={table.th}>Parti</th>
                  <th className={table.th}>Değişiklik</th>
                  <th className={table.th}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {voteHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={table.empty}>
                      Henüz oy kullanılmadı.
                    </td>
                  </tr>
                ) : (
                  voteHistory.map((v) => (
                    <tr key={v.roundId} className={table.row}>
                      <td className={table.td + ' text-sm'}>{v.roundTitle}</td>
                      <td className={table.td + ' text-sm'}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 inline-block" style={{ backgroundColor: v.partyColor || '#555555' }} />
                          {v.party}
                        </span>
                      </td>
                      <td className={table.td + ' text-sm'}>{v.changeCount}</td>
                      <td className={table.td}>
                        <span className={v.isValid ? badge.positive : badge.negative}>
                          {v.isValid ? 'Geçerli' : 'Geçersiz'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Kişisel İstatistikler */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-black mb-6">Kişisel İstatistikler</h2>
          {stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-neutral-200 p-4">
                <p className="text-2xl font-bold text-black">{stats.totalRoundsParticipated}</p>
                <p className="text-xs text-neutral-500 mt-1">Katıldığı tur sayısı</p>
              </div>
              <div className="border border-neutral-200 p-4">
                <p className="text-2xl font-bold text-black">{stats.totalVoteChanges}</p>
                <p className="text-xs text-neutral-500 mt-1">Toplam oy değişikliği</p>
              </div>
              <div className="border border-neutral-200 p-4">
                <p className="text-2xl font-bold text-black">{stats.memberSinceDays}</p>
                <p className="text-xs text-neutral-500 mt-1">Üyelik süresi (gün)</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">İstatistikler yüklenemedi.</p>
          )}
        </section>

        {/* Section 5: Şifre Değiştir */}
        {profile?.auth_provider === 'phone' && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-black mb-6">
              {profile.password_hash ? 'Şifre Değiştir' : 'Şifre Belirle'}
            </h2>
            <div className="border border-neutral-200 p-4 space-y-4">
              {profile.password_hash && (
                <div>
                  <label className="block text-sm text-neutral-600 mb-1">Mevcut Şifre</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); setPasswordMsg(''); }}
                    className={`${input.text} max-w-sm`}
                    placeholder="Mevcut şifreniz"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-neutral-600 mb-1">
                  {profile.password_hash ? 'Yeni Şifre' : 'Şifre'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordMsg(''); }}
                  className={`${input.text} max-w-sm`}
                  placeholder="En az 6 karakter"
                />
              </div>
              {passwordError && <p className="text-red-600 text-xs">{passwordError}</p>}
              {passwordMsg && <p className="text-green-600 text-xs">{passwordMsg}</p>}
              <button
                onClick={async () => {
                  if (newPassword.length < 6) {
                    setPasswordError('Şifre en az 6 karakter olmalı');
                    return;
                  }
                  setPasswordSaving(true);
                  setPasswordError('');
                  setPasswordMsg('');
                  try {
                    const res = await fetch('/api/user/change-password', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        currentPassword: currentPassword || undefined,
                        newPassword,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setPasswordError(data.error || 'Şifre değiştirme başarısız');
                    } else {
                      setPasswordMsg('Şifre başarıyla güncellendi!');
                      setCurrentPassword('');
                      setNewPassword('');
                      // Update profile to reflect password_hash is now set
                      if (profile && !profile.password_hash) {
                        setProfile({ ...profile, password_hash: 'set' });
                      }
                    }
                  } catch {
                    setPasswordError('Bağlantı hatası');
                  } finally {
                    setPasswordSaving(false);
                  }
                }}
                disabled={passwordSaving || newPassword.length < 6 || (!!profile.password_hash && currentPassword.length < 6)}
                className="bg-black text-white px-6 h-10 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {passwordSaving ? 'Kaydediliyor...' : profile.password_hash ? 'Şifreyi Güncelle' : 'Şifre Belirle'}
              </button>
            </div>
          </section>
        )}

        {/* Section: Kurtarma Kodları */}
        {profile?.vote_encryption_version === 1 && (
          <section id="kurtarma-kodlari" className="mb-12 scroll-mt-20">
            <h2 className="text-lg font-bold text-black mb-6">Kurtarma Kodları</h2>
            <div className="border border-neutral-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                {profile.recovery_codes_confirmed ? (
                  <span className="text-green-700 text-sm font-medium">Kurtarma kodlarınız kaydedilmiş</span>
                ) : (
                  <span className="text-amber-700 text-sm font-medium">Kodlarınızı henüz kaydetmediniz</span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                Kurtarma kodlarınızı kaybettiyseniz, mevcut şifrenizi kullanarak yeni kodlar oluşturabilirsiniz. Eski kodlar geçersiz olur.
              </p>
              <RecoveryCodesSection />
            </div>
          </section>
        )}

        {/* Section 6: Hesap Sil */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-black mb-6">Hesap Sil</h2>
          <div className="border border-red-200 bg-red-50 p-4">
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-600">
                  Hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border border-red-600 text-red-600 px-4 h-10 text-sm font-medium hover:bg-red-600 hover:text-white transition-colors"
                >
                  Hesabımı Sil
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-red-600 font-medium mb-2">
                  Bu işlem geri alınamaz. Tüm verileriniz silinecek.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="border border-red-600 bg-red-600 text-white px-4 h-10 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Siliniyor...' : 'Evet, Hesabımı Sil'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={btn.secondary}
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
