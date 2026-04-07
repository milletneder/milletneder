'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0, 23, 59);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  };
  return { start: fmt(firstDay), end: fmt(lastDay) };
}

export default function NewRoundPage() {
  const router = useRouter();
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      const res = await fetch('/api/admin/rounds', {
        method: 'POST',
        headers,
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Tur olusturulamadi');
        setLoading(false);
        return;
      }

      router.push('/admin/rounds');
    } catch {
      setError('Bir hata olustu');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-bold text-black mb-6">Yeni Tur Olustur</h1>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Baslangic Tarihi</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Bitis Tarihi</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Olusturuluyor...' : 'Olustur'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/rounds')}
              >
                Iptal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
