'use client';
import { useState, useEffect } from 'react';
import { badge, btn, input, table } from '@/lib/ui';

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
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
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
        setError(data.error || 'Bir hata oluştu');
        setSaving(false);
        return;
      }

      cancelForm();
      await fetchParties();
    } catch {
      setError('Bir hata oluştu');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-black">Partiler</h1>
        {!showForm && (
          <button
            onClick={openAddForm}
            className={btn.primary}
          >
            Yeni parti ekle
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-neutral-200 p-4 space-y-4"
        >
          <h2 className="text-sm font-bold text-black">
            {editingId ? 'Partiyi Düzenle' : 'Yeni Parti'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Ad
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className={input.text}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Kısaltma
              </label>
              <input
                type="text"
                value={form.short_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, short_name: e.target.value }))
                }
                required
                className={input.text}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                required
                className={input.text}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Sıralama
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value) || 0,
                  }))
                }
                className={input.text}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Renk
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-10 h-10 border border-neutral-200 p-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="flex-1 border border-neutral-200 px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Yazı rengi
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, text_color: e.target.value }))
                  }
                  className="w-10 h-10 border border-neutral-200 p-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.text_color}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, text_color: e.target.value }))
                  }
                  className="flex-1 border border-neutral-200 px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-sm text-black"
              />
            </div>
            {logoPreview && (
              <div className="border border-neutral-200 p-1">
                <img
                  src={logoPreview}
                  alt="Logo önizleme"
                  className="w-10 h-10 object-contain"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="accent-black"
            />
            <label htmlFor="is_active" className="text-sm text-black">
              Etkin
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className={btn.primary}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className={btn.secondary}
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-neutral-500 text-sm">Yükleniyor...</div>
      ) : (
        <div className={table.container}>
          <table className="w-full text-sm">
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Sıra</th>
                <th className={table.th}>Logo</th>
                <th className={table.th}>Ad</th>
                <th className={table.th}>Kısaltma</th>
                <th className={table.th}>Renk</th>
                <th className={table.th}>Durum</th>
                <th className={table.th}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => (
                <tr
                  key={party.id}
                  className={table.row}
                >
                  <td className={table.td}>{party.sort_order}</td>
                  <td className="px-4 py-3">
                    {party.logo_url ? (
                      <img
                        src={party.logo_url}
                        alt={party.name}
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <div
                        className="w-10 h-10"
                        style={{ backgroundColor: party.color }}
                      />
                    )}
                  </td>
                  <td className={`${table.td} font-medium`}>
                    {party.name}
                  </td>
                  <td className={table.td}>{party.short_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 border border-neutral-200"
                        style={{ backgroundColor: party.color }}
                      />
                      <span className="text-neutral-500 text-xs">
                        {party.color}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {party.is_active ? (
                      <span className={badge.positive}>
                        Etkin
                      </span>
                    ) : (
                      <span className={badge.neutral}>
                        Devre dışı
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEditForm(party)}
                      className={btn.small}
                    >
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
              {parties.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className={table.empty}
                  >
                    Henüz parti bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
