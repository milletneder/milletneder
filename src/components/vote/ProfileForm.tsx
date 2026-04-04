'use client';

import { useState } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { CITY_DISTRICTS, SORTED_CITIES } from '@/lib/geo/city-districts';

interface ProfileFormProps {
  onComplete: (data: { city: string; district: string }) => void;
  onBack: () => void;
}

export default function ProfileForm({ onComplete, onBack }: ProfileFormProps) {
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const districts = city ? (CITY_DISTRICTS[city] || []) : [];

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!city) newErrors.city = 'İl seçin';
    if (!district) newErrors.district = 'İlçe seçin';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      onComplete({ city, district });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div>
        <label className="block text-sm text-neutral-600 mb-1">Yaşadığın İl</label>
        <SearchableSelect
          options={SORTED_CITIES}
          value={city}
          onChange={(c) => { setCity(c); setDistrict(''); }}
          placeholder="İl ara veya seç..."
        />
        {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
      </div>
      <div>
        <label className="block text-sm text-neutral-600 mb-1">Yaşadığın İlçe</label>
        <SearchableSelect
          options={districts}
          value={district}
          onChange={setDistrict}
          placeholder={city ? 'İlçe ara veya seç...' : 'Önce il seçin'}
          disabled={!city}
        />
        {errors.district && <p className="text-red-600 text-xs mt-1">{errors.district}</p>}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 bg-neutral-100 text-black py-3 font-medium hover:bg-neutral-200 transition-colors"
        >
          Geri
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors"
        >
          Kayıt Ol
        </button>
      </div>
    </div>
  );
}
