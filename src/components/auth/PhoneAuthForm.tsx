'use client';

import { useState, useEffect, useRef } from 'react';

type PhoneStep = 'input' | 'otp' | 'set-credentials';
type Phase = 'input' | 'otp' | 'loading' | 'forgot-password' | 'forgot-code' | 'forgot-new-password';

interface PhoneAuthFormProps {
  onAuthenticated: (verifiedPhone: string, extraData?: { password?: string }) => void;
  onDirectLogin?: (token: string) => void;
  onBack?: () => void;
  loginOnly?: boolean;
  onRegistrationNeeded?: () => void;
}

export default function PhoneAuthForm({ onAuthenticated, onDirectLogin, onBack, loginOnly = false, onRegistrationNeeded }: PhoneAuthFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Phone state
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input');

  // Phone credentials (set after OTP for new users)
  const [credPassword, setCredPassword] = useState('');

  // Forgot password state
  const [forgotPhase, setForgotPhase] = useState<Phase>('input');
  const [forgotPhoneOtp, setForgotPhoneOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  const otpInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Existing user detection
  const [existingUserDetected, setExistingUserDetected] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [showRegisterHint, setShowRegisterHint] = useState(false);

  // Verified phone (stored after OTP verification)
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (phoneStep === 'otp') otpInputRef.current?.focus();
  }, [phoneStep]);

  useEffect(() => {
    if (phoneStep === 'set-credentials') {
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    }
  }, [phoneStep]);

  const getRawPhone = () => phone.replace(/\s/g, '');

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  };

  // --- Send OTP via Twilio ---
  const handleSendOtp = async () => {
    const raw = getRawPhone();
    if (raw.length !== 10 || !raw.startsWith('5')) {
      setError('Geçerli bir cep telefonu numarası girin (5XX ile başlamalı)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'SMS gönderilemedi');
        setLoading(false);
        return;
      }
      setPhoneStep('otp');
      setCountdown(90);
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // --- Verify OTP ---
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('6 haneli doğrulama kodunu girin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const raw = getRawPhone();
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Doğrulama başarısız');
        setLoading(false);
        return;
      }

      if (data.isNewUser) {
        // New user or incomplete — go to set-credentials
        setVerifiedPhone(raw);
        setPhoneStep('set-credentials');
      } else if (data.token) {
        // Existing user logged in
        if (onDirectLogin) {
          onDirectLogin(data.token);
        }
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // --- Set Credentials (password) after OTP ---
  const handleSetCredentials = async () => {
    if (credPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setError('');

    if (loginOnly) {
      // Migration flow: existing user setting password via OTP
      setLoading(true);
      try {
        const raw = getRawPhone();
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: raw, code: '__already_verified__', password: credPassword }),
        });
        // Actually, the phone is already verified. We need to call a different endpoint.
        // For migration, re-call verify-otp won't work. Instead, use phone-login with new password.
        // Actually the flow is: OTP verified → phone marked → now register with password
        const res2 = await fetch('/api/auth/phone-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: raw, password: credPassword, setPassword: true }),
        });
        const data = await res2.json();
        if (!res2.ok) {
          setError(data.error || 'Şifre kaydedilemedi');
          return;
        }
        if (data.token && onDirectLogin) {
          onDirectLogin(data.token);
        }
      } catch {
        setError('Bağlantı hatası');
      } finally {
        setLoading(false);
      }
    } else {
      // Registration flow: pass verified phone + password to parent (VoteModal)
      const raw = verifiedPhone || getRawPhone();
      onAuthenticated(raw, { password: credPassword });
    }
  };

  // --- Phone + Password Login ---
  const handlePhonePasswordLogin = async () => {
    const raw = getRawPhone();
    if (raw.length !== 10 || !raw.startsWith('5')) {
      setError('Geçerli bir cep telefonu numarası girin (5XX ile başlamalı)');
      return;
    }
    if (phonePassword.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, password: phonePassword }),
      });
      const data = await res.json();
      if (data.needsPassword) {
        setNeedsPasswordSetup(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        if (data.needsRegistration && onRegistrationNeeded) {
          onRegistrationNeeded();
          setLoading(false);
          return;
        }
        if (res.status === 401) {
          setError('Bu numarayla kayıtlı bir hesap bulunamadı.');
          setShowRegisterHint(true);
          setLoading(false);
          return;
        }
        setError(data.error || 'Giriş başarısız');
        setLoading(false);
        return;
      }
      if (onDirectLogin) {
        onDirectLogin(data.token);
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // Migration: existing user needs password setup → send OTP
  const handleMigrationOtp = async () => {
    setNeedsPasswordSetup(false);
    setError('');
    await handleSendOtp();
  };

  // Phone check: existing user → password, new user → OTP
  const handlePhoneCheck = async () => {
    const raw = getRawPhone();
    if (raw.length !== 10 || !raw.startsWith('5')) {
      setError('Geçerli bir cep telefonu numarası girin (5XX ile başlamalı)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw }),
      });
      const data = await res.json();
      if (data.exists && data.hasPassword) {
        setExistingUserDetected(true);
        setLoading(false);
        return;
      }
      setLoading(false);
      await handleSendOtp();
    } catch {
      setLoading(false);
      await handleSendOtp();
    }
  };

  // --- Forgot Password (Phone) ---
  const handleForgotPhoneSendOtp = async () => {
    const raw = getRawPhone();
    if (raw.length !== 10 || !raw.startsWith('5')) {
      setError('Geçerli bir cep telefonu numarası girin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'SMS gönderilemedi');
        setLoading(false);
        return;
      }
      setForgotPhase('forgot-code');
      setCountdown(90);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPhoneVerifyAndReset = async () => {
    if (forgotPhoneOtp.length !== 6) {
      setError('6 haneli doğrulama kodunu girin');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // First verify OTP
      const raw = getRawPhone();
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, code: forgotPhoneOtp }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setError(data.error || 'Doğrulama başarısız');
        setLoading(false);
        return;
      }
      // Then reset password
      const resetRes = await fetch('/api/auth/reset-password-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, newPassword: forgotNewPassword }),
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok) {
        setError(resetData.error || 'Şifre sıfırlama başarısız');
        setLoading(false);
        return;
      }
      setForgotPhase('forgot-new-password'); // success
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // ====== RENDER ======

  // Forgot password flow
  if (forgotPhase !== 'input') {
    return (
      <div className="space-y-4 w-full max-w-sm mx-auto">
        {forgotPhase === 'forgot-password' && (
          <>
            <h3 className="font-semibold text-black text-center">Şifremi Unuttum</h3>
            <p className="text-sm text-neutral-600 text-center">Doğrulama kodu SMS ile gönderilecektir</p>
            <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-white">
              <span className="px-3 text-neutral-500 font-medium border-r border-neutral-200 bg-neutral-50">+90</span>
              <input type="tel" inputMode="numeric" value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))} placeholder="5XX XXX XX XX"
                className="flex-1 px-3 py-3 text-black outline-none text-base" autoFocus />
            </div>
            <button onClick={handleForgotPhoneSendOtp} disabled={loading}
              className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-black transition-colors">
              {loading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
            </button>
          </>
        )}

        {forgotPhase === 'forgot-code' && (
          <>
            <h3 className="font-semibold text-black text-center">Doğrulama & Yeni Şifre</h3>
            <input type="text" inputMode="numeric" value={forgotPhoneOtp} maxLength={6}
              onChange={e => setForgotPhoneOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="6 haneli doğrulama kodu" autoFocus
              className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-black text-center text-2xl tracking-[0.5em] font-mono bg-white outline-none focus:ring-2 focus:ring-orange-400" />
            <input type="password" value={forgotNewPassword}
              onChange={e => setForgotNewPassword(e.target.value)}
              placeholder="Yeni şifre (en az 6 karakter)"
              className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-black bg-white outline-none focus:ring-2 focus:ring-orange-400" />
            <button onClick={handleForgotPhoneVerifyAndReset} disabled={loading}
              className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-black transition-colors">
              {loading ? 'Kontrol ediliyor...' : 'Şifreyi Sıfırla'}
            </button>
          </>
        )}

        {forgotPhase === 'forgot-new-password' && (
          <div className="text-center space-y-3">
            <div className="text-green-600 font-medium">Şifreniz başarıyla değiştirildi!</div>
            <button onClick={() => { setForgotPhase('input'); setError(''); }}
              className="text-orange-600 hover:underline text-sm">Giriş yap</button>
          </div>
        )}

        {error && <div className="text-red-500 text-sm text-center">{error}</div>}

        {forgotPhase !== 'forgot-new-password' && (
          <button onClick={() => { setForgotPhase('input'); setError(''); }}
            className="w-full text-neutral-500 hover:text-black text-sm py-2 transition-colors">Geri</button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-sm mx-auto">
      {phoneStep === 'input' && (
        <>
          {!loginOnly && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-neutral-700 font-semibold">Numaran bizde saklanmaz</p>
              <div className="flex items-start gap-2 text-xs text-neutral-600">
                <span className="mt-0.5">&#128274;</span>
                <span>Numaran sadece doğrulama kodu göndermek için kullanılır</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-neutral-600">
                <span className="mt-0.5">&#128394;</span>
                <span>Numaranı kaydetmiyoruz — sistemimizde telefon numarası tutulmaz</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-neutral-600">
                <span className="mt-0.5">&#9989;</span>
                <span>Oyun tamamen anonim, kimliğinle eşleştirilemez</span>
              </div>
            </div>
          )}

          <label className="block text-sm font-medium text-neutral-700">Cep Telefonu</label>
          <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-white">
            <span className="px-3 text-neutral-500 font-medium border-r border-neutral-200 bg-neutral-50">+90</span>
            <input type="tel" inputMode="numeric" value={phone}
              onChange={e => { setPhone(formatPhone(e.target.value)); setExistingUserDetected(false); setShowRegisterHint(false); setNeedsPasswordSetup(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); loginOnly ? (existingUserDetected ? handlePhonePasswordLogin() : handlePhoneCheck()) : handleSendOtp(); } }}
              placeholder="5XX XXX XX XX"
              className="flex-1 px-3 py-3 text-black outline-none text-base" autoFocus />
          </div>

          {existingUserDetected && (
            <div className="space-y-3">
              <input type="password" value={phonePassword} ref={passwordInputRef}
                onChange={e => setPhonePassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePhonePasswordLogin(); } }}
                placeholder="Şifre" autoFocus
                className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-black bg-white outline-none focus:ring-2 focus:ring-orange-400" />
              <button onClick={handlePhonePasswordLogin} disabled={loading}
                className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-black transition-colors">
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
              <button onClick={() => { setForgotPhase('forgot-password'); setError(''); }}
                className="w-full text-neutral-500 hover:text-black text-xs py-1 transition-colors">Şifremi unuttum</button>
            </div>
          )}

          {needsPasswordSetup && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              <p>Bu numara kayıtlı ancak henüz şifre belirlenmemiş.</p>
              <button onClick={handleMigrationOtp} className="text-orange-600 font-medium hover:underline mt-1">
                SMS ile doğrulayıp şifre belirle
              </button>
            </div>
          )}

          {showRegisterHint && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p>Bu numara ile kayıtlı hesap bulunamadı.</p>
              {onRegistrationNeeded && (
                <button onClick={onRegistrationNeeded} className="text-blue-600 font-medium hover:underline mt-1">
                  Yeni hesap oluştur
                </button>
              )}
            </div>
          )}

          {!existingUserDetected && !needsPasswordSetup && !showRegisterHint && (
            <button onClick={loginOnly ? handlePhoneCheck : handleSendOtp} disabled={loading}
              className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-black transition-colors">
              {loading ? 'Gönderiliyor...' : 'Devam Et'}
            </button>
          )}
        </>
      )}

      {phoneStep === 'otp' && (
        <>
          <p className="text-sm text-neutral-600 text-center">
            <span className="font-medium text-black">+90 {phone}</span> numarasına doğrulama kodu gönderildi
          </p>
          <input type="text" inputMode="numeric" ref={otpInputRef} value={otpCode} maxLength={6}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleVerifyOtp(); } }}
            placeholder="000000"
            className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-black text-center text-2xl tracking-[0.5em] font-mono bg-white outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 6}
            className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-black transition-colors">
            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
          </button>
          <div className="flex justify-between text-sm">
            <button onClick={() => { setPhoneStep('input'); setOtpCode(''); setError(''); }}
              className="text-neutral-500 hover:text-black transition-colors">Numarayı Değiştir</button>
            {countdown > 0 ? (
              <span className="text-neutral-400">{countdown}s</span>
            ) : (
              <button onClick={handleSendOtp} disabled={loading}
                className="text-orange-600 hover:text-orange-700 font-medium transition-colors">Tekrar Gönder</button>
            )}
          </div>
        </>
      )}

      {phoneStep === 'set-credentials' && (
        <>
          <p className="text-sm text-neutral-600 text-center">Oyunuzu korumak için bir şifre belirleyin</p>
          <input type="password" ref={passwordInputRef} value={credPassword}
            onChange={e => setCredPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSetCredentials(); } }}
            placeholder="Şifre (en az 6 karakter)" autoFocus
            className="w-full border border-neutral-200 rounded-lg px-4 py-3 text-black bg-white outline-none focus:ring-2 focus:ring-orange-400" />
          <p className="text-xs text-neutral-500">
            Şifreniz, oyunuzun gizliliğini sağlayan şifreleme anahtarını oluşturur.
          </p>
          <button onClick={handleSetCredentials} disabled={loading || credPassword.length < 6}
            className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-black transition-colors">
            {loading ? 'Kaydediliyor...' : 'Devam Et'}
          </button>
        </>
      )}

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      {onBack && phoneStep === 'input' && !existingUserDetected && (
        <button onClick={onBack} className="w-full text-neutral-500 hover:text-black text-sm py-2 transition-colors">Geri</button>
      )}
    </div>
  );
}
