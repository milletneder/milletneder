'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Party {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  logoUrl?: string;
}

interface PartyGridProps {
  parties: Party[];
  selectedParty: string | null;
  onSelect: (partyId: string) => void;
  searchQuery?: string;
}

export default function PartyGrid({ parties, selectedParty, onSelect, searchQuery = '' }: PartyGridProps) {
  const q = searchQuery.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');

  const turkishSort = (a: Party, b: Party) =>
    a.name.localeCompare(b.name, 'tr');

  const filtered = (q
    ? parties.filter(p =>
        p.name.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q) ||
        p.shortName.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q)
      )
    : parties
  ).sort(turkishSort);

  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Sonuç bulunamadı
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {filtered.map((party) => {
        const isSelected = selectedParty === party.id;
        return (
          <Button
            key={party.id}
            variant="outline"
            onClick={() => onSelect(party.id)}
            className={cn(
              "relative flex items-center gap-3 h-auto px-3 py-2.5 text-left",
              isSelected && 'ring-2 ring-ring bg-accent'
            )}
          >
            <div
              className="w-8 h-8 shrink-0 flex items-center justify-center"
              style={{
                backgroundColor: party.logoUrl ? 'transparent' : party.color,
                borderRadius: party.logoUrl ? '0' : '50%',
                color: party.textColor,
              }}
            >
              {party.logoUrl ? (
                <img src={party.logoUrl} alt={party.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs font-bold">{party.shortName}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn("text-sm font-medium block truncate", isSelected ? 'text-foreground' : 'text-foreground/80')}>
                {party.name}
              </span>
            </div>
            {isSelected && (
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                <Check className="size-3 text-primary-foreground" />
              </div>
            )}
          </Button>
        );
      })}
    </div>
  );
}
