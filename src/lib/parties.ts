export interface PartyInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  logoUrl?: string;
}

export const PARTIES: PartyInfo[] = [
  { id: 'ak-parti', name: 'AK Parti', shortName: 'AKP', color: '#F28C28', textColor: '#ffffff' },
  { id: 'chp', name: 'CHP', shortName: 'CHP', color: '#E30A17', textColor: '#ffffff' },
  { id: 'mhp', name: 'MHP', shortName: 'MHP', color: '#8B8B8B', textColor: '#ffffff' },
  { id: 'iyi', name: 'İYİ Parti', shortName: 'İYİ', color: '#0070C0', textColor: '#ffffff' },
  { id: 'dem', name: 'DEM Parti', shortName: 'DEM', color: '#8B008B', textColor: '#ffffff' },
  { id: 'yeniden-refah', name: 'Yeniden Refah', shortName: 'YRP', color: '#006400', textColor: '#ffffff' },
  { id: 'tip', name: 'TİP', shortName: 'TİP', color: '#8B0000', textColor: '#ffffff' },
  { id: 'zafer', name: 'Zafer Partisi', shortName: 'ZP', color: '#000080', textColor: '#ffffff' },
  { id: 'deva', name: 'DEVA Partisi', shortName: 'DEVA', color: '#008B8B', textColor: '#ffffff' },
  { id: 'gelecek', name: 'Gelecek Partisi', shortName: 'GP', color: '#4169E1', textColor: '#ffffff' },
  { id: 'saadet', name: 'Saadet Partisi', shortName: 'SP', color: '#228B22', textColor: '#ffffff' },
  { id: 'memleket', name: 'Memleket Partisi', shortName: 'MP', color: '#800020', textColor: '#ffffff' },
  { id: 'karasizim', name: 'Kararsızım', shortName: 'Kararsız', color: '#999999', textColor: '#ffffff' },
];

export const PARTY_IDS = PARTIES.map((p) => p.id);

export function getPartyById(id: string): PartyInfo | undefined {
  return PARTIES.find((p) => p.id === id);
}

export function getPartyColor(partyId: string): string {
  return getPartyById(partyId)?.color || '#555555';
}

export function getPartyName(partyId: string): string {
  return getPartyById(partyId)?.name || partyId;
}

export function isValidParty(partyId: string): boolean {
  return PARTIES.some((p) => p.id === partyId);
}

export async function fetchPartiesFromDB(): Promise<PartyInfo[]> {
  try {
    const res = await fetch('/api/parties', { next: { revalidate: 60 } });
    if (!res.ok) return PARTIES;
    const data = await res.json();
    return data.parties.map((p: { slug: string; name: string; short_name: string; color: string; text_color: string; logo_url?: string }) => ({
      id: p.slug,
      name: p.name,
      shortName: p.short_name,
      color: p.color,
      textColor: p.text_color,
      logoUrl: p.logo_url,
    }));
  } catch {
    return PARTIES;
  }
}
