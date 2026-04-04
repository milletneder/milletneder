'use client';

import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [hasFirebaseServiceAccount, setHasFirebaseServiceAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Twilio settings
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioPhone, setTwilioPhone] = useState('');
  const [twilioTestMode, setTwilioTestMode] = useState(false);
  const [twilioSaving, setTwilioSaving] = useState(false);
  const [twilioMessage, setTwilioMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);


  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        const method = data.settings?.auth_method?.value;
        if (method === 'email' || method === 'phone') setAuthMethod(method);
        setHasFirebaseServiceAccount(data.hasFirebaseServiceAccount);

        // Twilio
        if (data.settings?.twilio_account_sid?.value) setTwilioSid(data.settings.twilio_account_sid.value);
        if (data.settings?.twilio_auth_token?.value) setTwilioToken(data.settings.twilio_auth_token.value);
        if (data.settings?.twilio_phone_number?.value) setTwilioPhone(data.settings.twilio_phone_number.value);
        setTwilioTestMode(data.settings?.twilio_test_mode?.value === 'true');
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

  const handleSaveTwilioSetting = async (key: string, value: string) => {
    setTwilioSaving(true);
    setTwilioMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setTwilioMessage('Kaydedildi');
        setTimeout(() => setTwilioMessage(''), 2000);
      } else {
        const data = await res.json();
        setTwilioMessage(data.error || 'Hata oluştu');
      }
    } catch {
      setTwilioMessage('Bağlantı hatası');
    } finally {
      setTwilioSaving(false);
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
      <p className="text-neutral-500 text-sm mb-6">Kimlik doğrulama ve SMS ayarları</p>

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
        </div>

        {/* Twilio SMS Ayarları */}
        <div className="border border-neutral-200 p-5">
          <h2 className="text-sm font-bold text-black mb-1">Twilio SMS Ayarları</h2>
          <p className="text-xs text-neutral-500 mb-4">
            SMS doğrulama için Twilio API bilgilerini girin.
            <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-1 underline">
              Twilio Console
            </a>
          </p>

          {twilioMessage && (
            <div className="bg-neutral-50 border border-neutral-200 p-2 mb-3 text-xs text-black">
              {twilioMessage}
            </div>
          )}

          <div className="space-y-3">
            {/* Account SID */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Account SID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                />
                <button
                  onClick={() => handleSaveTwilioSetting('twilio_account_sid', twilioSid)}
                  disabled={twilioSaving || !twilioSid}
                  className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Kaydet
                </button>
              </div>
            </div>

            {/* Auth Token */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Auth Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  placeholder="Twilio Auth Token"
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                />
                <button
                  onClick={() => handleSaveTwilioSetting('twilio_auth_token', twilioToken)}
                  disabled={twilioSaving || !twilioToken}
                  className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Kaydet
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Veritabanında AES-256-GCM ile şifrelenerek saklanır.</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Twilio Telefon Numarası</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={twilioPhone}
                  onChange={(e) => setTwilioPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                />
                <button
                  onClick={() => handleSaveTwilioSetting('twilio_phone_number', twilioPhone)}
                  disabled={twilioSaving || !twilioPhone}
                  className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Kaydet
                </button>
              </div>
            </div>

            {/* Test Mode */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <div>
                <span className="text-xs font-medium text-neutral-600">Test Modu</span>
                <p className="text-[10px] text-neutral-400">Açıkken SMS gönderilmez, kod sunucu loglarında gösterilir.</p>
              </div>
              <button
                onClick={() => {
                  const newVal = !twilioTestMode;
                  setTwilioTestMode(newVal);
                  handleSaveTwilioSetting('twilio_test_mode', String(newVal));
                }}
                disabled={twilioSaving}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  twilioTestMode ? 'bg-green-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    twilioTestMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
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
                {authMethod === 'email' ? 'E-posta / Şifre' : 'Telefon / SMS (Twilio)'}
              </span>
            </div>
          </div>
        </div>

        {/* Gizlilik Notu */}
        <div className="border border-neutral-200 p-5 bg-neutral-50">
          <h2 className="text-sm font-bold text-black mb-2">Gizlilik ve Güvenlik</h2>
          <ul className="text-xs text-neutral-600 space-y-1.5">
            <li>E-posta adresleri Firebase&apos;de, telefon numaraları hiçbir yerde saklanmaz.</li>
            <li>Veritabanında sadece kimlik hash&apos;i tutulur (SHA256 + HMAC).</li>
            <li>Kullanıcı kimliği ile oy tercihi arasında bağlantı kurulamaz.</li>
            <li>Twilio API bilgileri AES-256-GCM ile şifrelenerek saklanır.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
