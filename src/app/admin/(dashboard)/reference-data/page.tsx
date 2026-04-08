'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminAuth } from '@/lib/admin/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowUpDown, Info } from 'lucide-react';

interface DemographicRow {
  id: number;
  dimension: string;
  category: string;
  population_share: string;
  source: string | null;
  year: number | null;
}

interface ElectionRow {
  id: number;
  party_slug: string;
  vote_share: string;
  vote_count: number | null;
  source: string | null;
}

interface CityElectionRow {
  id: number;
  city: string;
  party_slug: string;
  vote_count: number;
  vote_share: string;
  source: string | null;
}

interface DistrictElectionRow {
  id: number;
  city: string;
  district: string;
  party_slug: string;
  vote_count: number;
  vote_share: string;
  source: string | null;
}

const DIMENSION_LABELS: Record<string, string> = {
  age: 'Yaş',
  gender: 'Cinsiyet',
  education: 'Eğitim',
  region: 'Bölge',
  city: 'İl',
};

type SortDir = 'asc' | 'desc';

function SortButton({ active, dir, onClick }: { active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="size-6 ml-1" onClick={onClick}>
      <ArrowUpDown className={`size-3 ${active ? 'text-foreground' : 'text-muted-foreground/50'}`} />
    </Button>
  );
}

const PAGE_SIZE = 25;

