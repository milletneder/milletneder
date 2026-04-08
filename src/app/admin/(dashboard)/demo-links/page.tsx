'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Link2, Plus, Copy, Loader2, XCircle } from 'lucide-react';

interface PartyOption {
  id: number;
  slug: string;
  name: string;
  short_name: string;
}

interface DemoTokenItem {
  id: number;
  token: string;
  party_name: string | null;
  party_id: number | null;
  expires_at: string;
  is_active: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
}

function getAdminToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function DemoLinksPage() {
  const [tokens, setTokens] = useState<DemoTokenItem[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedParty, setSelectedParty] = useState('');
  const [duration, setDuration] = useState('14');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/demo-tokens', {
        headers: { 'x-admin-token': getAdminToken() },
      });
      if (res.ok) {
        const d = await res.json();
        setTokens(d.tokens || []);
        if (d.parties) setParties(d.parties);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  async function handleCreate() {
    if (!selectedParty) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/demo-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken(),
        },
        body: JSON.stringify({
          party_id: Number(selectedParty),
          duration_days: Number(duration),
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setSelectedParty('');
        setDuration('14');
        await fetchTokens();
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: number) {
    try {
      await fetch('/api/admin/demo-tokens', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken(),
        },
        body: JSON.stringify({ id, is_active: false }),
      });
      await fetchTokens();
    } catch {
      // silent
    }
  }

  function copyLink(token: string, id: number) {
    const url = `${window.location.origin}/demo/parti?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const activeCount = tokens.filter((t) => t.is_active && new Date(t.expires_at) > new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demo Linkleri</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Parti dashboard demo erisimi icin link olusturun ve yonetin.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={false}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Demo Link Olustur
            </Button>
          </DialogTrigger>
          <DialogContent showOverlay={false}>
            <DialogHeader>
              <DialogTitle>Yeni Demo Link</DialogTitle>
              <DialogDescription>
                Belirli bir parti icin sureli demo erisim linki olusturun.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                <Label>Sure</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 gun</SelectItem>
                    <SelectItem value="14">14 gun</SelectItem>
                    <SelectItem value="30">30 gun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Iptal
              </Button>
              <Button onClick={handleCreate} disabled={creating || !selectedParty}>
                {creating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Olustur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{tokens.length}</div>
            <p className="text-xs text-neutral-500">Toplam link</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-neutral-500">Aktif link</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {tokens.reduce((s, t) => s + t.access_count, 0)}
            </div>
            <p className="text-xs text-neutral-500">Toplam erisim</p>
          </CardContent>
        </Card>
      </div>

      {/* Token list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tum Demo Linkleri</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Link2 className="h-8 w-8 text-neutral-300 mb-2" />
              <p className="text-sm text-neutral-400">Henuz demo linki olusturulmadi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parti</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Bitis</TableHead>
                  <TableHead className="text-right">Erisim</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Islem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => {
                  const expired = new Date(t.expires_at) < new Date();
                  const active = t.is_active && !expired;

                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.party_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-neutral-50 dark:bg-neutral-900 px-1.5 py-0.5 rounded">
                            {t.token.slice(0, 12)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyLink(t.token, t.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {copiedId === t.id && (
                            <span className="text-xs text-neutral-400">Kopyalandi</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(t.expires_at).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-right">{t.access_count}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {active ? 'Aktif' : expired ? 'Suresi Dolmus' : 'Deaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleDeactivate(t.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Deaktif Et
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
