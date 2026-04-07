'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SmsProvider = 'twilio' | 'vatansms' | 'firebase';

export default function AdminSettingsPage() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone'>('email');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // SMS Provider
  const [smsProvider, setSmsProvider] = useState<SmsProvider>('twilio');
  const [selectedProvider, setSelectedProvider] = useState<SmsProvider>('twilio');

  // Fallback provider (Firebase aktifken kullanılacak yedek)
  const [fallbackProvider, setFallbackProvider] = useState<'twilio' | 'vatansms'>('twilio');
  const [selectedFallback, setSelectedFallback] = useState<'twilio' | 'vatansms'>('twilio');

  // Twilio settings
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioVerifySid, setTwilioVerifySid] = useState('');
  const [twilioTestMode, setTwilioTestMode] = useState(false);
  const [twilioSaving, setTwilioSaving] = useState(false);
  const [twilioMessage, setTwilioMessage] = useState('');

  // Firebase settings
  const [firebaseApiKey, setFirebaseApiKey] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState('');
  const [firebaseTestMode, setFirebaseTestMode] = useState(false);
  const [firebaseSaving, setFirebaseSaving] = useState(false);
  const [firebaseMessage, setFirebaseMessage] = useState('');

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
        if (provider === 'twilio' || provider === 'vatansms' || provider === 'firebase') {
          setSmsProvider(provider);
          setSelectedProvider(provider);
        }
        // Fallback provider
        const fb = s?.sms_provider_fallback?.value;
        if (fb === 'twilio' || fb === 'vatansms') {
          setFallbackProvider(fb);
          setSelectedFallback(fb);
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
        // Firebase
        if (s?.firebase_api_key?.value) setFirebaseApiKey(s.firebase_api_key.value);
        if (s?.firebase_project_id?.value) setFirebaseProjectId(s.firebase_project_id.value);
        if (s?.firebase_auth_domain?.value) setFirebaseAuthDomain(s.firebase_auth_domain.value);
        setFirebaseTestMode(s?.firebase_test_mode?.value === 'true');
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
    if (selectedProvider === smsProvider && selectedFallback === fallbackProvider) return;
    setSaving(true);
    setMessage('');

    try {
      // Birincil sağlayıcı
      if (selectedProvider !== smsProvider) {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'sms_provider', value: selectedProvider }),
        });
        if (!res.ok) {
          const data = await res.json();
          setMessage(data.error || 'Hata olustu');
          setSaving(false);
          return;
        }
        setSmsProvider(selectedProvider);
      }

      // Yedek sağlayıcı
      if (selectedFallback !== fallbackProvider) {
        const res2 = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'sms_provider_fallback', value: selectedFallback }),
        });
        if (!res2.ok) {
          const data = await res2.json();
          setMessage(data.error || 'Yedek saglayici kaydedilemedi');
          setSaving(false);
          return;
        }
        setFallbackProvider(selectedFallback);
      }

      setMessage('SMS saglayici ayarlari guncellendi');
      setTimeout(() => setMessage(''), 3000);
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
  const providerChanged = selectedProvider !== smsProvider || selectedFallback !== fallbackProvider;

  // Twilio ayarları ne zaman gösterilir:
  // - E-posta modu seçiliyse (e-posta OTP Twilio Verify kullanır)
  // - SMS modu + Twilio sağlayıcı seçiliyse
  // - Firebase birincilse ve Twilio yedekse
  const showTwilioSettings = selectedMethod === 'email' || selectedProvider === 'twilio' || (selectedProvider === 'firebase' && selectedFallback === 'twilio');
  const showVatanSettings = selectedMethod === 'phone' && (selectedProvider === 'vatansms' || (selectedProvider === 'firebase' && selectedFallback === 'vatansms'));
  const showFirebaseSettings = selectedMethod === 'phone' && selectedProvider === 'firebase';

  if (loading) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-20 flex-1" />
              <Skeleton className="h-20 flex-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-foreground mb-1">Ayarlar</h1>
      <p className="text-muted-foreground text-sm mb-6">Kimlik dogrulama ve servis ayarlari</p>

      {message && (
        <Alert className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Dogrulama Yontemi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kullanici Dogrulama Yontemi</CardTitle>
            <CardDescription className="text-xs">
              Kullanicilarin giris ve kayit olurken kullanacagi dogrulama yontemi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMethod('email')}
                className={`flex-1 py-3 px-4 text-sm font-medium border rounded-lg transition-colors ${
                  selectedMethod === 'email'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                }`}
              >
                <div className="text-center">
                  <span className="block text-lg mb-1">E-posta</span>
                  <span className="block text-[11px] opacity-70">E-posta + sifre ile giris</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedMethod('phone')}
                className={`flex-1 py-3 px-4 text-sm font-medium border rounded-lg transition-colors ${
                  selectedMethod === 'phone'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
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
                <p className="text-xs text-muted-foreground">
                  Yontem degistirildi, kaydetmek icin onaylayin.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMethod(authMethod)}
                  >
                    Iptal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAuthMethod}
                    disabled={saving}
                  >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Saglayici Secimi (sadece SMS modu seciliyken) */}
        {selectedMethod === 'phone' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Birincil SMS Saglayici</CardTitle>
              <CardDescription className="text-xs">
                SMS dogrulama kodlari icin kullanilacak servis saglayicisini secin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedProvider('firebase')}
                  className={`flex-1 py-3 px-4 text-sm font-medium border rounded-lg transition-colors ${
                    selectedProvider === 'firebase'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                  }`}
                >
                  <div className="text-center">
                    <span className="block text-lg mb-1">Firebase</span>
                    <span className="block text-[11px] opacity-70">Google (ucuz, istemci tarafli)</span>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedProvider('twilio')}
                  className={`flex-1 py-3 px-4 text-sm font-medium border rounded-lg transition-colors ${
                    selectedProvider === 'twilio'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                  }`}
                >
                  <div className="text-center">
                    <span className="block text-lg mb-1">Twilio</span>
                    <span className="block text-[11px] opacity-70">Uluslararasi (Verify API)</span>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedProvider('vatansms')}
                  className={`flex-1 py-3 px-4 text-sm font-medium border rounded-lg transition-colors ${
                    selectedProvider === 'vatansms'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                  }`}
                >
                  <div className="text-center">
                    <span className="block text-lg mb-1">VatanSMS</span>
                    <span className="block text-[11px] opacity-70">Yerli saglayici (XML API)</span>
                  </div>
                </button>
              </div>

              {/* Yedek saglayici (Firebase seciliyken) */}
              {selectedProvider === 'firebase' && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="text-xs font-bold text-foreground mb-2">Yedek SMS Saglayici</h3>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Firebase hata verdiginde (Error 39, reCAPTCHA sorunu vb.) kullanici fark etmeden bu saglayiciya duser.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedFallback('twilio')}
                      className={`flex-1 py-2 px-3 text-xs font-medium border rounded-lg transition-colors ${
                        selectedFallback === 'twilio'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                      }`}
                    >
                      Twilio (Yedek)
                    </button>
                    <button
                      onClick={() => setSelectedFallback('vatansms')}
                      className={`flex-1 py-2 px-3 text-xs font-medium border rounded-lg transition-colors ${
                        selectedFallback === 'vatansms'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                      }`}
                    >
                      VatanSMS (Yedek)
                    </button>
                  </div>
                </div>
              )}

              {providerChanged && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Saglayici degistirildi, kaydetmek icin onaylayin.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedProvider(smsProvider); setSelectedFallback(fallbackProvider); }}
                    >
                      Iptal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProvider}
                      disabled={saving}
                    >
                      {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Twilio Ayarlari */}
        {showTwilioSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Twilio Ayarlari</CardTitle>
              <CardDescription className="text-xs">
                {selectedMethod === 'email'
                  ? 'E-posta OTP dogrulama icin Twilio Verify API bilgilerini girin.'
                  : 'SMS dogrulama icin Twilio API bilgilerini girin.'}
                {' '}
                <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Twilio Console
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {twilioMessage && (
                <Alert className="mb-4">
                  <AlertDescription className="text-xs">{twilioMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Account SID</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={twilioSid}
                      onChange={(e) => setTwilioSid(e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('twilio_account_sid', twilioSid, setTwilioMessage, setTwilioSaving)}
                      disabled={twilioSaving || !twilioSid}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Auth Token</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={twilioToken}
                      onChange={(e) => setTwilioToken(e.target.value)}
                      placeholder="Twilio Auth Token"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('twilio_auth_token', twilioToken, setTwilioMessage, setTwilioSaving)}
                      disabled={twilioSaving || !twilioToken}
                    >
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Veritabaninda AES-256-GCM ile sifrelenerek saklanir.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Verify Service SID</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={twilioVerifySid}
                      onChange={(e) => setTwilioVerifySid(e.target.value)}
                      placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('twilio_verify_service_sid', twilioVerifySid, setTwilioMessage, setTwilioSaving)}
                      disabled={twilioSaving || !twilioVerifySid}
                    >
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Twilio Console &gt; Verify &gt; Services &gt; Service SID</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <Label className="text-xs">Test Modu</Label>
                    <p className="text-[10px] text-muted-foreground">Acikken dogrulama kodu gonderilmez, sunucu loglarinda gosterilir.</p>
                  </div>
                  <Switch
                    checked={twilioTestMode}
                    disabled={twilioSaving}
                    onCheckedChange={(checked) => {
                      setTwilioTestMode(checked);
                      handleSaveSetting('twilio_test_mode', String(checked), setTwilioMessage, setTwilioSaving);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VatanSMS Ayarlari */}
        {showVatanSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">VatanSMS Ayarlari</CardTitle>
              <CardDescription className="text-xs">
                Yerli SMS saglayici API bilgilerini girin. Bilgilere{' '}
                <a href="https://panel.vatansms.com" target="_blank" rel="noopener noreferrer" className="underline">
                  VatanSMS Panel
                </a>
                {' '}&gt; Hesap Ayarlari &gt; SMS API bolumunden ulasabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vatanMessage && (
                <Alert className="mb-4">
                  <AlertDescription className="text-xs">{vatanMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">API Kullanici ID</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={vatanApiId}
                      onChange={(e) => setVatanApiId(e.target.value)}
                      placeholder="12345"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('vatansms_api_id', vatanApiId, setVatanMessage, setVatanSaving)}
                      disabled={vatanSaving || !vatanApiId}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">API Kullanici Adi</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={vatanApiUser}
                      onChange={(e) => setVatanApiUser(e.target.value)}
                      placeholder="905XXXXXXXXX"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('vatansms_api_user', vatanApiUser, setVatanMessage, setVatanSaving)}
                      disabled={vatanSaving || !vatanApiUser}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">API Sifre</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={vatanApiPass}
                      onChange={(e) => setVatanApiPass(e.target.value)}
                      placeholder="VatanSMS API sifresi"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('vatansms_api_pass', vatanApiPass, setVatanMessage, setVatanSaving)}
                      disabled={vatanSaving || !vatanApiPass}
                    >
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Veritabaninda AES-256-GCM ile sifrelenerek saklanir.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Gonderen Basligi (Originator)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={vatanSender}
                      onChange={(e) => setVatanSender(e.target.value)}
                      placeholder="MILLETNEDER"
                      maxLength={11}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('vatansms_sender', vatanSender, setVatanMessage, setVatanSaving)}
                      disabled={vatanSaving || !vatanSender}
                    >
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Maks 11 karakter, Turkce karakter kullanilamaz. VatanSMS panelinden tanimlanmis olmali.</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <Label className="text-xs">Test Modu</Label>
                    <p className="text-[10px] text-muted-foreground">Acikken SMS gonderilmez, OTP kodu sunucu loglarinda gosterilir.</p>
                  </div>
                  <Switch
                    checked={vatanTestMode}
                    disabled={vatanSaving}
                    onCheckedChange={(checked) => {
                      setVatanTestMode(checked);
                      handleSaveSetting('vatansms_test_mode', String(checked), setVatanMessage, setVatanSaving);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Firebase Ayarlari */}
        {showFirebaseSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Firebase Ayarlari</CardTitle>
              <CardDescription className="text-xs">
                Firebase Phone Auth istemci tarafinda calisir. reCAPTCHA otomatik olarak yonetilir.{' '}
                <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Firebase Console
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {firebaseMessage && (
                <Alert className="mb-4">
                  <AlertDescription className="text-xs">{firebaseMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Web API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={firebaseApiKey}
                      onChange={(e) => setFirebaseApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('firebase_api_key', firebaseApiKey, setFirebaseMessage, setFirebaseSaving)}
                      disabled={firebaseSaving || !firebaseApiKey}
                    >
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Firebase Console &gt; Project Settings &gt; Web API Key</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Project ID</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={firebaseProjectId}
                      onChange={(e) => setFirebaseProjectId(e.target.value)}
                      placeholder="my-project-12345"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('firebase_project_id', firebaseProjectId, setFirebaseMessage, setFirebaseSaving)}
                      disabled={firebaseSaving || !firebaseProjectId}
                    >
                      Kaydet
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Auth Domain</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={firebaseAuthDomain}
                      onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                      placeholder="my-project-12345.firebaseapp.com"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting('firebase_auth_domain', firebaseAuthDomain, setFirebaseMessage, setFirebaseSaving)}
                      disabled={firebaseSaving || !firebaseAuthDomain}
                    >
                      Kaydet
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Bos birakilirsa project-id.firebaseapp.com kullanilir.</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <Label className="text-xs">Test Modu</Label>
                    <p className="text-[10px] text-muted-foreground">Acikken token dogrulama atlanir (gelistirme icin).</p>
                  </div>
                  <Switch
                    checked={firebaseTestMode}
                    disabled={firebaseSaving}
                    onCheckedChange={(checked) => {
                      setFirebaseTestMode(checked);
                      handleSaveSetting('firebase_test_mode', String(checked), setFirebaseMessage, setFirebaseSaving);
                    }}
                  />
                </div>

                <Alert className="mt-2">
                  <AlertDescription className="text-[10px]">
                    <strong>Not:</strong> Firebase Phone Auth istemci tarafinda calisir. Hata 39, reCAPTCHA sorunu veya kota asiminda
                    kullanici fark etmeden yedek saglayiciya ({selectedFallback === 'twilio' ? 'Twilio' : 'VatanSMS'}) duser.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* E-posta seciliyken: Twilio E-posta + SMTP ayarlari */}
        {selectedMethod === 'email' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Twilio E-posta Kanali</CardTitle>
                <CardDescription className="text-xs">
                  E-posta ile OTP dogrulama icin Twilio Verify servisinde e-posta kanali aktif olmalidir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription className="text-xs">
                    Twilio Console &gt; Verify &gt; Services &gt; Email Integration bolumunden yapilandirin.
                    <br />
                    <a
                      href="https://console.twilio.com/us1/develop/verify/services"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline mt-1 inline-block"
                    >
                      Twilio Verify Services
                    </a>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SMTP E-posta Ayarlari</CardTitle>
                <CardDescription className="text-xs">
                  Kurtarma kodlarini e-posta ile gondermek icin SMTP sunucu bilgilerini girin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">SMTP Host</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.sendgrid.net"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveSetting('smtp_host', smtpHost, setTwilioMessage, setTwilioSaving)}
                        disabled={twilioSaving || !smtpHost}
                      >
                        Kaydet
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">SMTP Port</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveSetting('smtp_port', smtpPort, setTwilioMessage, setTwilioSaving)}
                        disabled={twilioSaving || !smtpPort}
                      >
                        Kaydet
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">587 (TLS) veya 465 (SSL)</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">SMTP Kullanici</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="apikey"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveSetting('smtp_user', smtpUser, setTwilioMessage, setTwilioSaving)}
                        disabled={twilioSaving || !smtpUser}
                      >
                        Kaydet
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">SMTP Sifre</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="SMTP API key veya sifre"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveSetting('smtp_pass', smtpPass, setTwilioMessage, setTwilioSaving)}
                        disabled={twilioSaving || !smtpPass}
                      >
                        Kaydet
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Veritabaninda AES-256-GCM ile sifrelenerek saklanir.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Gonderen E-posta</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        placeholder="noreply@milletneder.com"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveSetting('smtp_from', smtpFrom, setTwilioMessage, setTwilioSaving)}
                        disabled={twilioSaving || !smtpFrom}
                      >
                        Kaydet
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Test: Bakiye Dusuk Simulasyonu */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">Test Araclari</CardTitle>
            <CardDescription className="text-xs">
              Gelistirme ve test amacli simulasyon ayarlari.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forceLowMessage && (
              <Alert className="mb-4">
                <AlertDescription className="text-xs">{forceLowMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Bakiye Dusuk Simulasyonu</Label>
                <p className="text-[10px] text-muted-foreground">Acikken SMS bakiyesi dusuk gibi davranir ve bagis modalini gosterir.</p>
              </div>
              <Switch
                checked={forceLowBalance}
                disabled={forceLowSaving}
                onCheckedChange={(checked) => {
                  setForceLowBalance(checked);
                  handleSaveSetting('force_low_balance', String(checked), setForceLowMessage, setForceLowSaving);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gizlilik Notu */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Gizlilik ve Guvenlik</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>E-posta ve telefon numaralari hicbir yerde saklanmaz.</li>
              <li>Veritabaninda sadece kimlik hash&apos;i tutulur (SHA256 + HMAC).</li>
              <li>Kullanici kimligi ile oy tercihi arasinda baglanti kurulamaz.</li>
              <li>Twilio, VatanSMS ve SMTP bilgileri AES-256-GCM ile sifrelenerek saklanir.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
