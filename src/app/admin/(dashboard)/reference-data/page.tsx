'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/admin/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function ReferenceDataPage() {
  useAdminAuth();
  const [demographics, setDemographics] = useState<DemographicRow[]>([]);
  const [electionResults, setElectionResults] = useState<ElectionRow[]>([]);
  const [cityElectionResults, setCityElectionResults] = useState<CityElectionRow[]>([]);
  const [districtElectionResults, setDistrictElectionResults] = useState<DistrictElectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDimension, setFilterDimension] = useState<string>('');
  const [cityElectionFilter, setCityElectionFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = useCallback(() => {
    return {
      'Content-Type': 'application/json',
    };
  }, []);

  useEffect(() => {
    const url = filterDimension
      ? `/api/admin/reference-data?dimension=${filterDimension}`
      : '/api/admin/reference-data';
    fetch(url, { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setDemographics(data.demographics || []);
        setElectionResults(data.electionResults || []);
        setCityElectionResults(data.cityElectionResults || []);
        setDistrictElectionResults(data.districtElectionResults || []);
      })
      .finally(() => setLoading(false));
  }, [headers, filterDimension]);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Referans Veriler</h1>
      <p className="text-sm text-muted-foreground mb-4">TÜİK ve YSK referans nüfus dağılımları. Ağırlıklandırma hesaplamalarında kullanılır.</p>

      <Card className="mb-8">
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Bu sayfadaki veriler, ağırlıklandırma motorunun referans noktasıdır. Post-Stratification ve Raking yöntemleri buradaki nüfus paylarını kullanarak anketteki sapmayı düzeltir. Bölgesel Kota yöntemi bölge paylarını, Partizan Sapma düzeltmesi ise 2023 seçim sonuçlarını referans alır.
          </p>
          <p className="text-xs text-muted-foreground">
            Bir değeri değiştirdiğinizde, ağırlıklandırma sonuçları da buna göre değişecektir. Hatalı bir pay girilirse sonuçlar sapabilir. Değişiklik yapmadan önce TÜİK veya YSK kaynaklarını kontrol ediniz.
          </p>
        </CardContent>
      </Card>

      {/* Dimension Filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-muted-foreground">Filtre:</span>
        <Button
          variant={!filterDimension ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterDimension('')}
        >
          Tümü
        </Button>
        {['age', 'gender', 'education', 'region'].map(dim => (
          <Button
            key={dim}
            variant={filterDimension === dim ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterDimension(dim)}
          >
            {DIMENSION_LABELS[dim] || dim}
          </Button>
        ))}
      </div>

      {/* Demographics Table */}
      <section className="mb-12">
        <h2 className="text-lg font-bold mb-2">Demografik Referans Dağılımları</h2>
        <p className="text-xs text-muted-foreground mb-4">TÜİK 2025 verilerine dayalı gerçek nüfus dağılımları. Her kategorinin nüfus payı, anketteki temsil oranıyla karşılaştırılarak ağırlık hesaplanır. Bir payı değiştirmek için satırdaki &quot;Düzenle&quot; butonuna tıklayın.</p>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase">Boyut</TableHead>
                <TableHead className="text-[11px] uppercase">Kategori</TableHead>
                <TableHead className="text-[11px] uppercase">Nüfus Payı</TableHead>
                <TableHead className="text-[11px] uppercase">Kaynak</TableHead>
                <TableHead className="text-[11px] uppercase">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demographics.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">{DIMENSION_LABELS[d.dimension] || d.dimension}</TableCell>
                  <TableCell className="text-sm">{d.category}</TableCell>
                  <TableCell className="text-sm">
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
                      <span className="font-mono">{(parseFloat(d.population_share) * 100).toFixed(1)}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.source}</TableCell>
                  <TableCell>
                    {editingId === d.id ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleSave(d.id)}
                          disabled={saving}
                        >
                          Kaydet
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setEditingId(null)}
                        >
                          İptal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="xs"
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
      </section>

      {/* Election Results */}
      <section>
        <h2 className="text-lg font-bold mb-2">2023 Seçim Sonuçları (YSK)</h2>
        <p className="text-xs text-muted-foreground mb-4">
          YSK resmi sonuçları. Partizan Sapma düzeltmesinde referans olarak kullanılır. Anketteki kullanıcıların beyan ettiği 2023 oyları bu değerlerle karşılaştırılır — eğer belirli bir parti fazla temsil ediliyorsa, o parti seçmenlerinin ağırlığı orantılı olarak düzeltilir.
        </p>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase">Parti</TableHead>
                <TableHead className="text-[11px] uppercase">Oy Payı</TableHead>
                <TableHead className="text-[11px] uppercase">Oy Sayısı</TableHead>
                <TableHead className="text-[11px] uppercase">Kaynak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {electionResults.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.party_slug}</TableCell>
                  <TableCell className="text-sm font-mono">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.vote_count?.toLocaleString('tr-TR')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* City-Level Election Results */}
      <section className="mt-12">
        <h2 className="text-lg font-bold mb-2">2023 İl Bazlı Seçim Sonuçları (YSK)</h2>
        <p className="text-xs text-muted-foreground mb-4">
          İl bazlı YSK 2023 milletvekili seçim sonuçları. Haritada beraberliklerde hangi partinin önde gösterileceğini belirlemek için tiebreaker olarak kullanılır.
        </p>

        <div className="mb-4">
          <Input
            type="text"
            value={cityElectionFilter}
            onChange={e => setCityElectionFilter(e.target.value)}
            placeholder="İl ara..."
            className="w-64"
          />
        </div>

        <Card>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-[11px] uppercase">İl</TableHead>
                  <TableHead className="text-[11px] uppercase">Parti</TableHead>
                  <TableHead className="text-[11px] uppercase">Oy Sayısı</TableHead>
                  <TableHead className="text-[11px] uppercase">Oy Payı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const q = cityElectionFilter.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
                  const filtered = q
                    ? cityElectionResults.filter(r =>
                        r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q)
                      )
                    : cityElectionResults;
                  const sorted = [...filtered].sort((a, b) => {
                    const cityCompare = a.city.localeCompare(b.city, 'tr');
                    if (cityCompare !== 0) return cityCompare;
                    return b.vote_count - a.vote_count;
                  });
                  return sorted.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.city}</TableCell>
                      <TableCell className="text-sm">{r.party_slug}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{r.vote_count.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-sm font-mono">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">
          Toplam {cityElectionResults.length} kayıt &middot; {[...new Set(cityElectionResults.map(r => r.city))].length} il
        </p>
      </section>

      {/* District-Level Election Results */}
      <section className="mt-12">
        <h2 className="text-lg font-bold mb-2">2023 İlçe Bazlı Seçim Sonuçları (YSK)</h2>
        <p className="text-xs text-muted-foreground mb-4">
          İlçe bazlı YSK 2023 milletvekili seçim sonuçları. İlçe düzeyinde ağırlıklandırma ve tiebreaker hesaplamalarında kullanılır.
        </p>

        <Card>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-[11px] uppercase">İl</TableHead>
                  <TableHead className="text-[11px] uppercase">İlçe</TableHead>
                  <TableHead className="text-[11px] uppercase">Parti</TableHead>
                  <TableHead className="text-[11px] uppercase">Oy Sayısı</TableHead>
                  <TableHead className="text-[11px] uppercase">Oy Payı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const q = cityElectionFilter.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
                  const filtered = q
                    ? districtElectionResults.filter(r =>
                        r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q) ||
                        r.district.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q)
                      )
                    : districtElectionResults;
                  const sorted = [...filtered].sort((a, b) => {
                    const cityCompare = a.city.localeCompare(b.city, 'tr');
                    if (cityCompare !== 0) return cityCompare;
                    const distCompare = a.district.localeCompare(b.district, 'tr');
                    if (distCompare !== 0) return distCompare;
                    return b.vote_count - a.vote_count;
                  });
                  return sorted.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{r.city}</TableCell>
                      <TableCell className="text-sm font-medium">{r.district}</TableCell>
                      <TableCell className="text-sm">{r.party_slug}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{r.vote_count.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-sm font-mono">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">
          Toplam {districtElectionResults.length} kayıt &middot; {[...new Set(districtElectionResults.map(r => `${r.city}|${r.district}`))].length} ilçe
        </p>
      </section>
    </div>
  );
}
