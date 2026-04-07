'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, Mail, Lock, ShieldCheck, Ban } from 'lucide-react';
// Multi-provider OTP: Firebase (primary, client-side) + Twilio/VatanSMS (fallback, server-side)

type AuthMethod = 'email' | 'phone';
type EmailStep = 'email' | 'login' | 'verify-code' | 'set-password';
type PhoneStep = 'input' | 'otp' | 'set-credentials';
type Phase = 'input' | 'otp' | 'loading' | 'forgot-password' | 'forgot-code' | 'forgot-new-password';

interface AuthFormProps {
  method: AuthMethod;
  onAuthenticated: (identityValue: string, extraData?: { password?: string }) => void;
  /** Direkt JWT ile login (phone+password) */
  onDirectLogin?: (token: string) => void;
  onBack?: () => void;
  loginOnly?: boolean;
  /** DB'de kayıt bulunamadığında çağrılır — VoteModal açmak için */
  onRegistrationNeeded?: () => void;
}

export default function AuthForm({ method, onAuthenticated, onDirectLogin, onBack, loginOnly = false, onRegistrationNeeded }: AuthFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStep, setEmailStep] = useState<EmailStep>('email');
  const [verifyCode, setVerifyCode] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input');

  // Phone credentials (set after OTP for new users)
  const [credPassword, setCredPassword] = useState('');

  // Verified phone (stored after OTP verification for Twilio flow)
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // Firebase Phone Auth state
  const [smsProvider, setSmsProvider] = useState<string>('twilio');
  const [firebaseConfig, setFirebaseConfig] = useState<{ apiKey: string; authDomain: string; projectId: string } | null>(null);
  const [firebaseConfirmation, setFirebaseConfirmation] = useState<ConfirmationResult | null>(null);
  const [usingFirebase, setUsingFirebase] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Forgot password state
  const [forgotPhase, setForgotPhase] = useState<Phase>('input');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  // Phone forgot: OTP ile doğrula sonra şifre belirle
  const [forgotPhoneOtp, setForgotPhoneOtp] = useState('');

  const otpInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
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
    if (emailStep === 'login' || emailStep === 'set-password') {
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    }
  }, [emailStep]);

  // ========== SMS PROVIDER CONFIG ==========
  useEffect(() => {
    if (method !== 'phone') return;
    fetch('/api/auth/provider-config')
      .then((res) => res.json())
      .then((data) => {
        setSmsProvider(data.provider || 'twilio');
        if (data.firebaseConfig) setFirebaseConfig(data.firebaseConfig);
      })
      .catch(() => setSmsProvider('twilio'));
  }, [method]);

  /**
   * Firebase Phone Auth ile SMS gönder (istemci tarafı).
   * Başarısız olursa false döner → Twilio fallback kullanılır.
   */
  const sendFirebaseOtp = useCallback(async (phoneNumber: string): Promise<boolean> => {
    if (!firebaseConfig) return false;

    try {
      // Firebase modüllerini dinamik olarak yükle (tree-shaking)
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth, signInWithPhoneNumber, RecaptchaVerifier } = await import('firebase/auth');

      // Firebase app'i başlat (bir kere)
      const app = getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApps()[0];
      const auth = getAuth(app);
      // Dili Türkçe yap
      auth.languageCode = 'tr';

      // Invisible reCAPTCHA oluştur
      if (!recaptchaContainerRef.current) return false;

      // Önceki verifier'ı temizle
      const win = window as unknown as Record<string, unknown>;
      if (win.__recaptchaVerifier) {
        try {
          (win.__recaptchaVerifier as { clear: () => void }).clear();
        } catch { /* ignore */ }
        delete win.__recaptchaVerifier;
      }

      // reCAPTCHA container'ı temizle (eski widget kalıntıları)
      recaptchaContainerRef.current.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        callback: () => {
          console.log('[FIREBASE] reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('[FIREBASE] reCAPTCHA expired');
        },
      });
      win.__recaptchaVerifier = verifier;

      // reCAPTCHA'yı önceden render et
      await verifier.render();
      console.log('[FIREBASE] reCAPTCHA rendered');

      // SMS gönder
      const fullPhone = `+90${phoneNumber}`;
      console.log('[FIREBASE] Sending OTP to', fullPhone);
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setFirebaseConfirmation(confirmation);
      setUsingFirebase(true);
      console.log('[FIREBASE] OTP sent successfully');
      return true;
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      console.error('[FIREBASE] Send OTP failed:', firebaseError.code, firebaseError.message);

      // Fallback tetiklenecek hatalar
      const fallbackErrors = [
        'auth/error-code:-39',        // Rate limit / bölgesel blok
        'auth/too-many-requests',     // IP rate limit
        'auth/quota-exceeded',        // Proje kotası
        'auth/captcha-check-failed',  // reCAPTCHA sorunu
        'auth/internal-error',        // Firebase backend hatası
        'auth/network-request-failed', // Ağ hatası
        'auth/missing-client-identifier', // reCAPTCHA başarısız
      ];

      if (firebaseError.code && fallbackErrors.includes(firebaseError.code)) {
        console.log('[FIREBASE] Falling back to server-side provider:', firebaseError.code);
        return false; // Fallback'e düş
      }

      // Kullanıcıya gösterilecek hatalar (Twilio'ya düşmenin anlamı yok)
      if (firebaseError.code === 'auth/invalid-phone-number') {
        throw new Error('Geçersiz telefon numarası.');
      }

      // Bilinmeyen hata — güvenli tarafta kal, fallback'e düş
      return false;
    }
  }, [firebaseConfig]);

  /**
   * Firebase ile doğrulama kodunu kontrol et.
   * Başarılı olursa Firebase ID token'ını sunucuya gönderir.
   */
  const verifyFirebaseOtp = useCallback(async (code: string): Promise<{ success: boolean; data?: Record<string, unknown> }> => {
    if (!firebaseConfirmation) return { success: false };

    try {
      const credential = await firebaseConfirmation.confirm(code);
      const idToken = await credential.user.getIdToken();

      // ID token'ı sunucuya gönder
      const res = await fetch('/api/auth/verify-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        return { success: false, data: { error: data.error || 'Doğrulama başarısız' } };
      }

      const data = await res.json();
      return { success: true, data };
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/invalid-verification-code') {
        return { success: false, data: { error: 'Hatalı doğrulama kodu.' } };
      }
      if (firebaseError.code === 'auth/code-expired') {
        return { success: false, data: { error: 'Doğrulama kodunun süresi doldu. Tekrar kod gönderin.' } };
      }
      return { success: false, data: { error: 'Doğrulama başarısız. Tekrar deneyin.' } };
    }
  }, [firebaseConfirmation]);

  // ========== EMAIL AUTH ==========
  const handleEmailContinue = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }
    // Bakiye kontrolü (yeni kayıt OTP gerektirebilir)
    if (!loginOnly) {
      const available = await checkSmsAvailability();
      if (!available) return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.exists) {
        setEmailStep('login');
      } else {
        if (loginOnly) {
          if (onRegistrationNeeded) {
            onRegistrationNeeded();
          } else {
            setError('Bu e-posta ile kayıtlı hesap bulunamadı. Kayıt olmak için Katıl butonunu kullanın.');
          }
        } else {
          // Send email OTP via Twilio Verify
          try {
            const codeRes = await fetch('/api/auth/send-email-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() }),
            });
            const codeData = await codeRes.json();
            if (!codeRes.ok) {
              setError(codeData.error || 'Doğrulama kodu gönderilemedi');
              setLoading(false);
              return;
            }
          } catch {
            setError('Doğrulama kodu gönderilemedi');
            setLoading(false);
            return;
          }
          setEmailStep('verify-code');
          setCountdown(90);
        }
      }
    } catch {
      setEmailStep('login');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Giriş başarısız. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }
      // Direkt JWT ile login
      if (data.token && onDirectLogin) {
        onDirectLogin(data.token);
      }
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verifyCode.length !== 6) {
      setError('6 haneli doğrulama kodunu girin');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Doğrulama başarısız');
        setLoading(false);
        return;
      }
      if (data.token && !data.isNewUser) {
        // Existing user — shouldn't happen (login flow handles this), but just in case
        if (onDirectLogin) onDirectLogin(data.token);
      } else {
        // New user — go to set password
        setEmailStep('set-password');
      }
    } catch {
      setError('Doğrulama sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Kod gönderilemedi');
      else { setVerifyCode(''); setCountdown(90); }
    } catch {
      setError('Kod gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    // Email verified via Twilio OTP — pass email + password to parent
    // Email is used as the identity (like phone number for phone auth)
    onAuthenticated(email.trim(), { password });
  };

  // ========== PHONE AUTH ==========
  const formatPhone = (value: string): string => {
    let digits = value.replace(/\D/g, '');
    // Başındaki 0'ı veya 90 ülke kodunu temizle
    if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    const limited = digits.slice(0, 10);
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    if (limited.length <= 8) return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 8)} ${limited.slice(8)}`;
  };

  const getRawPhone = () => phone.replace(/\s/g, '');

  // Mevcut kullanıcı tespiti (VoteModal'da SMS göndermeden önce kontrol)
  const [existingUserDetected, setExistingUserDetected] = useState(false);

  // Phone + password login
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [showRegisterHint, setShowRegisterHint] = useState(false);

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
        // Kullanıcı var ama şifre belirlenmemiş — kullanıcıya bilgi ver
        setNeedsPasswordSetup(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        // Sadece tamamlanmamış kayıt durumunda VoteModal'a yönlendir
        if (data.needsRegistration && onRegistrationNeeded) {
          onRegistrationNeeded();
          setLoading(false);
          return;
        }
        // Kullanıcı bulunamadı → hata mesajı + kayıt ol butonu göster
        if (res.status === 401) {
          setError('Bu numarayla kayıtlı bir hesap bulunamadı.');
          setShowRegisterHint(true);
          setLoading(false);
          return;
        }
        // Diğer hatalar (yanlış şifre, hesap devre dışı) → sadece hata mesajı
        setError(data.error || 'Giriş başarısız');
        setLoading(false);
        return;
      }
      // Direkt JWT ile login
      if (onDirectLogin) {
        onDirectLogin(data.token);
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // Mevcut kullanıcı şifre belirleme: OTP gönder → doğrula → şifre belirle
  const handleMigrationOtp = async () => {
    setNeedsPasswordSetup(false);
    setError('');
    await handleSendOtp();
  };

  // VoteModal'dan giriş: önce telefon DB'de kayıtlı mı kontrol et
  // Kayıtlıysa şifre sor (SMS yok), değilse OTP gönder (SMS)
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
        // Mevcut kullanıcı, şifresi var — şifre sor, SMS gönderme
        setExistingUserDetected(true);
        setLoading(false);
        return;
      }
      // Yeni kullanıcı veya şifresi yok — OTP gönder
      setLoading(false);
      await handleSendOtp();
    } catch {
      // Kontrol başarısız — güvenli tarafta kal, OTP gönder
      setLoading(false);
      await handleSendOtp();
    }
  };

  const handleSendOtp = async () => {
    const raw = getRawPhone();
    if (raw.length !== 10 || !raw.startsWith('5')) {
      setError('Geçerli bir cep telefonu numarası girin (5XX ile başlamalı)');
      return;
    }
    // Bakiye kontrolü
    const available = await checkSmsAvailability();
    if (!available) return;

    setLoading(true);
    setError('');
    setUsingFirebase(false);

    // Firebase birincil sağlayıcıysa önce onu dene
    let isFirebaseFallback = false;
    if (smsProvider === 'firebase' && firebaseConfig) {
      try {
        const firebaseSuccess = await sendFirebaseOtp(raw);
        if (firebaseSuccess) {
          setPhoneStep('otp');
          setCountdown(90);
          setLoading(false);
          return;
        }
        // Firebase başarısız → sessizce Twilio fallback'e düş
        console.log('[AUTH] Firebase failed, falling back to server-side OTP');
        isFirebaseFallback = true;
      } catch (err) {
        // Firebase bilinen kullanıcı hatası (geçersiz numara vb.)
        if (err instanceof Error) {
          setError(err.message);
          setLoading(false);
          return;
        }
      }
    }

    // Sunucu tarafı OTP (Twilio/VatanSMS veya Firebase fallback)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, ...(isFirebaseFallback && { firebaseFallback: true }) }),
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

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('6 haneli doğrulama kodunu girin');
      return;
    }
    setLoading(true);
    setError('');

    // Firebase ile doğrulama
    if (usingFirebase && firebaseConfirmation) {
      try {
        const result = await verifyFirebaseOtp(otpCode);
        if (!result.success) {
          setError((result.data?.error as string) || 'Doğrulama başarısız');
          setLoading(false);
          return;
        }
        const data = result.data!;
        if (data.token && !data.isNewUser) {
          if (onDirectLogin) onDirectLogin(data.token as string);
        } else {
          setVerifiedPhone(getRawPhone());
          setPhoneStep('set-credentials');
        }
      } catch {
        setError('Doğrulama başarısız');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sunucu tarafı doğrulama (Twilio/VatanSMS)
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

      if (data.token && !data.isNewUser) {
        // Existing user logged in — direct login
        if (onDirectLogin) {
          onDirectLogin(data.token);
        }
      } else {
        // New user or needs credentials — go to set-credentials
        setVerifiedPhone(raw);
        setPhoneStep('set-credentials');
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleSetCredentials = async () => {
    if (credPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setError('');
    const raw = verifiedPhone || getRawPhone();

    if (loginOnly) {
      // Migration flow: mevcut kullanıcı şifre belirliyor (OTP ile doğrulandı)
      setLoading(true);
      try {
        const res = await fetch('/api/auth/phone-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: raw, password: credPassword, setPassword: true }),
        });
        const data = await res.json();
        if (!res.ok) {
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
      // Registration flow: yeni kullanıcı — profil adımına geç
      onAuthenticated(raw, { password: credPassword });
    }
  };

  // ========== SMS BAKİYE KONTROLÜ ==========
  const [smsUnavailable, setSmsUnavailable] = useState(false);

  const checkSmsAvailability = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/sms-status');
      if (res.ok) {
        const data = await res.json();
        if (!data.available) {
          setSmsUnavailable(true);
          return false;
        }
      }
    } catch { /* hata durumunda devam et */ }
    return true;
  };

  // ========== FORGOT PASSWORD ==========
  const handleForgotSendCode = async () => {
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }
    // Bakiye kontrolü
    const available = await checkSmsAvailability();
    if (!available) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kod gönderilemedi');
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

  const handleForgotVerifyAndReset = async () => {
    if (forgotCode.length !== 6) {
      setError('6 haneli kodu girin');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: forgotCode,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Şifre sıfırlama başarısız');
        setLoading(false);
        return;
      }
      setForgotPhase('forgot-new-password'); // success state
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // ========== PHONE FORGOT: SMS OTP ile şifre sıfırlama ==========
  const handleForgotPhoneSendOtp = async () => {
    const raw = getRawPhone();
    if (raw.length !== 10 || !raw.startsWith('5')) {
      setError('Geçerli bir cep telefonu numarası girin');
      return;
    }
    // Bakiye kontrolü
    const available = await checkSmsAvailability();
    if (!available) return;

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
      setError('6 haneli kodu girin');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('Yeni şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const raw = getRawPhone();
      // First verify OTP
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, code: forgotPhoneOtp }),
      });
      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json();
        setError(verifyData.error || 'Kod doğrulanamadı');
        setLoading(false);
        return;
      }
      // Then reset password
      const res = await fetch('/api/auth/reset-password-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: raw, newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Şifre sıfırlama başarısız');
        setLoading(false);
        return;
      }
      setForgotPhase('forgot-new-password'); // success
    } catch {
      setError('Şifre sıfırlama başarısız');
    } finally {
      setLoading(false);
    }
  };

  // ========== RENDER ==========

  // --- SMS BAKİYE TÜKENDİ ---
  if (smsUnavailable) {
    return (
      <div className="w-full max-w-md mx-auto space-y-5 text-center">
        <div className="w-14 h-14 mx-auto bg-muted rounded-lg flex items-center justify-center">
          <AlertCircle className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">SMS Bakiyemiz Tükendi</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Doğrulama kodu göndermek için SMS bakiyemiz şu an yetersiz.
            Bağımsız bir platform olarak devam edebilmemiz bireysel desteklere bağlıdır.
          </p>
        </div>
        <Alert>
          <AlertDescription>
            <strong>milletneder.com</strong> hiçbir siyasi partiye, kuruma veya şirkete bağlı değildir.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            const el = document.getElementById('bagis-yap');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="w-full"
        >
          Destekçimiz Ol
        </Button>
        {onBack && (
          <Button onClick={onBack} variant="ghost" className="text-muted-foreground">
            Geri
          </Button>
        )}
      </div>
    );
  }

  // --- FORGOT PASSWORD FLOW ---
  if (forgotPhase === 'forgot-password') {
    // Telefon modunda: SMS ile şifre sıfırlama
    if (method === 'phone') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <h3 className="text-xl font-bold text-foreground">Şifremi Unuttum</h3>
          <p className="text-sm text-muted-foreground">Telefon numaranıza doğrulama kodu göndereceğiz, ardından yeni şifre belirleyebilirsiniz.</p>
          <div>
            <Label className="mb-1.5">Cep Telefonu</Label>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>+90</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                type="tel" data-clarity-mask="true"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && getRawPhone().length === 10 && handleForgotPhoneSendOtp()}
                placeholder="5XX XXX XX XX"
                autoFocus
              />
            </InputGroup>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-3">
            <Button
              onClick={() => { setForgotPhase('input'); setError(''); }}
              variant="secondary" className="flex-1"
            >
              Geri
            </Button>
            <Button
                onClick={handleForgotPhoneSendOtp}
                disabled={loading || getRawPhone().length !== 10}
                className="flex-1"
              >
                {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder'}
              </Button>
          </div>
        </div>
      );
    }

    // Email modunda: e-posta ile şifre sıfırlama
    return (
      <div className="w-full max-w-md mx-auto space-y-5">
        <h3 className="text-xl font-bold text-foreground">Şifremi Unuttum</h3>
        <p className="text-sm text-muted-foreground">Kayıt sırasında girdiğin e-posta adresini yaz, şifre sıfırlama kodu gönderelim.</p>
        <div>
          <Label className="mb-1.5">E-posta</Label>
          <Input
            type="email"
            data-clarity-mask="true"
            value={forgotEmail}
            onChange={(e) => { setForgotEmail(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleForgotSendCode()}
            className="w-full"
            placeholder="ornek@email.com"
            autoFocus
          />
        </div>
        {error && <p className="text-destructive text-xs">{error}</p>}
        <div className="flex gap-3">
          <Button
            onClick={() => { setForgotPhase('input'); setError(''); }}
            variant="secondary" className="flex-1"
          >
            Geri
          </Button>
          <Button
            onClick={handleForgotSendCode}
            disabled={loading || !forgotEmail.trim()}
            className="flex-1"
          >
            {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
          </Button>
        </div>
      </div>
    );
  }

  if (forgotPhase === 'forgot-code') {
    // Telefon modunda: SMS OTP doğrulama + yeni şifre
    if (method === 'phone') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground mb-2">Doğrulama Kodu</h3>
            <p className="text-sm text-muted-foreground">
              <strong>+90 {phone}</strong> numarasına SMS ile kod gönderdik.
            </p>
          </div>
          <div>
            <Input
              type="text"
              inputMode="numeric"
              data-clarity-mask="true"
              value={forgotPhoneOtp}
              onChange={(e) => { setForgotPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              className="text-center text-2xl tracking-[0.5em] font-mono h-12"
              placeholder="------"
              maxLength={6}
              autoFocus
            />
          </div>
          <div>
            <Label className="mb-1.5">Yeni Şifre</Label>
            <Input
              type="password" data-clarity-mask="true"
              value={forgotNewPassword}
              onChange={(e) => { setForgotNewPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && forgotPhoneOtp.length === 6 && forgotNewPassword.length >= 6 && handleForgotPhoneVerifyAndReset()}
              className="w-full"
              placeholder="En az 6 karakter"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button
            onClick={handleForgotPhoneVerifyAndReset}
            disabled={loading || forgotPhoneOtp.length !== 6 || forgotNewPassword.length < 6}
            className="w-full"
          >
            {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
          </Button>
          <Button
            onClick={() => { setForgotPhase('forgot-password'); setForgotPhoneOtp(''); setForgotNewPassword(''); setError(''); }}
            variant="ghost" className="w-full text-muted-foreground"
          >
            Numarayı Değiştir
          </Button>
        </div>
      );
    }

    // Email modunda: e-posta kodu doğrulama + yeni şifre
    return (
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">Şifre Sıfırlama Kodu</h3>
          <p className="text-sm text-muted-foreground">
            <strong>{forgotEmail}</strong> adresine 6 haneli kod gönderdik.
          </p>
        </div>
        <div>
          <Input
            type="text"
            inputMode="numeric"
            data-clarity-mask="true"
            value={forgotCode}
            onChange={(e) => { setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            className="text-center text-2xl tracking-[0.5em] font-mono h-12"
            placeholder="------"
            maxLength={6}
            autoFocus
          />
        </div>
        <div>
          <Label className="mb-1.5">Yeni Şifre</Label>
          <Input
            type="password" data-clarity-mask="true"
            value={forgotNewPassword}
            onChange={(e) => { setForgotNewPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && forgotCode.length === 6 && forgotNewPassword.length >= 6 && handleForgotVerifyAndReset()}
            className="w-full"
            placeholder="En az 6 karakter"
          />
        </div>
        {error && <p className="text-destructive text-xs">{error}</p>}
        <Button
          onClick={handleForgotVerifyAndReset}
          disabled={loading || forgotCode.length !== 6 || forgotNewPassword.length < 6}
          className="w-full"
        >
          {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
        </Button>
        <Button
          onClick={() => { setForgotPhase('forgot-password'); setForgotCode(''); setForgotNewPassword(''); setError(''); }}
          variant="ghost" className="w-full text-muted-foreground"
        >
          E-postayı Değiştir
        </Button>
      </div>
    );
  }

  if (forgotPhase === 'forgot-new-password') {
    return (
      <div className="w-full max-w-md mx-auto space-y-5 text-center">
        <div className="w-16 h-16 mx-auto bg-muted/50 rounded-lg flex items-center justify-center">
          <Check className="size-8 text-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Şifren Güncellendi!</h3>
        <p className="text-sm text-muted-foreground">Yeni şifrenle giriş yapabilirsin.</p>
        <Button
          onClick={() => { setForgotPhase('input'); setForgotEmail(''); setForgotCode(''); setForgotNewPassword(''); setError(''); }}
          className="w-full"
        >
          Giriş Yap
        </Button>
      </div>
    );
  }

  // --- EMAIL AUTH ---
  if (method === 'email') {
    if (emailStep === 'email') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <Alert>
            <Lock />
            <AlertTitle>Bilgilerin güvende</AlertTitle>
            <AlertDescription>
              <ul className="space-y-1 mt-1">
                <li>E-postan sadece doğrulama ve giriş için kullanılır.</li>
                <li>Oyun veya kişisel bilgilerin ile asla eşleştirilmez.</li>
                <li>E-postan hiçbir yerde saklanmaz — sadece şifreli hash&apos;i tutulur.</li>
              </ul>
            </AlertDescription>
          </Alert>
          <div>
            <Label className="mb-1.5">E-posta</Label>
            <Input
              type="email"
              data-clarity-mask="true"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleEmailContinue()}
              className="w-full"
              placeholder="ornek@email.com"
              autoFocus
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-3">
            {onBack && (
              <Button onClick={onBack} variant="secondary" className="flex-1">Geri</Button>
            )}
            <Button
              onClick={handleEmailContinue}
              disabled={loading || !email.trim()}
              className="flex-1"
            >
              {loading ? 'Kontrol ediliyor...' : 'Devam Et'}
            </Button>
          </div>
          {!loginOnly && (
            <p className="text-xs text-muted-foreground text-center">Hesabın yoksa otomatik oluşturulur.</p>
          )}
        </div>
      );
    }

    if (emailStep === 'login') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <h3 className="text-xl font-bold text-foreground">Giriş Yap</h3>
          <Alert>
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-xs text-muted-foreground">E-posta</p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>
              <Button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); }} variant="ghost" className="text-muted-foreground">Değiştir</Button>
            </div>
          </Alert>
          <div>
            <Label className="mb-1.5">Şifre</Label>
            <Input
              ref={passwordInputRef}
              type="password" data-clarity-mask="true"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              className="w-full"
              placeholder="Şifrenizi girin"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); }} variant="secondary" className="flex-1">Geri</Button>
            <Button
              onClick={handleEmailLogin}
              disabled={loading || password.length < 6}
              className="flex-1"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </div>
        </div>
      );
    }

    if (emailStep === 'verify-code') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-lg flex items-center justify-center">
              <Mail className="size-8 text-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Doğrulama Kodu</h3>
            <p className="text-sm text-muted-foreground"><strong>{email}</strong> adresine 6 haneli kod gönderdik.</p>
          </div>
          <div>
            <Input
              type="text"
              inputMode="numeric"
              data-clarity-mask="true"
              value={verifyCode}
              onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode.length === 6 && handleVerifyCode()}
              className="text-center text-2xl tracking-[0.5em] font-mono h-12"
              placeholder="------"
              maxLength={6}
              autoFocus
            />
          </div>
          {error && <p className="text-destructive text-xs text-center">{error}</p>}
          <Button
            onClick={handleVerifyCode}
            disabled={loading || verifyCode.length !== 6}
            className="w-full"
          >
            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); setVerifyCode(''); }} variant="ghost" className="text-muted-foreground">E-postayı Değiştir</Button>
            <Button onClick={handleResendCode} disabled={loading} variant="link">Tekrar Gönder</Button>
          </div>
        </div>
      );
    }

    if (emailStep === 'set-password') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <h3 className="text-xl font-bold text-foreground">Şifre Belirle</h3>
          <p className="text-sm text-muted-foreground">E-postan doğrulandı. Şimdi hesabın için bir şifre belirle.</p>
          <Alert>
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-xs text-muted-foreground">E-posta</p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Check className="size-3" />
                Doğrulandı
              </span>
            </div>
          </Alert>
          <div>
            <Label className="mb-1.5">Şifre belirle</Label>
            <Input
              ref={passwordInputRef}
              type="password" data-clarity-mask="true"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && password.length >= 6 && handleSetPassword()}
              className="w-full"
              placeholder="En az 6 karakter"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); setVerifyCode(''); }} variant="secondary" className="flex-1">Geri</Button>
            <Button
              onClick={handleSetPassword}
              disabled={loading || password.length < 6}
              className="flex-1"
            >
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
            </Button>
          </div>
        </div>
      );
    }
  }

  // --- PHONE AUTH ---
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Firebase invisible reCAPTCHA container */}
      <div ref={recaptchaContainerRef} id="recaptcha-container" />

      {phoneStep === 'input' && (
        <div className="space-y-4">
          {!loginOnly && (
          <Alert>
            <Lock />
            <AlertTitle>Numaran bizde saklanmaz</AlertTitle>
            <AlertDescription>
              <ul className="space-y-1 mt-1">
                <li>Numaran sadece doğrulama kodu göndermek için kullanılır</li>
                <li>Numaranı kaydetmiyoruz — sistemimizde telefon numarası tutulmaz</li>
                <li>Oyun tamamen anonim, kimliğinle eşleştirilemez</li>
              </ul>
            </AlertDescription>
          </Alert>
          )}

          <div>
            <Label className="mb-1.5">Cep Telefonu</Label>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>+90</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                type="tel" data-clarity-mask="true"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); setExistingUserDetected(false); setShowRegisterHint(false); }}
                onKeyDown={(e) => e.key === 'Enter' && (loginOnly || existingUserDetected) && getRawPhone().length === 10 && phonePassword.length >= 6 && handlePhonePasswordLogin()}
                placeholder="5XX XXX XX XX"
                autoFocus
              />
            </InputGroup>
          </div>

          {(loginOnly || existingUserDetected) && (
            <div>
              <Label className="mb-1.5">Şifre</Label>
              <Input
                type="password" data-clarity-mask="true"
                value={phonePassword}
                onChange={(e) => { setPhonePassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && getRawPhone().length === 10 && phonePassword.length >= 6 && handlePhonePasswordLogin()}
                className="w-full"
                placeholder="Şifrenizi girin"
              />
            </div>
          )}

          {existingUserDetected && (
            <Alert>
              <AlertDescription>Bu numarayla kayıtlı hesap bulundu. Şifrenizi girerek devam edin.</AlertDescription>
            </Alert>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}

          {needsPasswordSetup && (
            <Alert>
              <AlertTitle>Şifre belirlemeniz gerekiyor</AlertTitle>
              <AlertDescription>
                Hesabınızda henüz şifre tanımlı değil. Telefonunuza doğrulama kodu göndereceğiz, ardından bir şifre belirleyebilirsiniz.
              </AlertDescription>
              <Button
                onClick={handleMigrationOtp}
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
              </Button>
            </Alert>
          )}

          {!needsPasswordSetup && (
            <div className="flex gap-2">
              {onBack && (
                <Button onClick={onBack} variant="secondary" className="shrink-0">Geri</Button>
              )}
              <Button
                onClick={(loginOnly || existingUserDetected) ? handlePhonePasswordLogin : handlePhoneCheck}
                disabled={loading || getRawPhone().length !== 10 || ((loginOnly || existingUserDetected) && phonePassword.length < 6)}
                className="flex-1"
              >
                {loading ? 'Gönderiliyor...' : (loginOnly || existingUserDetected) ? 'Giriş Yap' : 'Devam Et'}
              </Button>
            </div>
          )}

          {(loginOnly || existingUserDetected) && (
            <Button
              onClick={() => { setForgotPhase('forgot-password'); setError(''); }}
              variant="ghost" className="w-full text-muted-foreground"
            >
              Şifremi Unuttum
            </Button>
          )}

          {showRegisterHint && onRegistrationNeeded && (
            <Alert className="text-center">
              <AlertDescription>Henüz hesabınız yok mu?</AlertDescription>
              <Button
                onClick={() => { setShowRegisterHint(false); onRegistrationNeeded(); }}
                className="w-full mt-2"
              >
                Katıl &amp; Kayıt Ol
              </Button>
            </Alert>
          )}
        </div>
      )}

      {phoneStep === 'otp' && (
        <div className="space-y-5">
          <Alert className="text-center">
            <AlertDescription>
              Kod <strong>SMS</strong> ile gönderildi
              <p className="text-xs text-muted-foreground mt-1">+90 {phone}</p>
            </AlertDescription>
          </Alert>
          <div>
            <Label className="mb-1.5">Doğrulama Kodu</Label>
            <Input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              data-clarity-mask="true"
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              className="text-center text-2xl tracking-[0.5em] font-mono h-12"
              placeholder="------"
              maxLength={6}
            />
            {error && <p className="text-destructive text-xs mt-1">{error}</p>}
          </div>
          <div className="flex items-center justify-between text-sm">
            <Button
              onClick={() => { setPhoneStep('input'); setOtpCode(''); setError(''); setCountdown(0); }}
              variant="ghost" className="text-muted-foreground"
            >
              Numarayı Değiştir
            </Button>
            {countdown > 0 ? (
              <span className="text-muted-foreground">Tekrar gönder ({countdown}s)</span>
            ) : (
              <Button
                onClick={() => { setOtpCode(''); setError(''); setPhoneStep('input'); }}
                disabled={loading}
                variant="link"
              >
                Tekrar Gönder
              </Button>
            )}
          </div>
          <Button
            onClick={handleVerifyOtp}
            disabled={loading || otpCode.length !== 6}
            className="w-full"
          >
            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
          </Button>
        </div>
      )}

      {phoneStep === 'set-credentials' && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-foreground">Şifre Belirle</h3>
          <p className="text-sm text-muted-foreground">
            Telefon doğrulandı! Bir sonraki girişte SMS yerine şifreyle giriş yapabilirsin.
          </p>

          <Alert>
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p className="text-sm font-medium text-foreground">+90 {phone}</p>
              </div>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Check className="size-3" />
                Doğrulandı
              </span>
            </div>
          </Alert>

          <div>
            <Label className="mb-1.5">Şifre</Label>
            <Input
              type="password" data-clarity-mask="true"
              value={credPassword}
              onChange={(e) => { setCredPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && credPassword.length >= 6 && handleSetCredentials()}
              className="w-full"
              placeholder="En az 6 karakter"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">Bir sonraki girişte SMS yerine bu şifreyle giriş yapabilirsiniz.</p>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <Button
            onClick={handleSetCredentials}
            disabled={loading || credPassword.length < 6}
            className="w-full"
          >
            Devam Et
          </Button>
        </div>
      )}
    </div>
  );
}
