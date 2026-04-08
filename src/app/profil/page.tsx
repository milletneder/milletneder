'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import RecoveryCodesSection from '@/components/auth/RecoveryCodesSection';
import PageHero from '@/components/layout/PageHero';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Check, Pencil, Loader2, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SubscriptionSection from '@/components/billing/SubscriptionSection';
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

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
          <PageHero title="Hesabım" subtitle="Hesap bilgilerin, oy geçmişin ve kişisel istatistiklerin." />
          {/* Hesap Bilgileri skeleton */}
          <section className="mb-12">
            <Skeleton className="h-6 w-40 mb-6" />
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
          {/* İstatistikler skeleton */}
          <section className="mb-12">
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          {/* Oy Geçmişi skeleton */}
          <section className="mb-12">
            <Skeleton className="h-6 w-28 mb-6" />
            <Card>
              <CardContent className="p-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 text-center">
          <p className="text-muted-foreground text-sm">Profil bulunamadı.</p>
        </main>
      </>
    );
  }

  const nextBadge = getNextBadgeInfo();

  const selectClass = "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  // Editable field row helper
  const renderEditableRow = (
    label: string,
    field: string,
    displayValue: string,
    editContent: React.ReactNode
  ) => (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground w-32">{label}</span>
      {editingField === field ? (
        <div className="flex-1 flex items-center gap-2">
          {editContent}
          <Button onClick={() => handleSave(field)} disabled={saving}>
            Kaydet
          </Button>
          <Button variant="outline" onClick={() => setEditingField(null)}>
            İptal
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-between">
          <span className="text-sm">{displayValue}</span>
          <Button variant="ghost" onClick={() => startEdit(field)} className="text-xs text-muted-foreground">
            <Pencil className="size-3 mr-1" />
            Düzenle
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <PageHero
          title="Hesabım"
          subtitle="Hesap bilgilerin, oy geçmişin ve kişisel istatistiklerin."
        />
        {/* Section: Abonelik */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-6">Abonelik</h2>
          <SubscriptionSection token={token || ''} />
        </section>

        {/* Section 1: Hesap Bilgileri */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-6">Hesap Bilgileri</h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {/* İl */}
              {renderEditableRow('İl', 'city', profile.city || '-', (
                <select
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className={selectClass + ' flex-1'}
                >
                  <option value="">Seçiniz</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ))}

              {/* İlçe */}
              {renderEditableRow('İlçe', 'district', profile.district || '-', (
                <Input
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  className="flex-1"
                  placeholder="İlçe giriniz"
                />
              ))}

              {/* Yas grubu */}
              {renderEditableRow('Yaş grubu', 'age_bracket', getAgeBracketLabel(profile.age_bracket), (
                <select
                  value={editAgeBracket}
                  onChange={(e) => setEditAgeBracket(e.target.value)}
                  className={selectClass + ' flex-1'}
                >
                  <option value="">Seçiniz</option>
                  {AGE_BRACKETS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              ))}

              {/* Gelir grubu */}
              {renderEditableRow('Gelir grubu', 'income_bracket', getIncomeBracketLabel(profile.income_bracket), (
                <select
                  value={editIncomeBracket}
                  onChange={(e) => setEditIncomeBracket(e.target.value)}
                  className={selectClass + ' flex-1'}
                >
                  <option value="">Seçiniz</option>
                  {INCOME_BRACKETS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              ))}

              {/* Cinsiyet */}
              {renderEditableRow('Cinsiyet', 'gender', getGenderLabel(profile.gender), (
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className={selectClass + ' flex-1'}
                >
                  <option value="">Seçiniz</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              ))}

              {/* Eğitim */}
              {renderEditableRow('Eğitim', 'education', getEducationLabel(profile.education), (
                <select
                  value={editEducation}
                  onChange={(e) => setEditEducation(e.target.value)}
                  className={selectClass + ' flex-1'}
                >
                  <option value="">Seçiniz</option>
                  {EDUCATION_BRACKETS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              ))}

              {/* Katılım niyeti */}
              {renderEditableRow('Seçime katılım', 'turnout_intention', getTurnoutLabel(profile.turnout_intention), (
                <select
                  value={editTurnout}
                  onChange={(e) => setEditTurnout(e.target.value)}
                  className={selectClass + ' flex-1'}
                >
                  <option value="">Seçiniz</option>
                  {TURNOUT_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              ))}

              {/* 2023 seçim oyu */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground w-32">2023 oyu</span>
                  {editingField !== 'previous_vote_2023' ? (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm inline-flex items-center gap-2">
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
                                  <span className="text-xs font-bold text-white">{party.shortName}</span>
                                )}
                              </span>
                              {party.name}
                            </>
                          );
                          return getPreviousVoteLabel(profile.previous_vote_2023);
                        })()}
                      </span>
                      <Button variant="ghost" onClick={() => { startEdit('previous_vote_2023'); setPartySearch(''); }} className="text-xs text-muted-foreground">
                        <Pencil className="size-3 mr-1" />
                        Düzenle
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex justify-end">
                      <Button variant="ghost" onClick={() => { setEditingField(null); setPartySearch(''); }} className="text-xs text-muted-foreground">
                        İptal
                      </Button>
                    </div>
                  )}
                </div>
                {editingField === 'previous_vote_2023' && (
                  <div className="mt-3">
                    <Input
                      value={partySearch}
                      onChange={(e) => setPartySearch(e.target.value)}
                      className="w-full mb-3"
                      placeholder="Parti ara..."
                      autoFocus
                      autoComplete="off"
                      name="party-search-2023"
                    />
                    <div className="max-h-72 overflow-y-auto space-y-1.5">
                      {/* Oy kullanmadım seçeneği */}
                      {(!partySearch || 'oy kullanmadım'.includes(partySearch.toLowerCase())) && (
                        <Button
                          variant="outline"
                          onClick={() => handlePreviousVoteSave('yok')}
                          disabled={saving}
                          className={`w-full flex items-center gap-3 h-auto px-3 py-2.5 text-left ${
                            profile.previous_vote_2023 === 'yok'
                              ? 'ring-2 ring-ring bg-accent'
                              : ''
                          }`}
                        >
                          <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-muted rounded-full">
                            <span className="text-muted-foreground text-xs">—</span>
                          </span>
                          <span className="text-sm font-medium">Oy kullanmadım</span>
                          {profile.previous_vote_2023 === 'yok' && (
                            <span className="ml-auto">
                              <Check className="size-4" />
                            </span>
                          )}
                        </Button>
                      )}
                      {/* Parti listesi */}
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
                            <Button
                              key={party.id}
                              variant="outline"
                              onClick={() => handlePreviousVoteSave(party.id)}
                              disabled={saving}
                              className={`w-full flex items-center gap-3 h-auto px-3 py-2.5 text-left ${
                                isSelected
                                  ? 'ring-2 ring-ring bg-accent'
                                  : ''
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
                                  <span className="text-xs font-bold">{party.shortName}</span>
                                )}
                              </div>
                              <span className="text-sm font-medium">
                                {party.name}
                              </span>
                              {isSelected && (
                                <span className="ml-auto">
                                  <Check className="size-4" />
                                </span>
                              )}
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </section>

        {/* Section 2: Rozetler & Davet */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-6">Rozetler &amp; Davet</h2>

          {/* Badges */}
          {profile.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.badges.map((b) => (
                <Badge key={b}>{BADGE_LABELS[b] ?? b}</Badge>
              ))}
            </div>
          )}
          {profile.badges.length === 0 && (
            <p className="text-xs text-muted-foreground mb-4">Henüz rozet kazanılmadı.</p>
          )}

          {/* Referral code */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Davet Kodunuz</span>
                <span className="text-xs text-muted-foreground">{referralCount} davet</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm font-mono">
                  {profile.referral_code}
                </code>
                <Button variant="outline" onClick={copyReferralCode}>
                  {copied ? (
                    <>
                      <Check className="size-3.5 mr-1" />
                      Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 mr-1" />
                      Kopyala
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next badge progress */}
          {nextBadge && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Sonraki rozete {nextBadge.remaining} davet kaldı
                </p>
                <Progress value={(referralCount / nextBadge.target) * 100} className="h-2" />
              </CardContent>
            </Card>
          )}
        </section>

        {/* Section 3: Oy Geçmişi */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-6">Oy Geçmişi</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tur</TableHead>
                  <TableHead>Parti</TableHead>
                  <TableHead>Değişiklik</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voteHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Henüz oy kullanılmadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  voteHistory.map((v) => (
                    <TableRow key={v.roundId}>
                      <TableCell className="text-sm">{v.roundTitle}</TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 inline-block rounded-sm" style={{ backgroundColor: v.partyColor || '#555555' }} />
                          {v.party}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{v.changeCount}</TableCell>
                      <TableCell>
                        <Badge variant={v.isValid ? 'default' : 'secondary'}>
                          {v.isValid ? 'Geçerli' : 'Geçersiz'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Section 4: Kişisel İstatistikler */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-6">Kişisel İstatistikler</h2>
          {stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold tabular-nums">{stats.totalRoundsParticipated}</p>
                  <p className="text-xs text-muted-foreground mt-1">Katıldığı tur sayısı</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold tabular-nums">{stats.totalVoteChanges}</p>
                  <p className="text-xs text-muted-foreground mt-1">Toplam oy değişikliği</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold tabular-nums">{stats.memberSinceDays}</p>
                  <p className="text-xs text-muted-foreground mt-1">Üyelik süresi (gün)</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">İstatistikler yüklenemedi.</p>
          )}
        </section>

        {/* Section 5: Şifre Değiştir */}
        {profile?.auth_provider === 'phone' && (
          <section className="mb-12">
            <h2 className="text-lg font-bold mb-6">
              {profile.password_hash ? 'Şifre Değiştir' : 'Şifre Belirle'}
            </h2>
            <Card>
              <CardContent className="pt-5 space-y-4">
                {profile.password_hash && (
                  <div className="space-y-1.5">
                    <Label>Mevcut Şifre</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); setPasswordMsg(''); }}
                      className="max-w-sm"
                      placeholder="Mevcut şifreniz"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>{profile.password_hash ? 'Yeni Şifre' : 'Şifre'}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordMsg(''); }}
                    className="max-w-sm"
                    placeholder="En az 6 karakter"
                  />
                </div>
                {passwordError && <p className="text-destructive text-xs">{passwordError}</p>}
                {passwordMsg && <p className="text-xs font-medium">{passwordMsg}</p>}
                <Button
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
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : profile.password_hash ? 'Şifreyi Güncelle' : 'Şifre Belirle'}
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Section: Kurtarma Kodları */}
        {profile?.vote_encryption_version === 1 && (
          <section id="kurtarma-kodlari" className="mb-12 scroll-mt-20">
            <h2 className="text-lg font-bold mb-6">Kurtarma Kodları</h2>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-3">
                  {profile.recovery_codes_confirmed ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <ShieldCheck className="size-4" />
                      Kurtarma kodlarınız kaydedilmiş
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <ShieldAlert className="size-4" />
                      Kodlarınızı henüz kaydetmediniz
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Kurtarma kodlarınızı kaybettiyseniz, mevcut şifrenizi kullanarak yeni kodlar oluşturabilirsiniz. Eski kodlar geçersiz olur.
                </p>
                <RecoveryCodesSection />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Section 6: Hesap Sil */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-6">Hesap Sil</h2>
          <Card className="border-destructive/50">
            <CardContent className="pt-5">
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="size-4 mr-1.5" />
                    Hesabımı Sil
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-destructive mb-3">
                    Bu işlem geri alınamaz. Tüm verileriniz silinecek.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="size-4 mr-1.5 animate-spin" />
                          Siliniyor...
                        </>
                      ) : 'Evet, Hesabımı Sil'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