export default function ReferenceDataPage() {
  useAdminAuth();
  const [demographics, setDemographics] = useState<DemographicRow[]>([]);
  const [electionResults, setElectionResults] = useState<ElectionRow[]>([]);
  const [cityElectionResults, setCityElectionResults] = useState<CityElectionRow[]>([]);
  const [districtElectionResults, setDistrictElectionResults] = useState<DistrictElectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dimFilter, setDimFilter] = useState<string>('all');
  const [citySearch, setCitySearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  // Sort
  const [citySort, setCitySort] = useState<{ key: string; dir: SortDir }>({ key: 'city', dir: 'asc' });
  const [districtSort, setDistrictSort] = useState<{ key: string; dir: SortDir }>({ key: 'city', dir: 'asc' });

  // Pagination
  const [cityPage, setCityPage] = useState(1);
  const [districtPage, setDistrictPage] = useState(1);

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = useCallback(() => ({ 'Content-Type': 'application/json' }), []);

  useEffect(() => {
    const dim = dimFilter === 'all' ? '' : dimFilter;
    const url = dim ? `/api/admin/reference-data?dimension=${dim}` : '/api/admin/reference-data';
    fetch(url, { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setDemographics(data.demographics || []);
        setElectionResults(data.electionResults || []);
        setCityElectionResults(data.cityElectionResults || []);
        setDistrictElectionResults(data.districtElectionResults || []);
      })
      .finally(() => setLoading(false));
  }, [headers, dimFilter]);

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await fetch('/api/admin/reference-data', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ id, population_share: editValue }),
      });
      setDemographics(prev => prev.map(d =>
        d.id === id ? { ...d, population_share: parseFloat(editValue).toFixed(6) } : d
      ));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  // Turkish-aware lowercase
  const turkishLower = (s: string) => s.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');

  // City election filtered + sorted + paginated
  const cityFiltered = useMemo(() => {
    const q = turkishLower(citySearch);
    const filtered = q ? cityElectionResults.filter(r => turkishLower(r.city).includes(q)) : cityElectionResults;
    const sorted = [...filtered].sort((a, b) => {
      const dir = citySort.dir === 'asc' ? 1 : -1;
      if (citySort.key === 'city') return a.city.localeCompare(b.city, 'tr') * dir;
      if (citySort.key === 'vote_count') return (a.vote_count - b.vote_count) * dir;
      if (citySort.key === 'vote_share') return (parseFloat(a.vote_share) - parseFloat(b.vote_share)) * dir;
      return 0;
    });
    return sorted;
  }, [cityElectionResults, citySearch, citySort]);

  const cityTotalPages = Math.ceil(cityFiltered.length / PAGE_SIZE);
  const cityPaginated = cityFiltered.slice((cityPage - 1) * PAGE_SIZE, cityPage * PAGE_SIZE);

  // District election filtered + sorted + paginated
  const districtFiltered = useMemo(() => {
    const q = turkishLower(districtSearch);
    const filtered = q
      ? districtElectionResults.filter(r => turkishLower(r.city).includes(q) || turkishLower(r.district).includes(q))
      : districtElectionResults;
    const sorted = [...filtered].sort((a, b) => {
      const dir = districtSort.dir === 'asc' ? 1 : -1;
      if (districtSort.key === 'city') {
        const c = a.city.localeCompare(b.city, 'tr');
        if (c !== 0) return c * dir;
        return a.district.localeCompare(b.district, 'tr') * dir;
      }
      if (districtSort.key === 'vote_count') return (a.vote_count - b.vote_count) * dir;
      if (districtSort.key === 'vote_share') return (parseFloat(a.vote_share) - parseFloat(b.vote_share)) * dir;
      return 0;
    });
    return sorted;
  }, [districtElectionResults, districtSearch, districtSort]);

  const districtTotalPages = Math.ceil(districtFiltered.length / PAGE_SIZE);
  const districtPaginated = districtFiltered.slice((districtPage - 1) * PAGE_SIZE, districtPage * PAGE_SIZE);

  function toggleCitySort(key: string) {
    setCitySort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    setCityPage(1);
  }
  function toggleDistrictSort(key: string) {
    setDistrictSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    setDistrictPage(1);
  }

  if (loading) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-bold mb-1">Referans Veriler</h1>
      <p className="text-sm text-muted-foreground mb-6">
        TÜİK ve YSK referans nüfus dağılımları. Ağırlıklandırma hesaplamalarında kullanılır.
      </p>

      <Tabs defaultValue="demographics">
        <TabsList>
          <TabsTrigger value="demographics">Demografik</TabsTrigger>
          <TabsTrigger value="election">2023 Seçim</TabsTrigger>
          <TabsTrigger value="city">İl Bazlı</TabsTrigger>
          <TabsTrigger value="district">İlçe Bazlı</TabsTrigger>
        </TabsList>

        {/* Demografik Tab */}
        <TabsContent value="demographics" className="mt-6 space-y-4">
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              Bu veriler ağırlıklandırma motorunun referans noktasıdır. Bir değeri değiştirdiğinizde sonuçlar buna göre değişecektir.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2">
            <Select value={dimFilter} onValueChange={(v) => setDimFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Boyut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="age">Yaş</SelectItem>
                <SelectItem value="gender">Cinsiyet</SelectItem>
                <SelectItem value="education">Eğitim</SelectItem>
                <SelectItem value="region">Bölge</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{demographics.length} kayıt</Badge>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boyut</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Nüfus Payı</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead className="w-28">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demographics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Veri bulunamadı</TableCell>
                  </TableRow>
                ) : demographics.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="secondary">{DIMENSION_LABELS[d.dimension] || d.dimension}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{d.category}</TableCell>
                    <TableCell>
                      {editingId === d.id ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          step="0.001"
                          min="0"
                          max="1"
                          className="w-28"
                        />
                      ) : (
                        <span className="font-mono tabular-nums">{(parseFloat(d.population_share) * 100).toFixed(1)}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.source}</TableCell>
                    <TableCell>
                      {editingId === d.id ? (
                        <div className="flex gap-1">
                          <Button variant="outline" onClick={() => handleSave(d.id)} disabled={saving}>
                            Kaydet
                          </Button>
                          <Button variant="ghost" onClick={() => setEditingId(null)}>
                            İptal
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => { setEditingId(d.id); setEditValue(d.population_share); }}
                        >
                          Düzenle
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* 2023 Seçim Tab */}
        <TabsContent value="election" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">2023 Seçim Sonuçları (YSK)</CardTitle>
              <CardDescription>
                Partizan Sapma düzeltmesinde referans olarak kullanılır.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parti</TableHead>
                    <TableHead>Oy Payı</TableHead>
                    <TableHead>Oy Sayısı</TableHead>
                    <TableHead>Kaynak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {electionResults.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.party_slug}</TableCell>
                      <TableCell className="font-mono tabular-nums">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{r.vote_count?.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-muted-foreground">{r.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* İl Bazlı Tab */}
        <TabsContent value="city" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={citySearch}
                  onChange={e => { setCitySearch(e.target.value); setCityPage(1); }}
                  placeholder="İl ara..."
                  className="pl-8 w-56"
                />
              </div>
              <Badge variant="outline">{cityFiltered.length} kayıt</Badge>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    İl
                    <SortButton active={citySort.key === 'city'} dir={citySort.dir} onClick={() => toggleCitySort('city')} />
                  </TableHead>
                  <TableHead>Parti</TableHead>
                  <TableHead>
                    Oy Sayısı
                    <SortButton active={citySort.key === 'vote_count'} dir={citySort.dir} onClick={() => toggleCitySort('vote_count')} />
                  </TableHead>
                  <TableHead>
                    Oy Payı
                    <SortButton active={citySort.key === 'vote_share'} dir={citySort.dir} onClick={() => toggleCitySort('vote_share')} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cityPaginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sonuç bulunamadı</TableCell>
                  </TableRow>
                ) : cityPaginated.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.city}</TableCell>
                    <TableCell>{r.party_slug}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{r.vote_count.toLocaleString('tr-TR')}</TableCell>
                    <TableCell className="font-mono tabular-nums">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {cityTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sayfa {cityPage} / {cityTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCityPage(p => Math.max(1, p - 1))} disabled={cityPage <= 1}>Önceki</Button>
                <Button variant="outline" onClick={() => setCityPage(p => Math.min(cityTotalPages, p + 1))} disabled={cityPage >= cityTotalPages}>Sonraki</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* İlçe Bazlı Tab */}
        <TabsContent value="district" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={districtSearch}
                  onChange={e => { setDistrictSearch(e.target.value); setDistrictPage(1); }}
                  placeholder="İl veya ilçe ara..."
                  className="pl-8 w-64"
                />
              </div>
              <Badge variant="outline">{districtFiltered.length} kayıt</Badge>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    İl
                    <SortButton active={districtSort.key === 'city'} dir={districtSort.dir} onClick={() => toggleDistrictSort('city')} />
                  </TableHead>
                  <TableHead>İlçe</TableHead>
                  <TableHead>Parti</TableHead>
                  <TableHead>
                    Oy Sayısı
                    <SortButton active={districtSort.key === 'vote_count'} dir={districtSort.dir} onClick={() => toggleDistrictSort('vote_count')} />
                  </TableHead>
                  <TableHead>
                    Oy Payı
                    <SortButton active={districtSort.key === 'vote_share'} dir={districtSort.dir} onClick={() => toggleDistrictSort('vote_share')} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {districtPaginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sonuç bulunamadı</TableCell>
                  </TableRow>
                ) : districtPaginated.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{r.city}</TableCell>
                    <TableCell className="font-medium">{r.district}</TableCell>
                    <TableCell>{r.party_slug}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{r.vote_count.toLocaleString('tr-TR')}</TableCell>
                    <TableCell className="font-mono tabular-nums">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {districtTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sayfa {districtPage} / {districtTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDistrictPage(p => Math.max(1, p - 1))} disabled={districtPage <= 1}>Önceki</Button>
                <Button variant="outline" onClick={() => setDistrictPage(p => Math.min(districtTotalPages, p + 1))} disabled={districtPage >= districtTotalPages}>Sonraki</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
