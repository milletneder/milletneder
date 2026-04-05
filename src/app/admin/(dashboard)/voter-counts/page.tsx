'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/admin/hooks';

interface VoterCountRow {
  id: number;
  city: string;
  voter_count: number;
  source: string | null;
  year: number | null;
}

interface DistrictVoterCountRow {
  id: number;
  city: string;
  district: string;
  voter_count: number;
  source: string | null;
  year: number | null;
}

export default function VoterCountsPage() {
  useAdminAuth();
  const [rows, setRows] = useState<VoterCountRow[]>([]);
  const [districtRows, setDistrictRows] = useState<DistrictVoterCountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState<'city' | 'district'>('city');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'il' | 'ilce'>('il');

  const headers = useCallback(() => {
    return {
      'Content-Type': 'application/json',
    };
  }, []);

  useEffect(() => {
    fetch('/api/admin/voter-counts', { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setRows(data.voterCounts || []);
        setDistrictRows(data.districtVoterCounts || []);
      })
      .finally(() => setLoading(false));
  }, [headers]);

  const handleSave = async (id: number, type: 'city' | 'district') => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/voter-counts', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ id, voter_count: editValue, type }),
      });
      if (res.ok) {
        if (type === 'city') {
          setRows(prev => prev.map(r =>
            r.id === id ? { ...r, voter_count: parseInt(editValue) } : r
          ));
        } else {
          setDistrictRows(prev => prev.map(r =>
            r.id === id ? { ...r, voter_count: parseInt(editValue) } : r
          ));
        }
        setEditingId(null);
        setEditType('city');
      }
    } finally {
      setSaving(false);
    }
  };

  const totalVoters = rows.reduce((sum, r) => sum + r.voter_count, 0);
  const totalDistrictVoters = districtRows.reduce((sum, r) => sum + r.voter_count, 0);

  const q = searchQuery.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
  const filteredCities = q
    ? rows.filter(r => r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q))
    : rows;
  const sortedCities = [...filteredCities].sort((a, b) => a.city.localeCompare(b.city, 'tr'));

  const filteredDistricts = q
    ? districtRows.filter(r =>
        r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q) ||
        r.district.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q)
      )
    : districtRows;
  const sortedDistricts = [...filteredDistricts].sort((a, b) =>
    a.city.localeCompare(b.city, 'tr') || a.district.localeCompare(b.district, 'tr')
  );

  // İl bazlı ilçe gruplama
  const districtsByCity: Record<string, DistrictVoterCountRow[]> = {};
  for (const d of districtRows) {
    if (!districtsByCity[d.city]) districtsByCity[d.city] = [];
    districtsByCity[d.city].push(d);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-black mb-2">Seçmen Sayıları</h1>
      <p className="text-sm text-neutral-500 mb-4">
        İl ve ilçe bazlı kayıtlı seçmen sayıları. Temsil Oranı Sıralaması hesaplamalarında kullanılır.
      </p>

      <div className="bg-neutral-50 border border-neutral-100 p-4 mb-6">
        <p className="text-sm text-neutral-700 leading-relaxed mb-2">
          Temsil oranı = oy sayısı / seçmen sayısı. Bu tablo YSK 2023 verilerine dayanmaktadır.
        </p>
        <div className="flex gap-6 text-xs text-neutral-500">
          <span>İl toplam: <span className="font-mono font-medium text-black">{totalVoters.toLocaleString('tr-TR')}</span> ({rows.length} il)</span>
          <span>İlçe toplam: <span className="font-mono font-medium text-black">{totalDistrictVoters.toLocaleString('tr-TR')}</span> ({districtRows.length} ilçe)</span>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-0 mb-4 border border-neutral-200 w-fit">
        <button
          onClick={() => setActiveTab('il')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'il' ? 'bg-black text-white' : 'bg-white text-neutral-500 hover:text-black'
          }`}
        >
          İl Bazlı ({rows.length})
        </button>
        <button
          onClick={() => setActiveTab('ilce')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'ilce' ? 'bg-black text-white' : 'bg-white text-neutral-500 hover:text-black'
          }`}
        >
          İlçe Bazlı ({districtRows.length})
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'il' ? 'İl ara...' : 'İl veya ilçe ara...'}
          className="border border-neutral-200 px-3 py-2 text-sm w-64 focus:outline-none focus:border-black"
        />
      </div>

      {activeTab === 'il' ? (
        /* İl Tablosu */
        <div className="border border-neutral-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İl</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Seçmen Sayısı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İlçe Sayısı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Kaynak</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sortedCities.map(r => {
                const cityDistricts = districtsByCity[r.city] || [];
                const isExpanded = expandedCity === r.city;
                return (
                  <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 text-sm font-medium text-black">
                      {cityDistricts.length > 0 ? (
                        <button
                          onClick={() => setExpandedCity(isExpanded ? null : r.city)}
                          className="flex items-center gap-1 hover:text-neutral-600"
                        >
                          <span className="text-[10px] text-neutral-400">{isExpanded ? '▼' : '▶'}</span>
                          {r.city}
                        </button>
                      ) : r.city}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {editingId === r.id && editType === 'city' ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          min="0"
                          className="border border-neutral-200 px-2 py-1 text-sm w-32 focus:outline-none focus:border-black font-mono"
                        />
                      ) : (
                        <span className="font-mono">{r.voter_count.toLocaleString('tr-TR')}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-400">{cityDistricts.length}</td>
                    <td className="px-4 py-2 text-xs text-neutral-400">{r.source}</td>
                    <td className="px-4 py-2">
                      {editingId === r.id && editType === 'city' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(r.id, 'city')} disabled={saving}
                            className="text-xs text-black border border-black px-2 py-1 hover:bg-neutral-50">Kaydet</button>
                          <button onClick={() => setEditingId(null)}
                            className="text-xs text-neutral-400 hover:text-black">İptal</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(r.id); setEditType('city'); setEditValue(String(r.voter_count)); }}
                          className="text-xs text-neutral-400 hover:text-black">Düzenle</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* İlçe Tablosu */
        <div className="border border-neutral-200 overflow-x-auto" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İl</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İlçe</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Seçmen Sayısı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Kaynak</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sortedDistricts.map(r => (
                <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2 text-xs text-neutral-400">{r.city}</td>
                  <td className="px-4 py-2 text-sm font-medium text-black">{r.district}</td>
                  <td className="px-4 py-2 text-sm">
                    {editingId === r.id && editType === 'district' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        min="0"
                        className="border border-neutral-200 px-2 py-1 text-sm w-32 focus:outline-none focus:border-black font-mono"
                      />
                    ) : (
                      <span className="font-mono">{r.voter_count.toLocaleString('tr-TR')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-400">{r.source}</td>
                  <td className="px-4 py-2">
                    {editingId === r.id && editType === 'district' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(r.id, 'district')} disabled={saving}
                          className="text-xs text-black border border-black px-2 py-1 hover:bg-neutral-50">Kaydet</button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs text-neutral-400 hover:text-black">İptal</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(r.id); setEditType('district'); setEditValue(String(r.voter_count)); }}
                        className="text-xs text-neutral-400 hover:text-black">Düzenle</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
