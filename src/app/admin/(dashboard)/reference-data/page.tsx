'use client';

import { useState, useEffect, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';

// ── Types ──

interface DemographicRow {
  id: number;
  dimension: string;
  category: string;
  population_share: string;
  source: string | null;
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
}

interface DistrictElectionRow {
  id: number;
  city: string;
  district: string;
  party_slug: string;
  vote_count: number;
  vote_share: string;
}

const DIM_LABELS: Record<string, string> = {
  age: 'Yaş', gender: 'Cinsiyet', education: 'Eğitim', region: 'Bölge', city: 'İl',
};

// ── Column Definitions ──

const electionColumns: ColumnDef<ElectionRow>[] = [
  {
    accessorKey: 'party_slug',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Parti <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-medium">{row.getValue('party_slug')}</span>,
  },
  {
    accessorKey: 'vote_share',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Oy Payı <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-mono tabular-nums">{(parseFloat(row.getValue('vote_share')) * 100).toFixed(1)}%</span>,
  },
  {
    accessorKey: 'vote_count',
    header: 'Oy Sayısı',
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{(row.getValue('vote_count') as number)?.toLocaleString('tr-TR')}</span>,
  },
  {
    accessorKey: 'source',
    header: 'Kaynak',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('source')}</span>,
  },
];

const cityColumns: ColumnDef<CityElectionRow>[] = [
  {
    accessorKey: 'city',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        İl <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-medium">{row.getValue('city')}</span>,
  },
  { accessorKey: 'party_slug', header: 'Parti' },
  {
    accessorKey: 'vote_count',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Oy Sayısı <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{(row.getValue('vote_count') as number).toLocaleString('tr-TR')}</span>,
  },
  {
    accessorKey: 'vote_share',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Oy Payı <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-mono tabular-nums">{(parseFloat(row.getValue('vote_share')) * 100).toFixed(1)}%</span>,
  },
];

const districtColumns: ColumnDef<DistrictElectionRow>[] = [
  {
    accessorKey: 'city',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        İl <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('city')}</span>,
  },
  {
    accessorKey: 'district',
    header: 'İlçe',
    cell: ({ row }) => <span className="font-medium">{row.getValue('district')}</span>,
  },
  { accessorKey: 'party_slug', header: 'Parti' },
  {
    accessorKey: 'vote_count',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Oy Sayısı <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{(row.getValue('vote_count') as number).toLocaleString('tr-TR')}</span>,
  },
  {
    accessorKey: 'vote_share',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()}>
        Oy Payı <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-mono tabular-nums">{(parseFloat(row.getValue('vote_share')) * 100).toFixed(1)}%</span>,
  },
];

// ── Page Component ──

export default function ReferenceDataPage() {
  useAdminAuth();
  const [demographics, setDemographics] = useState<DemographicRow[]>([]);
  const [electionResults, setElectionResults] = useState<ElectionRow[]>([]);
  const [cityResults, setCityResults] = useState<CityElectionRow[]>([]);
  const [districtResults, setDistrictResults] = useState<DistrictElectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimFilter, setDimFilter] = useState('all');
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
        setCityResults(data.cityElectionResults || []);
        setDistrictResults(data.districtElectionResults || []);
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

  // Demographic columns with inline edit
  const demographicColumns: ColumnDef<DemographicRow>[] = [
    {
      accessorKey: 'dimension',
      header: 'Boyut',
      cell: ({ row }) => <Badge variant="secondary">{DIM_LABELS[row.getValue('dimension') as string] || row.getValue('dimension')}</Badge>,
    },
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          Kategori <ArrowUpDown className="ml-1 size-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue('category')}</span>,
    },
    {
      accessorKey: 'population_share',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          Nüfus Payı <ArrowUpDown className="ml-1 size-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const d = row.original;
        if (editingId === d.id) {
          return (
            <Input
              type="number"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              step="0.001" min="0" max="1"
              className="w-28"
            />
          );
        }
        return <span className="font-mono tabular-nums">{(parseFloat(d.population_share) * 100).toFixed(1)}%</span>;
      },
    },
    {
      accessorKey: 'source',
      header: 'Kaynak',
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('source')}</span>,
    },
    {
      id: 'actions',
      header: 'İşlem',
      cell: ({ row }) => {
        const d = row.original;
        if (editingId === d.id) {
          return (
            <div className="flex gap-1">
              <Button variant="outline" onClick={() => handleSave(d.id)} disabled={saving}>Kaydet</Button>
              <Button variant="ghost" onClick={() => setEditingId(null)}>İptal</Button>
            </div>
          );
        }
        return (
          <Button variant="ghost" className="text-muted-foreground" onClick={() => { setEditingId(d.id); setEditValue(d.population_share); }}>
            Düzenle
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-10 w-full" />
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

        {/* Demografik */}
        <TabsContent value="demographics" className="mt-6 space-y-4">
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              Bu veriler ağırlıklandırma motorunun referans noktasıdır. Bir değeri değiştirdiğinizde sonuçlar buna göre değişecektir.
            </AlertDescription>
          </Alert>

          <Select value={dimFilter} onValueChange={setDimFilter}>
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

          <DataTable columns={demographicColumns} data={demographics} searchKey="category" searchPlaceholder="Kategori ara..." />
        </TabsContent>

        {/* 2023 Seçim */}
        <TabsContent value="election" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">2023 Seçim Sonuçları (YSK)</CardTitle>
              <CardDescription>Partizan Sapma düzeltmesinde referans olarak kullanılır.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable columns={electionColumns} data={electionResults} searchKey="party_slug" searchPlaceholder="Parti ara..." />
            </CardContent>
          </Card>
        </TabsContent>

        {/* İl Bazlı */}
        <TabsContent value="city" className="mt-6">
          <DataTable columns={cityColumns} data={cityResults} searchKey="city" searchPlaceholder="İl ara..." pageSize={25} />
        </TabsContent>

        {/* İlçe Bazlı */}
        <TabsContent value="district" className="mt-6">
          <DataTable columns={districtColumns} data={districtResults} searchKey="city" searchPlaceholder="İl veya ilçe ara..." pageSize={25} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
