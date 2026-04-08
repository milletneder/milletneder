'use client';

import { useState, useCallback } from 'react';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Loader2Icon, TableIcon } from 'lucide-react';

const ROW_DIMENSIONS = [
  { value: 'city', label: 'Il' },
  { value: 'age', label: 'Yas' },
  { value: 'gender', label: 'Cinsiyet' },
  { value: 'education', label: 'Egitim' },
  { value: 'income', label: 'Gelir' },
];

interface CrossTableData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  total: number;
  rowDimension: string;
}

export default function CrossTablePage() {
  const { token } = useAuth();
  const [rowDim, setRowDim] = useState('city');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CrossTableData | null>(null);

  const fetchCrossTable = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/researcher/cross-table?rows=${rowDim}&cols=party`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Capraz tablo olusturulamadi');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }, [token, rowDim]);

  const rowLabel = ROW_DIMENSIONS.find((d) => d.value === rowDim)?.label || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Capraz Tablo
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Boyutlar arasi capraz tablo analizi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boyut Secimi</CardTitle>
          <CardDescription>
            Satir boyutunu secin. Sutun boyutu daima &quot;Parti&quot; olarak sabitlenmistir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Satir Boyutu
              </label>
              <Select value={rowDim} onValueChange={setRowDim}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Boyut secin" />
                </SelectTrigger>
                <SelectContent>
                  {ROW_DIMENSIONS.map((dim) => (
                    <SelectItem key={dim.value} value={dim.value}>
                      {dim.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Sutun Boyutu
              </label>
              <Select value="party" disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Parti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="party">Parti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={fetchCrossTable}
            disabled={loading || !token}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TableIcon className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Hesaplaniyor...' : 'Tablo Olustur'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-neutral-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {rowLabel} x Parti Capraz Tablosu
            </CardTitle>
            <CardDescription>
              Toplam {result.total.toLocaleString('tr-TR')} oy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">{rowLabel}</TableHead>
                    {result.columns.map((col) => (
                      <TableHead key={col} className="text-right">
                        {col}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row) => {
                    const rowData = result.data[row] || {};
                    const rowTotal = Object.values(rowData).reduce(
                      (sum, val) => sum + val,
                      0
                    );
                    return (
                      <TableRow key={row}>
                        <TableCell className="font-medium">{row}</TableCell>
                        {result.columns.map((col) => (
                          <TableCell key={col} className="text-right tabular-nums">
                            {(rowData[col] || 0).toLocaleString('tr-TR')}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold tabular-nums">
                          {rowTotal.toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
