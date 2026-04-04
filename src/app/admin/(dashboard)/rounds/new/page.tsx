'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { btn, input } from '@/lib/ui';

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
      const token = localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['X-Admin-Token'] = token;

      const res = await fetch('/api/admin/rounds', {
        method: 'POST',
        headers,
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Tur oluşturulamadı');
        setLoading(false);
        return;
      }

      router.push('/admin/rounds');
    } catch {
      setError('Bir hata oluştu');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-bold text-black mb-6">Yeni Tur Oluştur</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-black mb-1"
          >
            Başlangıç Tarihi
          </label>
          <input
            id="startDate"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={input.text}
          />
        </div>

        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-black mb-1"
          >
            Bitiş Tarihi
          </label>
          <input
            id="endDate"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className={input.text}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className={btn.primary}
          >
            {loading ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/rounds')}
            className={btn.secondary}
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
