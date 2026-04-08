'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DownloadIcon, Loader2Icon } from 'lucide-react';

const DATA_TYPES = [
  { value: 'results', label: 'Parti Sonuclari' },
  { value: 'cities', label: 'Il Kirilimlari' },
  { value: 'demographics', label: 'Demografik Dagilimlar' },
  { value: 'districts', label: 'Ilce Verileri' },
];

export default function ExportPage() {
  const { token } = useAuth();
  const [dataType, setDataType] = useState('results');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/export/csv?type=${dataType}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Export basarisiz');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milletneder-${dataType}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = DATA_TYPES.find((t) => t.value === dataType)?.label || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          CSV Export
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Anket verilerini CSV formatinda indirin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Veri Tipi Secin</CardTitle>
          <CardDescription>
            Indirmek istediginiz veri turunu ve formatini belirleyin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Veri Tipi
              </label>
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Veri tipi secin" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Format
              </label>
              <Select value="csv" disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="CSV" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-700">
              {error}
            </div>
          )}

          <Button
            onClick={handleDownload}
            disabled={loading || !token}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <DownloadIcon className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Hazirlaniyor...' : `${selectedLabel} Indir (CSV)`}
          </Button>
        </CardContent>
      </Card>

      {/* Data Type Descriptions */}
      <div className="grid gap-4 sm:grid-cols-2">
        {DATA_TYPES.map((type) => (
          <Card key={type.value}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{type.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {type.value === 'results' &&
                  'Aktif turun parti bazli agirlikli ve ham oy sonuclari. Parti adi, oy sayisi, agirlikli oran.'}
                {type.value === 'cities' &&
                  '81 il bazinda parti oy dagilimi. Il, parti, oy sayisi ve oran.'}
                {type.value === 'demographics' &&
                  'Yas, cinsiyet, egitim ve gelir gruplarina gore parti tercihi dagilimi.'}
                {type.value === 'districts' &&
                  'Ilce bazinda oy dagilimi. Il, ilce, parti, oy sayisi.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
