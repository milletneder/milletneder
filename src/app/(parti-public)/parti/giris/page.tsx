'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PartiGirisPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/parti/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giris basarisiz');
        setLoading(false);
        return;
      }

      // Token sadece cookie'de — JS'den okunmaz.
      // localStorage'a sadece metadata (email, party info) yaz.
      localStorage.setItem(
        'party_data',
        JSON.stringify({ account: data.account, party: data.party }),
      );
      router.push('/parti');
    } catch {
      setError('Bir hata olustu. Lutfen tekrar deneyin.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm font-bold">milletneder</span>
            <Badge variant="outline">Parti Paneli</Badge>
          </div>
          <CardTitle className="text-lg">Kurumsal Giris</CardTitle>
          <CardDescription className="text-xs">
            Siyasi parti paneli kurumsal bir urundur. Giris bilgilerinizi milletneder ekibi sizinle paylasir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="parti@ornek.org"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Sifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-destructive text-sm text-center">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
            Hesap olusturma veya sifre sorunu icin{' '}
            <a
              href="mailto:iletisim@milletneder.com"
              className="underline hover:text-foreground"
            >
              iletisim@milletneder.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
