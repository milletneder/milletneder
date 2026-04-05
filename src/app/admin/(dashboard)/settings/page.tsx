'use client';

import { useState, useEffect } from 'react';

type SmsProvider = 'twilio' | 'vatansms';

export default function AdminSettingsPage() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone'>('email');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // SMS Provider
  const [smsProvider, setSmsProvider] = useState<SmsProvider>('twilio');
  const [selectedProvider, setSelectedProvider] = useState<SmsProvider>('twilio');

  // Twilio settings
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioVerifySid, setTwilioVerifySid] = useState('');
  const [twilioTestMode, setTwilioTestMode] = useState(false);
  const [twilioSaving, setTwilioSaving] = useState(false);
  const [twilioMessage, setTwilioMessage] = useState('');

  // VatanSMS settings
  const [vatanApiId, setVatanApiId] = useState('');
  const [vatanApiUser, setVatanApiUser] = useState('');
  const [vatanApiPass, setVatanApiPass] = useState('');
  const [vatanSender, setVatanSender] = useState('');
  const [vatanTestMode, setVatanTestMode] = useState(false);
  const [vatanSaving, setVatanSaving] = useState(false);
  const [vatanMessage, setVatanMessage] = useState('');

  // Test: Force low balance
  const [forceLowBalance, setForceLowBalance] = useState(false);
  const [forceLowSaving, setForceLowSaving] = useState(false);
  const [forceLowMessage, setForceLowMessage] = useState('');

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
        const s = data.settings;
        // Auth method
        const method = s?.auth_method?.value;
        if (method === 'email' || method === 'phone') {
          setAuthMethod(method);
          setSelectedMethod(method);
        }
        // SMS Provider
        const provider = s?.sms_provider?.value;
        if (provider === 'twilio' || provider === 'vatansms') {
          setSmsProvider(provider);
          setSelectedProvider(provider);
        }
        // Twilio
        if (s?.twilio_account_sid?.value) setTwilioSid(s.twilio_account_sid.value);
        if (s?.twilio_auth_token?.value) setTwilioToken(s.twilio_auth_token.value);
        if (s?.twilio_verify_service_sid?.value) setTwilioVerifySid(s.twilio_verify_service_sid.value);
        setTwilioTestMode(s?.twilio_test_mode?.value === 'true');
        // VatanSMS
        if (s?.vatansms_api_id?.value) setVatanApiId(s.vatansms_api_id.value);
        if (s?.vatansms_api_user?.value) setVatanApiUser(s.vatansms_api_user.value);
        if (s?.vatansms_api_pass?.value) setVatanApiPass(s.vatansms_api_pass.value);
        if (s?.vatansms_sender?.value) setVatanSender(s.vatansms_sender.value);
        setVatanTestMode(s?.vatansms_test_mode?.value === 'true');
        // Force low balance
        setForceLowBalance(s?.force_low_balance?.value === 'true');
        // SMTP
        if (s?.smtp_host?.value) setSmtpHost(s.smtp_host.value);
        if (s?.smtp_port?.value) setSmtpPort(s.smtp_port.value);
        if (s?.smtp_user?.value) setSmtpUser(s.smtp_user.value);
        if (s?.smtp_pass?.value) setSmtpPass(s.smtp_pass.value);
        if (s?.smtp_from?.value) setSmtpFrom(s.smtp_from.value);
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
        setMessage('Dogrulama yontemi guncellendi');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await res.json();
        setMessage(data.error || 'Hata olustu');
      }
    } catch {
      setMessage('Baglanti hatasi');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProvider = async () => {
    if (selectedProvider === smsProvider) return;
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sms_provider', value: selectedProvider }),
      });

      if (res.ok) {
        setSmsProvider(selectedProvider);
        setMessage('SMS saglayici guncellendi');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await res.json();
        setMessage(data.error || 'Hata olustu');
      }
    } catch {
      setMessage('Baglanti hatasi');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string, setMsg: (m: string) => void, setLoading: (b: boolean) => void) => {
    setLoading(true);
    setMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setMsg('Kaydedildi');
        setTimeout(() => setMsg(''), 2000);
      } else {
        const data = await res.json();
        setMsg(data.error || 'Hata olustu');
      }
    } catch {
      setMsg('Baglanti hatasi');
    } finally {
      setLoading(false);
    }
  };

  const methodChanged = selectedMethod !== authMethod;
  const providerChanged = selectedProvider !== smsProvider;

  // Twilio ayarları ne zaman gösterilir:
  // - E-posta modu seçiliyse (e-posta OTP Twilio Verify kullanır)
  // - SMS modu + Twilio sağlayıcı seçiliyse
  const showTwilioSettings = selectedMethod === 'email' || selectedProvider === 'twilio';
  const showVatanSettings = selectedMethod === 'phone' && selectedProvider === 'vatansms';

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-black mb-4">Ayarlar</h1>
        <p className="text-neutral-500 text-sm">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-black mb-1">Ayarlar</h1>
      <p className="text-neutral-500 text-sm mb-6">Kimlik dogrulama ve servis ayarlari</p>

      {message && (
        <div className="bg-neutral-50 border border-neutral-200 p-3 mb-4 text-sm text-black">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Dogrulama Yontemi */}
        <div className="border border-neutral-200 p-5">
          <h2 className="text-sm font-bold text-black mb-3">Kullanici Dogrulama Yontemi</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Kullanicilarin giris ve kayit olurken kullanacagi dogrulama yontemi.
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
                <span className="block text-[11px] opacity-70">E-posta + sifre ile giris</span>
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
                <span className="block text-[11px] opacity-70">Telefon + OTP ile giris</span>
              </div>
            </button>
          </div>

          {methodChanged && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-amber-600">
                Yontem degistirildi, kaydetmek icin onaylayin.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMethod(authMethod)}
                  className="px-4 py-2 text-xs font-medium text-neutral-500 border border-neutral-200 hover:border-black hover:text-black transition-colors"
                >
                  Iptal
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

        {/* SMS Saglayici Secimi (sadece SMS modu seciliyken) */}
        {selectedMethod === 'phone' && (
          <div className="border border-neutral-200 p-5">
            <h2 className="text-sm font-bold text-black mb-3">SMS Saglayici</h2>
            <p className="text-xs text-neutral-500 mb-4">
              SMS dogrulama kodlari icin kullanilacak servis saglayicisini secin.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProvider('twilio')}
                className={`flex-1 py-3 px-4 text-sm font-medium border transition-colors ${
                  selectedProvider === 'twilio'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black'
                }`}
              >
                <div className="text-center">
                  <span className="block text-lg mb-1">Twilio</span>
                  <span className="block text-[11px] opacity-70">Uluslararasi (Verify API)</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedProvider('vatansms')}
                className={`flex-1 py-3 px-4 text-sm font-medium border transition-colors ${
                  selectedProvider === 'vatansms'
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black'
                }`}
              >
                <div className="text-center">
                  <span className="block text-lg mb-1">VatanSMS</span>
                  <span className="block text-[11px] opacity-70">Yerli saglayici (XML API)</span>
                </div>
              </button>
            </div>

            {providerChanged && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-amber-600">
                  Saglayici degistirildi, kaydetmek icin onaylayin.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProvider(smsProvider)}
                    className="px-4 py-2 text-xs font-medium text-neutral-500 border border-neutral-200 hover:border-black hover:text-black transition-colors"
                  >
                    Iptal
                  </button>
                  <button
                    onClick={handleSaveProvider}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Twilio Ayarlari */}
        {showTwilioSettings && (
          <div className="border border-neutral-200 p-5">
            <h2 className="text-sm font-bold text-black mb-1">Twilio Ayarlari</h2>
            <p className="text-xs text-neutral-500 mb-4">
              {selectedMethod === 'email'
                ? 'E-posta OTP dogrulama icin Twilio Verify API bilgilerini girin.'
                : 'SMS dogrulama icin Twilio API bilgilerini girin.'}
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
                    onClick={() => handleSaveSetting('twilio_account_sid', twilioSid, setTwilioMessage, setTwilioSaving)}
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
                    onClick={() => handleSaveSetting('twilio_auth_token', twilioToken, setTwilioMessage, setTwilioSaving)}
                    disabled={twilioSaving || !twilioToken}
                    className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    Kaydet
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Veritabaninda AES-256-GCM ile sifrelenerek saklanir.</p>
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
                    onClick={() => handleSaveSetting('twilio_verify_service_sid', twilioVerifySid, setTwilioMessage, setTwilioSaving)}
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
                  <p className="text-[10px] text-neutral-400">Acikken dogrulama kodu gonderilmez, sunucu loglarinda gosterilir.</p>
                </div>
                <button
                  onClick={() => {
                    const newVal = !twilioTestMode;
                    setTwilioTestMode(newVal);
                    handleSaveSetting('twilio_test_mode', String(newVal), setTwilioMessage, setTwilioSaving);
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
        )}

        {/* VatanSMS Ayarlari */}
        {showVatanSettings && (
          <div className="border border-neutral-200 p-5">
            <h2 className="text-sm font-bold text-black mb-1">VatanSMS Ayarlari</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Yerli SMS saglayici API bilgilerini girin. Bilgilere{' '}
              <a href="https://panel.vatansms.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                VatanSMS Panel
              </a>
              {' '}&gt; Hesap Ayarlari &gt; SMS API bolumunden ulasabilirsiniz.
            </p>

            {vatanMessage && (
              <div className="bg-neutral-50 border border-neutral-200 p-2 mb-3 text-xs text-black">
                {vatanMessage}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">API Kullanici ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vatanApiId}
                    onChange={(e) => setVatanApiId(e.target.value)}
                    placeholder="12345"
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveSetting('vatansms_api_id', vatanApiId, setVatanMessage, setVatanSaving)}
                    disabled={vatanSaving || !vatanApiId}
                    className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    Kaydet
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">API Kullanici Adi</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vatanApiUser}
                    onChange={(e) => setVatanApiUser(e.target.value)}
                    placeholder="905XXXXXXXXX"
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveSetting('vatansms_api_user', vatanApiUser, setVatanMessage, setVatanSaving)}
                    disabled={vatanSaving || !vatanApiUser}
                    className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    Kaydet
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">API Sifre</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={vatanApiPass}
                    onChange={(e) => setVatanApiPass(e.target.value)}
                    placeholder="VatanSMS API sifresi"
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveSetting('vatansms_api_pass', vatanApiPass, setVatanMessage, setVatanSaving)}
                    disabled={vatanSaving || !vatanApiPass}
                    className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    Kaydet
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Veritabaninda AES-256-GCM ile sifrelenerek saklanir.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Gonderen Basligi (Originator)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vatanSender}
                    onChange={(e) => setVatanSender(e.target.value)}
                    placeholder="MILLETNEDER"
                    maxLength={11}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                  />
                  <button
                    onClick={() => handleSaveSetting('vatansms_sender', vatanSender, setVatanMessage, setVatanSaving)}
                    disabled={vatanSaving || !vatanSender}
                    className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    Kaydet
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Maks 11 karakter, Turkce karakter kullanilamaz. VatanSMS panelinden tanimlanmis olmali.</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <div>
                  <span className="text-xs font-medium text-neutral-600">Test Modu</span>
                  <p className="text-[10px] text-neutral-400">Acikken SMS gonderilmez, OTP kodu sunucu loglarinda gosterilir.</p>
                </div>
                <button
                  onClick={() => {
                    const newVal = !vatanTestMode;
                    setVatanTestMode(newVal);
                    handleSaveSetting('vatansms_test_mode', String(newVal), setVatanMessage, setVatanSaving);
                  }}
                  disabled={vatanSaving}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    vatanTestMode ? 'bg-green-500' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      vatanTestMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* E-posta seciliyken: Twilio E-posta + SMTP ayarlari */}
        {selectedMethod === 'email' && (
          <>
            <div className="border border-neutral-200 p-5">
              <h2 className="text-sm font-bold text-black mb-1">Twilio E-posta Kanali</h2>
              <p className="text-xs text-neutral-500 mb-4">
                E-posta ile OTP dogrulama icin Twilio Verify servisinde e-posta kanali aktif olmalidir.
              </p>
              <div className="bg-neutral-50 border border-neutral-100 p-3">
                <p className="text-xs text-neutral-600">
                  Twilio Console &gt; Verify &gt; Services &gt; Email Integration bolumunden yapilandirin.
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
              <h2 className="text-sm font-bold text-black mb-1">SMTP E-posta Ayarlari</h2>
              <p className="text-xs text-neutral-500 mb-4">
                Kurtarma kodlarini e-posta ile gondermek icin SMTP sunucu bilgilerini girin.
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
                      onClick={() => handleSaveSetting('smtp_host', smtpHost, setTwilioMessage, setTwilioSaving)}
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
                      onClick={() => handleSaveSetting('smtp_port', smtpPort, setTwilioMessage, setTwilioSaving)}
                      disabled={twilioSaving || !smtpPort}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">587 (TLS) veya 465 (SSL)</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">SMTP Kullanici</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="apikey"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_user', smtpUser, setTwilioMessage, setTwilioSaving)}
                      disabled={twilioSaving || !smtpUser}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">SMTP Sifre</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="SMTP API key veya sifre"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_pass', smtpPass, setTwilioMessage, setTwilioSaving)}
                      disabled={twilioSaving || !smtpPass}
                      className="px-4 py-2 text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                      Kaydet
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Veritabaninda AES-256-GCM ile sifrelenerek saklanir.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Gonderen E-posta</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      placeholder="noreply@milletneder.com"
                      className="flex-1 px-3 py-2 text-sm border border-neutral-200 focus:border-black focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveSetting('smtp_from', smtpFrom, setTwilioMessage, setTwilioSaving)}
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

        {/* Test: Bakiye Dusuk Simülasyonu */}
        <div className="border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-bold text-black mb-1">Test Araclari</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Gelistirme ve test amacli simülasyon ayarlari.
          </p>

          {forceLowMessage && (
            <div className="bg-neutral-50 border border-neutral-200 p-2 mb-3 text-xs text-black">
              {forceLowMessage}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-neutral-600">Bakiye Dusuk Simülasyonu</span>
              <p className="text-[10px] text-neutral-400">Acikken SMS bakiyesi dusuk gibi davranir ve bagis modalini gosterir.</p>
            </div>
            <button
              onClick={() => {
                const newVal = !forceLowBalance;
                setForceLowBalance(newVal);
                handleSaveSetting('force_low_balance', String(newVal), setForceLowMessage, setForceLowSaving);
              }}
              disabled={forceLowSaving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                forceLowBalance ? 'bg-amber-500' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  forceLowBalance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Gizlilik Notu */}
        <div className="border border-neutral-200 p-5 bg-neutral-50">
          <h2 className="text-sm font-bold text-black mb-2">Gizlilik ve Guvenlik</h2>
          <ul className="text-xs text-neutral-600 space-y-1.5">
            <li>E-posta ve telefon numaralari hicbir yerde saklanmaz.</li>
            <li>Veritabaninda sadece kimlik hash&apos;i tutulur (SHA256 + HMAC).</li>
            <li>Kullanici kimligi ile oy tercihi arasinda baglanti kurulamaz.</li>
            <li>Twilio, VatanSMS ve SMTP bilgileri AES-256-GCM ile sifrelenerek saklanir.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
