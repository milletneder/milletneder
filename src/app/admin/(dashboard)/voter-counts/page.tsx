'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/admin/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface VoterCountRow {
  id: number;
  city: string;
  voter_count: number;
  source: string | null;
  year: number | null;
}

interface DistrictVoterCountRow {
  id: number;
  city: string;
  district: string;
  voter_count: number;
  source: string | null;
  year: number | null;
}

export default function VoterCountsPage() {
  useAdminAuth();
  const [rows, setRows] = useState<VoterCountRow[]>([]);
  const [districtRows, setDistrictRows] = useState<DistrictVoterCountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState<'city' | 'district'>('city');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('il');

  const headers = useCallback(() => {
    return {
      'Content-Type': 'application/json',
    };
  }, []);

  useEffect(() => {
    fetch('/api/admin/voter-counts', { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setRows(data.voterCounts || []);
        setDistrictRows(data.districtVoterCounts || []);
      })
      .finally(() => setLoading(false));
  }, [headers]);

  const handleSave = async (id: number, type: 'city' | 'district') => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/voter-counts', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ id, voter_count: editValue, type }),
      });
      if (res.ok) {
        if (type === 'city') {
          setRows(prev => prev.map(r =>
            r.id === id ? { ...r, voter_count: parseInt(editValue) } : r
          ));
        } else {
          setDistrictRows(prev => prev.map(r =>
            r.id === id ? { ...r, voter_count: parseInt(editValue) } : r
          ));
        }
        setEditingId(null);
        setEditType('city');
      }
    } finally {
      setSaving(false);
    }
  };

  const totalVoters = rows.reduce((sum, r) => sum + r.voter_count, 0);
  const totalDistrictVoters = districtRows.reduce((sum, r) => sum + r.voter_count, 0);

  const q = searchQuery.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
  const filteredCities = q
    ? rows.filter(r => r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q))
    : rows;
  const sortedCities = [...filteredCities].sort((a, b) => a.city.localeCompare(b.city, 'tr'));

  const filteredDistricts = q
    ? districtRows.filter(r =>
        r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q) ||
        r.district.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q)
      )
    : districtRows;
  const sortedDistricts = [...filteredDistricts].sort((a, b) =>
    a.city.localeCompare(b.city, 'tr') || a.district.localeCompare(b.district, 'tr')
  );

  // Il bazli ilce gruplama
  const districtsByCity: Record<string, DistrictVoterCountRow[]> = {};
  for (const d of districtRows) {
    if (!districtsByCity[d.city]) districtsByCity[d.city] = [];
    districtsByCity[d.city].push(d);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Secmen Sayilari</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Il ve ilce bazli kayitli secmen sayilari. Temsil Orani Siralamasi hesaplamalarinda kullanilir.
      </p>

      <Card className="mb-6">
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Temsil orani = oy sayisi / secmen sayisi. Bu tablo YSK 2023 verilerine dayanmaktadir.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span>Il toplam: <span className="font-mono font-medium text-foreground">{totalVoters.toLocaleString('tr-TR')}</span> ({rows.length} il)</span>
            <span>Ilce toplam: <span className="font-mono font-medium text-foreground">{totalDistrictVoters.toLocaleString('tr-TR')}</span> ({districtRows.length} ilce)</span>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="il">Il Bazli ({rows.length})</TabsTrigger>
          <TabsTrigger value="ilce">Ilce Bazli ({districtRows.length})</TabsTrigger>
        </TabsList>

        <div className="mb-4">
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'il' ? 'Il ara...' : 'Il veya ilce ara...'}
            className="w-64"
          />
        </div>

        <TabsContent value="il">
          {/* Il Tablosu */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] uppercase">Il</TableHead>
                  <TableHead className="text-[11px] uppercase">Secmen Sayisi</TableHead>
                  <TableHead className="text-[11px] uppercase">Ilce Sayisi</TableHead>
                  <TableHead className="text-[11px] uppercase">Kaynak</TableHead>
                  <TableHead className="text-[11px] uppercase">Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCities.map(r => {
                  const cityDistricts = districtsByCity[r.city] || [];
                  const isExpanded = expandedCity === r.city;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">
                        {cityDistricts.length > 0 ? (
                          <button
                            onClick={() => setExpandedCity(isExpanded ? null : r.city)}
                            className="flex items-center gap-1 hover:text-muted-foreground"
                          >
                            <span className="text-[10px] text-muted-foreground">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                            {r.city}
                          </button>
                        ) : r.city}
                      </TableCell>
                      <TableCell className="text-sm">
                        {editingId === r.id && editType === 'city' ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            min="0"
                            className="w-32 font-mono"
                          />
                        ) : (
                          <span className="font-mono">{r.voter_count.toLocaleString('tr-TR')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{cityDistricts.length}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.source}</TableCell>
                      <TableCell>
                        {editingId === r.id && editType === 'city' ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="xs" onClick={() => handleSave(r.id, 'city')} disabled={saving}>
                              Kaydet
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => setEditingId(null)}>
                              Iptal
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground"
                            onClick={() => { setEditingId(r.id); setEditType('city'); setEditValue(String(r.voter_count)); }}
                          >
                            Duzenle
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="ilce">
          {/* Ilce Tablosu */}
          <Card>
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="text-[11px] uppercase">Il</TableHead>
                    <TableHead className="text-[11px] uppercase">Ilce</TableHead>
                    <TableHead className="text-[11px] uppercase">Secmen Sayisi</TableHead>
                    <TableHead className="text-[11px] uppercase">Kaynak</TableHead>
                    <TableHead className="text-[11px] uppercase">Islem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDistricts.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{r.city}</TableCell>
                      <TableCell className="text-sm font-medium">{r.district}</TableCell>
                      <TableCell className="text-sm">
                        {editingId === r.id && editType === 'district' ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            min="0"
                            className="w-32 font-mono"
                          />
                        ) : (
                          <span className="font-mono">{r.voter_count.toLocaleString('tr-TR')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.source}</TableCell>
                      <TableCell>
                        {editingId === r.id && editType === 'district' ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="xs" onClick={() => handleSave(r.id, 'district')} disabled={saving}>
                              Kaydet
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => setEditingId(null)}>
                              Iptal
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground"
                            onClick={() => { setEditingId(r.id); setEditType('district'); setEditValue(String(r.voter_count)); }}
                          >
                            Duzenle
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
