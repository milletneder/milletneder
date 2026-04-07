'use client';

import { useState } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { CITY_DISTRICTS, SORTED_CITIES } from '@/lib/geo/city-districts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

interface ProfileFormProps {
  onComplete: (data: { city: string; district: string }) => void;
  onBack: () => void;
  loading?: boolean;
}

export default function ProfileForm({ onComplete, onBack, loading = false }: ProfileFormProps) {
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
      <div className="space-y-2">
        <Label>Yaşadığın İl</Label>
        <SearchableSelect
          options={SORTED_CITIES}
          value={city}
          onChange={(c) => { setCity(c); setDistrict(''); }}
          placeholder="İl ara veya seç..."
        />
        {errors.city && <p className="text-destructive text-xs">{errors.city}</p>}
      </div>
      <div className="space-y-2">
        <Label>Yaşadığın İlçe</Label>
        <SearchableSelect
          options={districts}
          value={district}
          onChange={setDistrict}
          placeholder={city ? 'İlçe ara veya seç...' : 'Önce il seçin'}
          disabled={!city}
        />
        {errors.district && <p className="text-destructive text-xs">{errors.district}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="size-3.5" data-icon="inline-start" />
          Geri
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Kontrol ediliyor...' : 'Devam'}
        </Button>
      </div>
    </div>
  );
}
