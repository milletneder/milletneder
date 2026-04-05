'use client';

import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone'>('email');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Twilio settings
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioVerifySid, setTwilioVerifySid] = useState('');
  const [twilioTestMode, setTwilioTestMode] = useState(false);
  const [twilioSaving, setTwilioSaving] = useState(false);
  const [twilioMessage, setTwilioMessage] = useState('');

  // SMTP settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

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
        if (method === 'email' || method === 'phone') {
          setAuthMethod(method);
          setSelectedMethod(method);
        }
        // Twilio
        if (data.settings?.twilio_account_sid?.value) setTwilioSid(data.settings.twilio_account_sid.value);
        if (data.settings?.twilio_auth_token?.value) setTwilioToken(data.settings.twilio_auth_token.value);
        if (data.settings?.twilio_verify_service_sid?.value) setTwilioVerifySid(data.settings.twilio_verify_service_sid.value);
        setTwilioTestMode(data.settings?.twilio_test_mode?.value === 'true');
        // SMTP
        if (data.settings?.smtp_host?.value) setSmtpHost(data.settings.smtp_host.value);
        if (data.settings?.smtp_port?.value) setSmtpPort(data.settings.smtp_port.value);
        if (data.settings?.smtp_user?.value) setSmtpUser(data.settings.smtp_user.value);
        if (data.settings?.smtp_pass?.value) setSmtpPass(data.settings.smtp_pass.value);
        if (data.settings?.smtp_from?.value) setSmtpFrom(data.settings.smtp_from.value);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAuthMethod = async () => {
    if (selectedMethod === authMethod) return;
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'auth_method', value: selectedMethod }),
      });

      if (res.ok) {
        setAuthMethod(selectedMethod);
        setMessage('Doğrulama yöntemi güncellendi');
        setTimeout(() => setMessage(''), 3000);
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

  const handleSaveSetting = async (key: string, value: string) => {
    setTwilioSaving(true);
    setTwilioMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const methodChanged = selectedMethod !== authMethod;

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
      <p className="text-neutral-500 text-sm mb-6">Kimlik doğrulama ve servis ayarları</p>

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
              onClick={() => setSelectedMethod('email')}
              className={`flex-1 py-3 px-4 text-sm font-medium border transition-colors ${
                selectedMethod === 'email'
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
              onClick={() => setSelectedMethod('phone')}
              className={`flex-1 py-3 px-4 text-sm font-medium border transition-colors ${
                selectedMethod === 'phone'
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

          {methodChanged && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-amber-600">
                Yöntem değiştirildi, kaydetmek için onaylayın.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMethod(authMethod)}
                  className="px-4 py-2 text-xs font-medium text-neutral-500 border border-neutral-200 hover:border-black hover:text-black transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveAuthMethod}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Twilio Ayarları — her zaman görünür (SMS ve E-posta ortak) */}
        <div className="border border-neutral-200 p-5">
          <h2 className="text-sm font-bold text-black mb-1">Twilio Ayarları</h2>
          <p className="text-xs text-neutral-500 mb-4">
            {selectedMethod === 'phone' ? 'SMS' : 'E-posta'} doğrulama için Twilio API bilgilerini girin.
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
                  onClick={() => handleSaveSetting('twilio_account_sid', twilioSid)}
                  disabled={twilioSaving || !twilioSid}
                  className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Kaydet
                </button>
              </div>
            </div>

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
                  onClick={() => handleSaveSetting('twilio_auth_token', twilioToken)}
                  disabled={twilioSaving || !twilioToken}
                  className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Kaydet
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Veritabanında AES-256-GCM ile şifrelenerek saklanır.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Verify Service SID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={twilioVerifySid}
                  onChange={(e) => setTwilioVerifySid(e.target.value)}
                  placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                />
                <button
                  onClick={() => handleSaveSetting('twilio_verify_service_sid', twilioVerifySid)}
                  disabled={twilioSaving || !twilioVerifySid}
                  className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Kaydet
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Twilio Console &gt; Verify &gt; Services &gt; Service SID</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <div>
                <span className="text-xs font-medium text-neutral-600">Test Modu</span>
                <p className="text-[10px] text-neutral-400">Açıkken doğrulama kodu gönderilmez, sunucu loglarında gösterilir.</p>
              </div>
              <button
                onClick={() => {
                  const newVal = !twilioTestMode;
                  setTwilioTestMode(newVal);
                  handleSaveSetting('twilio_test_mode', String(newVal));
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

        {/* E-posta seçiliyken: Twilio E-posta + SMTP ayarları */}
        {selectedMethod === 'email' && (
          <>
            <div className="border border-neutral-200 p-5">
              <h2 className="text-sm font-bold text-black mb-1">Twilio E-posta Kanalı</h2>
              <p className="text-xs text-neutral-500 mb-4">
                E-posta ile OTP doğrulama için Twilio Verify servisinde e-posta kanalı aktif olmalıdır.
              </p>
              <div className="bg-neutral-50 border border-neutral-100 p-3">
                <p className="text-xs text-neutral-600">
                  Twilio Console &gt; Verify &gt; Services &gt; Email Integration bölümünden yapılandırın.
                </p>
                <a
                  href="https://console.twilio.com/us1/develop/verify/services"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline mt-1 inline-block"
                >
                  Twilio Verify Services
                </a>
              </div>
            </div>

            <div className="border border-neutral-200 p-5">
              <h2 className="text-sm font-bold text-black mb-1">SMTP E-posta Ayarları</h2>
              <p className="text-xs text-neutral-500 mb-4">
                Kurtarma kodlarını e-posta ile göndermek için SMTP sunucu bilgilerini girin.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">SMTP Host</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.sendgrid.net"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_host', smtpHost)}
                      disabled={twilioSaving || !smtpHost}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">SMTP Port</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_port', smtpPort)}
                      disabled={twilioSaving || !smtpPort}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">587 (TLS) veya 465 (SSL)</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">SMTP Kullanıcı</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="apikey"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_user', smtpUser)}
                      disabled={twilioSaving || !smtpUser}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">SMTP Şifre</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="SMTP API key veya şifre"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_pass', smtpPass)}
                      disabled={twilioSaving || !smtpPass}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Veritabanında AES-256-GCM ile şifrelenerek saklanır.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Gönderen E-posta</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      placeholder="noreply@milletneder.com"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_from', smtpFrom)}
                      disabled={twilioSaving || !smtpFrom}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Gizlilik Notu */}
        <div className="border border-neutral-200 p-5 bg-neutral-50">
          <h2 className="text-sm font-bold text-black mb-2">Gizlilik ve Güvenlik</h2>
          <ul className="text-xs text-neutral-600 space-y-1.5">
            <li>E-posta ve telefon numaraları hiçbir yerde saklanmaz.</li>
            <li>Veritabanında sadece kimlik hash&apos;i tutulur (SHA256 + HMAC).</li>
            <li>Kullanıcı kimliği ile oy tercihi arasında bağlantı kurulamaz.</li>
            <li>Twilio ve SMTP bilgileri AES-256-GCM ile şifrelenerek saklanır.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
