'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { KeyRound, Plus, Copy, Check, Loader2, XCircle, CheckCircle } from 'lucide-react';

interface PartyOption {
  id: number;
  slug: string;
  name: string;
  short_name: string;
}

interface PartyAccountItem {
  id: number;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  party_id: number;
  party_name: string | null;
  party_short_name: string | null;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%&';
  let pw = '';
  for (let i = 0; i < 16; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

export default function PartiHesaplariPage() {
  const [accounts, setAccounts] = useState<PartyAccountItem[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState(generatePassword());
  const [selectedParty, setSelectedParty] = useState('');
  const [createError, setCreateError] = useState('');
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/party-accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setParties(data.parties || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleCreate() {
    setCreateError('');
    if (!newEmail || !selectedParty || !newPassword || newPassword.length < 8) {
      setCreateError('Tum alanlar gerekli. Sifre en az 8 karakter.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/party-accounts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          party_id: Number(selectedParty),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || 'Hesap olusturulamadi');
        setCreating(false);
        return;
      }

      // Basari: sifreyi ayri bir dialog'da goster
      setCreatedInfo({ email: newEmail, password: newPassword });
      setDialogOpen(false);
      setNewEmail('');
      setSelectedParty('');
      setNewPassword(generatePassword());
      await fetchAccounts();
    } catch {
      setCreateError('Bir hata olustu');
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(id: number, action: 'activate' | 'deactivate') {
    try {
      await fetch(`/api/admin/party-accounts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchAccounts();
    } catch {
      // silent
    }
  }

  function copyPassword() {
    if (!createdInfo) return;
    navigator.clipboard.writeText(createdInfo.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const activeCount = accounts.filter((a) => a.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parti Hesaplari</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Siyasi parti kurumsal hesap yonetimi. Hesaplar /parti/giris uzerinden login olur.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Yeni Hesap
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Parti Hesabi</DialogTitle>
              <DialogDescription>
                Parti kurumsal hesabi olustur. E-posta ve sifre parti ile paylasilmalidir.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="parti@ornek.org"
                />
              </div>

              <div className="space-y-2">
                <Label>Parti</Label>
                <Select value={selectedParty} onValueChange={setSelectedParty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Parti secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.short_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Sifre</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewPassword(generatePassword())}
                  >
                    Yeniden Uret
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  En az 8 karakter. Bu sifre sadece bir kez gosterilir, kaydedin.
                </p>
              </div>

              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Iptal
              </Button>
              <Button onClick={handleCreate} disabled={creating || !newEmail || !selectedParty}>
                {creating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Olustur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Password display dialog (after create) */}
      <Dialog open={!!createdInfo} onOpenChange={(open) => !open && setCreatedInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hesap Olusturuldu</DialogTitle>
            <DialogDescription>
              Sifreyi kopyalayin — bu ekrandan sonra tekrar gosterilmeyecek.
            </DialogDescription>
          </DialogHeader>
          {createdInfo && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs text-muted-foreground">E-posta</Label>
                <p className="text-sm font-mono mt-1">{createdInfo.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sifre</Label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono break-all">
                    {createdInfo.password}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyPassword}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedInfo(null)}>Tamam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Toplam hesap</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Aktif hesap</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{parties.length}</div>
            <p className="text-xs text-muted-foreground">Aktif parti</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tum Parti Hesaplari</CardTitle>
          <CardDescription>Giris, durum ve parti atamasi</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <KeyRound className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Henuz parti hesabi yok</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Parti</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Son Giris</TableHead>
                  <TableHead>Olusturuldu</TableHead>
                  <TableHead className="text-right">Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {a.party_short_name || a.party_name || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {a.is_active ? 'Aktif' : 'Deaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.last_login_at
                        ? new Date(a.last_login_at).toLocaleDateString('tr-TR')
                        : 'Hic'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAction(a.id, 'deactivate')}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Deaktif Et
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAction(a.id, 'activate')}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Aktif Et
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
