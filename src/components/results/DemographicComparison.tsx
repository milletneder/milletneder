'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AGE_BRACKETS, INCOME_BRACKETS, GENDER_OPTIONS, EDUCATION_BRACKETS, TURNOUT_OPTIONS } from '@/lib/constants';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PartyVote {
  partyId: string;
  partyName?: string;
  color?: string;
  voteCount: number;
  percentage: number;
}

interface BracketData {
  code: string;
  label: string;
  totalVotes: number;
  parties: PartyVote[];
}

interface DemographicsResponse {
  brackets: BracketData[];
  totalResponders: number;
}

interface DemographicComparisonProps {
  type: 'age' | 'income' | 'gender' | 'education' | 'turnout';
  userBracket: string | null;
  hasVoted: boolean;
  isLoggedIn: boolean;
  userParty?: string | null;
}

const MIN_VOTES = 10;

const TYPE_CONFIG: Record<string, { brackets: readonly { value: string; label: string }[]; title: string; missingLabel: string; groupLabel: string }> = {
  age: { brackets: AGE_BRACKETS, title: 'Senin Yaş Grubun Nasıl Oy Kullanıyor?', missingLabel: 'Yaş grubunu ekle, raporunu aç', groupLabel: 'Yaş' },
  income: { brackets: INCOME_BRACKETS, title: 'Senin Gelir Grubun Nasıl Oy Kullanıyor?', missingLabel: 'Gelir grubunu ekle, raporunu aç', groupLabel: 'Gelir' },
  gender: { brackets: GENDER_OPTIONS, title: 'Cinsiyetine Göre Oy Dağılımı', missingLabel: 'Cinsiyetini ekle, raporunu aç', groupLabel: 'Cinsiyet' },
  education: { brackets: EDUCATION_BRACKETS, title: 'Eğitim Düzeyine Göre Oy Dağılımı', missingLabel: 'Eğitim bilgini ekle, raporunu aç', groupLabel: 'Eğitim' },
  turnout: { brackets: TURNOUT_OPTIONS, title: 'Katılım Niyetine Göre Dağılım', missingLabel: 'Katılım niyetini ekle, raporunu aç', groupLabel: 'Katılım' },
};

