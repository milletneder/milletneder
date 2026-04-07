'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Party {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  color: string;
  text_color: string;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface PartyForm {
  name: string;
  short_name: string;
  slug: string;
  color: string;
  text_color: string;
  sort_order: number;
  is_active: boolean;
  logo: File | null;
}

const emptyForm: PartyForm = {
  name: '',
  short_name: '',
  slug: '',
  color: '#555555',
  text_color: '#ffffff',
  sort_order: 0,
  is_active: true,
  logo: null,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getAdminHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  return headers;
}

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PartyForm>(emptyForm);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchParties() {
    try {
      const headers = getAdminHeaders();
      const res = await fetch('/api/admin/parties', { headers });
      if (res.ok) {
        const data = await res.json();
        setParties(data.parties || []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchParties();
  }, []);

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : slugify(name),
    }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, logo: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setLogoPreview(null);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(party: Party) {
    setEditingId(party.id);
    setForm({
      name: party.name,
      short_name: party.short_name,
      slug: party.slug,
      color: party.color,
      text_color: party.text_color,
      sort_order: party.sort_order,
      is_active: party.is_active,
      logo: null,
    });
    setLogoPreview(party.logo_url);
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setLogoPreview(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('short_name', form.short_name);
      fd.append('slug', form.slug);
      fd.append('color', form.color);
      fd.append('text_color', form.text_color);
      fd.append('sort_order', String(form.sort_order));
      fd.append('is_active', String(form.is_active));
      if (form.logo) fd.append('logo', form.logo);

      const headers = getAdminHeaders();
      const url = editingId
        ? `/api/admin/parties/${editingId}`
        : '/api/admin/parties';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, headers, body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Bir hata olustu');
        setSaving(false);
        return;
      }

      cancelForm();
      await fetchParties();
    } catch {
      setError('Bir hata olustu');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-black">Partiler</h1>
        <Button onClick={openAddForm}>Yeni parti ekle</Button>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) cancelForm(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Partiyi Duzenle' : 'Yeni Parti'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border border-neutral-300 bg-neutral-50 text-neutral-800 px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="party-name">Ad</Label>
                <Input
                  id="party-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-short-name">Kisaltma</Label>
                <Input
                  id="party-short-name"
                  type="text"
                  value={form.short_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, short_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-slug">Slug</Label>
                <Input
                  id="party-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-sort-order">Siralama</Label>
                <Input
                  id="party-sort-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Renk</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="w-10 h-8 rounded-lg border border-input p-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={form.color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Yazi rengi</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.text_color}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        text_color: e.target.value,
                      }))
                    }
                    className="w-10 h-8 rounded-lg border border-input p-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={form.text_color}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        text_color: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="party-logo">Logo</Label>
                <Input
                  id="party-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </div>
              {logoPreview && (
                <div className="border border-input rounded-lg p-1">
                  <img
                    src={logoPreview}
                    alt="Logo onizleme"
                    className="w-10 h-10 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: !!checked }))
                }
              />
              <Label htmlFor="is_active">Etkin</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={cancelForm}
              >
                Iptal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <Card>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Parti Listesi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sira</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Kisaltma</TableHead>
                  <TableHead>Renk</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Islemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parties.map((party) => (
                  <TableRow key={party.id}>
                    <TableCell>{party.sort_order}</TableCell>
                    <TableCell>
                      {party.logo_url ? (
                        <img
                          src={party.logo_url}
                          alt={party.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded"
                          style={{ backgroundColor: party.color }}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{party.short_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-input"
                          style={{ backgroundColor: party.color }}
                        />
                        <span className="text-muted-foreground text-xs">
                          {party.color}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {party.is_active ? (
                        <Badge variant="default">Etkin</Badge>
                      ) : (
                        <Badge variant="secondary">Devre disi</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditForm(party)}
                      >
                        Duzenle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {parties.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      Henuz parti bulunmuyor.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
