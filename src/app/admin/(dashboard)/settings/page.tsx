'use client';

import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [hasFirebaseServiceAccount, setHasFirebaseServiceAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const getToken = () => localStorage.getItem('admin_token') || '';

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        const method = data.settings?.auth_method?.value;
        if (method === 'email' || method === 'phone') setAuthMethod(method);
        setHasFirebaseServiceAccount(data.hasFirebaseServiceAccount);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAuthMethod = async (method: 'email' | 'phone') => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ key: 'auth_method', value: method }),
      });

      if (res.ok) {
        setAuthMethod(method);
        setMessage('Doğrulama yöntemi güncellendi');
      } else {
        const data = await res.json();
        setMessage(data.error || 'Hata oluştu');
      }
    } catch {
      setMessage('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-black mb-4">Ayarlar</h1>
        <p className="text-neutral-500 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-black mb-1">Ayarlar</h1>
      <p className="text-neutral-500 text-sm mb-6">Firebase Authentication ve güvenlik ayarları</p>

      {message && (
        <div className="bg-neutral-50 border border-neutral-200 p-3 mb-4 text-sm text-black">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Doğrulama Yöntemi */}
        <div className="border border-neutral-200 p-5">
          <h2 className="text-sm font-bold text-black mb-3">Kullanıcı Doğrulama Yöntemi</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Kullanıcıların giriş ve kayıt olurken kullanacağı doğrulama yöntemi.
            Firebase Authentication üzerinden çalışır.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => handleSaveAuthMethod('email')}
              disabled={saving}
              className={`flex-1 py-3 px-4 text-sm font-medium border transition-colors ${
                authMethod === 'email'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black'
              }`}
            >
              <div className="text-center">
                <span className="block text-lg mb-1">E-posta</span>
                <span className="block text-[11px] opacity-70">E-posta + şifre ile giriş</span>
              </div>
            </button>
            <button
              onClick={() => handleSaveAuthMethod('phone')}
              disabled={saving}
              className={`flex-1 py-3 px-4 text-sm font-medium border transition-colors ${
                authMethod === 'phone'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black'
              }`}
            >
              <div className="text-center">
                <span className="block text-lg mb-1">SMS</span>
                <span className="block text-[11px] opacity-70">Telefon + OTP ile giriş</span>
              </div>
            </button>
          </div>

          {authMethod === 'phone' && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs text-yellow-800">
                SMS doğrulaması Firebase Phone Verification onayına bağlı.
                Google&apos;dan onay geldikten sonra aktif olacaktır.
              </p>
            </div>
          )}
        </div>

        {/* Firebase Durum */}
        <div className="border border-neutral-200 p-5">
          <h2 className="text-sm font-bold text-black mb-3">Firebase Durumu</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Firebase Projesi</span>
              <span className="text-sm text-black font-medium">milletneder</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Service Account</span>
              {hasFirebaseServiceAccount ? (
                <span className="text-sm text-green-700 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ayarlanmış
                </span>
              ) : (
                <span className="text-sm text-red-600">Ayarlanmamış</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Aktif Yöntem</span>
              <span className="text-sm text-black font-medium">
                {authMethod === 'email' ? 'E-posta / Şifre' : 'Telefon / SMS'}
              </span>
            </div>
          </div>
        </div>

        {/* Gizlilik Notu */}
        <div className="border border-neutral-200 p-5 bg-neutral-50">
          <h2 className="text-sm font-bold text-black mb-2">Gizlilik ve Güvenlik</h2>
          <ul className="text-xs text-neutral-600 space-y-1.5">
            <li>E-posta ve telefon numaraları sadece Firebase&apos;de saklanır.</li>
            <li>Kendi veritabanımızda hiçbir kişisel bilgi tutulmaz.</li>
            <li>Kullanıcı kimliği ile oy tercihi arasında bağlantı kurulamaz.</li>
            <li>Veritabanı hacklense bile kimlik tespiti mümkün değildir.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