export default function DemographicComparison({
  type,
  userBracket,
  hasVoted,
  isLoggedIn,
  userParty,
}: DemographicComparisonProps) {
  const [data, setData] = useState<DemographicsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const config = TYPE_CONFIG[type];
  const brackets = config.brackets;
  const title = config.title;

  useEffect(() => {
    fetch(`/api/results/demographics?type=${type}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const canView = isLoggedIn && hasVoted && !!userBracket;
  const userBracketData = data?.brackets.find((b) => b.code === userBracket);
  const hasEnoughData = userBracketData
    ? userBracketData.totalVotes >= MIN_VOTES
    : false;

  const ctaMessage = !isLoggedIn
    ? 'Giriş yap ve oyunu kullan'
    : !hasVoted
      ? 'Önce oyunu kullan, sonra grubunun raporunu gör'
      : !userBracket
        ? config.missingLabel
        : '';

  const ctaButtonLabel = !isLoggedIn
    ? 'Giriş Yap'
    : !hasVoted
      ? 'Katıl'
      : 'Bilgi Ekle';

  const previewBrackets = brackets.slice(0, 4).map((b) => ({
    code: b.value,
    label: b.label,
    totalVotes: Math.floor(Math.random() * 3000) + 500,
    parties: [
      { partyId: 'placeholder1', voteCount: 40, percentage: 40 },
      { partyId: 'placeholder2', voteCount: 30, percentage: 30 },
      { partyId: 'placeholder3', voteCount: 20, percentage: 20 },
    ],
  }));

  if (loading) {
    return (
      <div className="py-8">
        <div className="h-6 w-64 bg-muted rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-6">{title}</h2>

      {!canView ? (
        /* BLURRED PREVIEW */
        <div className="relative">
          <div style={{ filter: 'blur(6px)' }} className="pointer-events-none select-none">
            <div className="space-y-4">
              {previewBrackets.map((bracket) => (
                <div key={bracket.code}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {bracket.label}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {bracket.totalVotes.toLocaleString('tr-TR')} oy
                    </span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-muted-foreground/40 rounded-sm"
                      style={{ width: `${bracket.parties[0].percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
            <p className="text-sm font-medium text-center px-4">
              {ctaMessage}
            </p>
            <Button>{ctaButtonLabel}</Button>
            {data && data.totalResponders > 0 && (
              <p className="text-muted-foreground text-sm mt-2">
                {data.totalResponders.toLocaleString('tr-TR')} kişi bu raporu görüntüledi
              </p>
            )}
          </div>
        </div>
      ) : !hasEnoughData ? (
        /* NOT ENOUGH DATA */
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Henüz yeterli veri yok (minimum 10 oy gerekli)
          </p>
          {userBracketData && (
            <p className="text-xs text-muted-foreground mt-2">
              Grubunda şu an{' '}
              {userBracketData.totalVotes.toLocaleString('tr-TR')} oy var
            </p>
          )}
        </div>
      ) : (
        /* REAL DATA */
        <div className="space-y-8">
          {/* User's bracket - highlighted */}
          {userBracketData && (
            <Card className="border-2 border-foreground/20">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <Badge>Senin Grubun</Badge>
                  <span className="text-sm font-medium">
                    {brackets.find((b) => b.value === userBracket)?.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                    {userBracketData.totalVotes.toLocaleString('tr-TR')} oy
                  </span>
                </div>
                <div className="space-y-3">
                  {userBracketData.parties.map((party, index) => {
                    const maxVotes = userBracketData.parties[0]?.voteCount || 1;
                    const isUserParty = userParty === party.partyId;
                    return (
                      <motion.div
                        key={party.partyId}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{
                                backgroundColor: party.color || '#555555',
                              }}
                            />
                            <span
                              className={`text-sm ${isUserParty ? 'font-bold' : 'font-medium'}`}
                            >
                              {party.partyName || party.partyId}
                              {isUserParty && ' (Senin Oyun)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm tabular-nums">
                              %{party.percentage.toFixed(1)}
                            </span>
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {party.voteCount.toLocaleString('tr-TR')} oy
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted h-3 rounded-sm overflow-hidden">
                          <motion.div
                            className="h-full rounded-sm"
                            style={{
                              backgroundColor: party.color || '#555555',
                            }}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(party.voteCount / maxVotes) * 100}%`,
                            }}
                            transition={{
                              duration: 0.8,
                              delay: index * 0.05,
                              ease: 'easeOut',
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* User's party match info */}
                {userParty && (() => {
                  const match = userBracketData.parties.find(
                    (p) => p.partyId === userParty
                  );
                  if (!match) return null;
                  return (
                    <>
                      <Separator className="my-4" />
                      <p className="text-sm text-muted-foreground">
                        Sen{' '}
                        <span className="font-bold text-foreground">
                          {match.partyName || userParty}
                        </span>
                        &apos;ne oy verdin —{' '}
                        {config.groupLabel.toLowerCase()} grubunun{' '}
                        <span className="font-bold text-foreground">
                          %{match.percentage.toFixed(1)}
                        </span>
                        &apos;i de aynı tercihte
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* All brackets comparison */}
          <div>
            <h3 className="text-sm font-bold mb-4">
              Tüm {config.groupLabel} Grupları
            </h3>
            <div className="space-y-4">
              {data?.brackets
                .filter((b) => b.totalVotes > 0)
                .map((bracket) => {
                  const isUserBracket = bracket.code === userBracket;
                  const topParty = bracket.parties[0];
                  return (
                    <div
                      key={bracket.code}
                      className={
                        isUserBracket
                          ? 'border-l-2 border-foreground pl-3'
                          : 'pl-3'
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm ${isUserBracket ? 'font-bold' : 'font-medium text-muted-foreground'}`}
                        >
                          {bracket.label}
                          {isUserBracket && ' (Sen)'}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {bracket.totalVotes.toLocaleString('tr-TR')} oy
                        </span>
                      </div>
                      <div className="flex gap-0 w-full h-3 overflow-hidden bg-muted rounded-sm">
                        {bracket.parties.slice(0, 5).map((party) => (
                          <div
                            key={party.partyId}
                            className="h-full"
                            style={{
                              backgroundColor: party.color || '#555555',
                              width: `${party.percentage}%`,
                            }}
                          />
                        ))}
                      </div>
                      {topParty && (
                        <p className="text-xs text-muted-foreground mt-1">
                          1. {topParty.partyName || topParty.partyId} %
                          {topParty.percentage.toFixed(1)}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
