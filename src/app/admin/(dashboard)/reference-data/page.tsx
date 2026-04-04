'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/lib/admin/hooks';

interface DemographicRow {
  id: number;
  dimension: string;
  category: string;
  population_share: string;
  source: string | null;
  year: number | null;
}

interface ElectionRow {
  id: number;
  party_slug: string;
  vote_share: string;
  vote_count: number | null;
  source: string | null;
}

interface CityElectionRow {
  id: number;
  city: string;
  party_slug: string;
  vote_count: number;
  vote_share: string;
  source: string | null;
}

interface DistrictElectionRow {
  id: number;
  city: string;
  district: string;
  party_slug: string;
  vote_count: number;
  vote_share: string;
  source: string | null;
}

const DIMENSION_LABELS: Record<string, string> = {
  age: 'Yaş',
  gender: 'Cinsiyet',
  education: 'Eğitim',
  region: 'Bölge',
  city: 'İl',
};

export default function ReferenceDataPage() {
  useAdminAuth();
  const [demographics, setDemographics] = useState<DemographicRow[]>([]);
  const [electionResults, setElectionResults] = useState<ElectionRow[]>([]);
  const [cityElectionResults, setCityElectionResults] = useState<CityElectionRow[]>([]);
  const [districtElectionResults, setDistrictElectionResults] = useState<DistrictElectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDimension, setFilterDimension] = useState<string>('');
  const [cityElectionFilter, setCityElectionFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  useEffect(() => {
    const url = filterDimension
      ? `/api/admin/reference-data?dimension=${filterDimension}`
      : '/api/admin/reference-data';
    fetch(url, { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setDemographics(data.demographics || []);
        setElectionResults(data.electionResults || []);
        setCityElectionResults(data.cityElectionResults || []);
        setDistrictElectionResults(data.districtElectionResults || []);
      })
      .finally(() => setLoading(false));
  }, [headers, filterDimension]);

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await fetch('/api/admin/reference-data', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ id, population_share: editValue }),
      });
      setDemographics(prev => prev.map(d =>
        d.id === id ? { ...d, population_share: parseFloat(editValue).toFixed(6) } : d
      ));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const dimensions = [...new Set(demographics.map(d => d.dimension))];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-black mb-2">Referans Veriler</h1>
      <p className="text-sm text-neutral-500 mb-4">TÜİK ve YSK referans nüfus dağılımları. Ağırlıklandırma hesaplamalarında kullanılır.</p>

      <div className="bg-neutral-50 border border-neutral-100 p-4 mb-8">
        <p className="text-sm text-neutral-700 leading-relaxed mb-2">
          Bu sayfadaki veriler, ağırlıklandırma motorunun referans noktasıdır. Post-Stratification ve Raking yöntemleri buradaki nüfus paylarını kullanarak anketteki sapmayı düzeltir. Bölgesel Kota yöntemi bölge paylarını, Partizan Sapma düzeltmesi ise 2023 seçim sonuçlarını referans alır.
        </p>
        <p className="text-xs text-neutral-500">
          Bir değeri değiştirdiğinizde, ağırlıklandırma sonuçları da buna göre değişecektir. Hatalı bir pay girilirse sonuçlar sapabilir. Değişiklik yapmadan önce TÜİK veya YSK kaynaklarını kontrol ediniz.
        </p>
      </div>

      {/* Dimension Filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-neutral-500">Filtre:</span>
        <button
          onClick={() => setFilterDimension('')}
          className={`px-3 py-1 text-xs ${!filterDimension ? 'border-2 border-black' : 'border border-neutral-200 hover:border-black'}`}
        >
          Tümü
        </button>
        {['age', 'gender', 'education', 'region'].map(dim => (
          <button
            key={dim}
            onClick={() => setFilterDimension(dim)}
            className={`px-3 py-1 text-xs ${filterDimension === dim ? 'border-2 border-black' : 'border border-neutral-200 hover:border-black'}`}
          >
            {DIMENSION_LABELS[dim] || dim}
          </button>
        ))}
      </div>

      {/* Demographics Table */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-black mb-2">Demografik Referans Dağılımları</h2>
        <p className="text-xs text-neutral-500 mb-4">TÜİK 2025 verilerine dayalı gerçek nüfus dağılımları. Her kategorinin nüfus payı, anketteki temsil oranıyla karşılaştırılarak ağırlık hesaplanır. Bir payı değiştirmek için satırdaki &quot;Düzenle&quot; butonuna tıklayın.</p>
        <div className="border border-neutral-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Boyut</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Kategori</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Nüfus Payı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Kaynak</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {demographics.map(d => (
                <tr key={d.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2 text-sm text-black">{DIMENSION_LABELS[d.dimension] || d.dimension}</td>
                  <td className="px-4 py-2 text-sm text-black">{d.category}</td>
                  <td className="px-4 py-2 text-sm">
                    {editingId === d.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        step="0.001"
                        min="0"
                        max="1"
                        className="border border-neutral-200 px-2 py-1 text-sm w-28 focus:outline-none focus:border-black"
                      />
                    ) : (
                      <span className="font-mono">{(parseFloat(d.population_share) * 100).toFixed(1)}%</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-400">{d.source}</td>
                  <td className="px-4 py-2">
                    {editingId === d.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(d.id)}
                          disabled={saving}
                          className="text-xs text-black border border-black px-2 py-1 hover:bg-neutral-50"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-neutral-400 hover:text-black"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(d.id); setEditValue(d.population_share); }}
                        className="text-xs text-neutral-400 hover:text-black"
                      >
                        Düzenle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Election Results */}
      <section>
        <h2 className="text-lg font-bold text-black mb-2">2023 Seçim Sonuçları (YSK)</h2>
        <p className="text-xs text-neutral-500 mb-4">
          YSK resmi sonuçları. Partizan Sapma düzeltmesinde referans olarak kullanılır. Anketteki kullanıcıların beyan ettiği 2023 oyları bu değerlerle karşılaştırılır — eğer belirli bir parti fazla temsil ediliyorsa, o parti seçmenlerinin ağırlığı orantılı olarak düzeltilir.
        </p>
        <div className="border border-neutral-200 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Parti</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Oy Payı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Oy Sayısı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {electionResults.map(r => (
                <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2 text-sm font-medium text-black">{r.party_slug}</td>
                  <td className="px-4 py-2 text-sm font-mono">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-sm text-neutral-600">{r.vote_count?.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-2 text-xs text-neutral-400">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* City-Level Election Results */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-black mb-2">2023 İl Bazlı Seçim Sonuçları (YSK)</h2>
        <p className="text-xs text-neutral-500 mb-4">
          İl bazlı YSK 2023 milletvekili seçim sonuçları. Haritada beraberliklerde hangi partinin önde gösterileceğini belirlemek için tiebreaker olarak kullanılır.
        </p>

        <div className="mb-4">
          <input
            type="text"
            value={cityElectionFilter}
            onChange={e => setCityElectionFilter(e.target.value)}
            placeholder="İl ara..."
            className="border border-neutral-200 px-3 py-2 text-sm w-64 focus:outline-none focus:border-black"
          />
        </div>

        <div className="border border-neutral-200 overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0">
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İl</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Parti</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Oy Sayısı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Oy Payı</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = cityElectionFilter.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
                const filtered = q
                  ? cityElectionResults.filter(r =>
                      r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q)
                    )
                  : cityElectionResults;
                const sorted = [...filtered].sort((a, b) => {
                  const cityCompare = a.city.localeCompare(b.city, 'tr');
                  if (cityCompare !== 0) return cityCompare;
                  return b.vote_count - a.vote_count;
                });
                return sorted.map(r => (
                  <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 text-sm font-medium text-black">{r.city}</td>
                    <td className="px-4 py-2 text-sm text-black">{r.party_slug}</td>
                    <td className="px-4 py-2 text-sm font-mono text-neutral-600">{r.vote_count.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-2 text-sm font-mono">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Toplam {cityElectionResults.length} kayıt · {[...new Set(cityElectionResults.map(r => r.city))].length} il
        </p>
      </section>

      {/* District-Level Election Results */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-black mb-2">2023 İlçe Bazlı Seçim Sonuçları (YSK)</h2>
        <p className="text-xs text-neutral-500 mb-4">
          İlçe bazlı YSK 2023 milletvekili seçim sonuçları. İlçe düzeyinde ağırlıklandırma ve tiebreaker hesaplamalarında kullanılır.
        </p>

        <div className="border border-neutral-200 overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0">
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İl</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">İlçe</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Parti</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Oy Sayısı</th>
                <th className="text-left text-[11px] font-medium text-neutral-500 uppercase px-4 py-2">Oy Payı</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = cityElectionFilter.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı');
                const filtered = q
                  ? districtElectionResults.filter(r =>
                      r.city.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q) ||
                      r.district.toLowerCase().replace(/İ/g, 'i').replace(/I/g, 'ı').includes(q)
                    )
                  : districtElectionResults;
                const sorted = [...filtered].sort((a, b) => {
                  const cityCompare = a.city.localeCompare(b.city, 'tr');
                  if (cityCompare !== 0) return cityCompare;
                  const distCompare = a.district.localeCompare(b.district, 'tr');
                  if (distCompare !== 0) return distCompare;
                  return b.vote_count - a.vote_count;
                });
                return sorted.map(r => (
                  <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-2 text-xs text-neutral-400">{r.city}</td>
                    <td className="px-4 py-2 text-sm font-medium text-black">{r.district}</td>
                    <td className="px-4 py-2 text-sm text-black">{r.party_slug}</td>
                    <td className="px-4 py-2 text-sm font-mono text-neutral-600">{r.vote_count.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-2 text-sm font-mono">{(parseFloat(r.vote_share) * 100).toFixed(1)}%</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Toplam {districtElectionResults.length} kayıt · {[...new Set(districtElectionResults.map(r => `${r.city}|${r.district}`))].length} ilçe
        </p>
      </section>
    </div>
  );
}
