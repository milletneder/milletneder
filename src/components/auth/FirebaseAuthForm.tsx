'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

type AuthMethod = 'email' | 'phone';
type EmailStep = 'email' | 'login' | 'verify-code' | 'set-password';
type PhoneStep = 'input' | 'otp' | 'set-credentials';
type Phase = 'input' | 'otp' | 'loading' | 'forgot-password' | 'forgot-code' | 'forgot-new-password';

interface FirebaseAuthFormProps {
  method: AuthMethod;
  onAuthenticated: (firebaseIdToken: string, extraData?: { password?: string }) => void;
  /** Direkt JWT ile login (phone+password) */
  onDirectLogin?: (token: string) => void;
  onBack?: () => void;
  loginOnly?: boolean;
  /** DB'de kayıt bulunamadığında çağrılır — VoteModal açmak için */
  onRegistrationNeeded?: () => void;
}

export default function FirebaseAuthForm({ method, onAuthenticated, onDirectLogin, onBack, loginOnly = false, onRegistrationNeeded }: FirebaseAuthFormProps) {
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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input');

  // Phone credentials (set after OTP for new users)
  const [credPassword, setCredPassword] = useState('');

  // reCAPTCHA fallback — invisible başarısız olursa visible'a geç
  const [showRecaptchaFallback, setShowRecaptchaFallback] = useState(false);

  // Forgot password state
  const [forgotPhase, setForgotPhase] = useState<Phase>('input');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  // Phone forgot: OTP ile doğrula sonra şifre belirle
  const [forgotPhoneOtp, setForgotPhoneOtp] = useState('');
  const [forgotPhoneConfirmation, setForgotPhoneConfirmation] = useState<ConfirmationResult | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

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

  // reCAPTCHA'yı önceden yükle — Google'a daha fazla davranış sinyali toplamak için zaman ver
  // Bu, mobilde reCAPTCHA skorunu artırır ve -39 hatasını azaltır
  useEffect(() => {
    if (method !== 'phone') return;
    const timer = setTimeout(() => {
      if (!recaptchaContainerRef.current || recaptchaVerifierRef.current) return;
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            // Süresi dolunca sıfırla — tekrar oluşturulacak
            if (recaptchaVerifierRef.current) {
              recaptchaVerifierRef.current.clear();
              recaptchaVerifierRef.current = null;
            }
          },
        });
      } catch {
        // İlk yüklemede hata olabilir, sorun değil — buton basıldığında tekrar denenecek
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, [method]);

  // Visible reCAPTCHA fallback — invisible başarısız olunca tetiklenir
  // Kullanıcı checkbox'ı işaretleyince SMS otomatik gönderilir
  useEffect(() => {
    if (!showRecaptchaFallback || method !== 'phone') return;

    const timer = setTimeout(() => {
      const container = document.getElementById('recaptcha-visible');
      if (!container) return;

      // Eski verifier'ı temizle
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
        recaptchaVerifierRef.current = null;
      }

      try {
        const raw = phone.replace(/\s/g, '');
        const verifier = new RecaptchaVerifier(auth, container, {
          size: 'normal',
          callback: async () => {
            // Checkbox çözüldü → SMS'i otomatik gönder
            setError('');
            setLoading(true);
            try {
              const result = await signInWithPhoneNumber(auth, `+90${raw}`, verifier);
              setConfirmationResult(result);
              setPhoneStep('otp');
              setCountdown(90);
              setShowRecaptchaFallback(false);
            } catch (retryErr) {
              console.error('Visible reCAPTCHA SMS error:', retryErr);
              const fbErr = retryErr as { code?: string };
              if (fbErr.code === 'auth/too-many-requests') {
                setError('Çok fazla deneme yapıldı. Birkaç dakika bekleyip sayfayı yenileyin.');
              } else if (fbErr.code === 'auth/quota-exceeded') {
                setError('SMS gönderim limiti doldu. Daha sonra tekrar deneyin.');
              } else {
                setError('SMS gönderilemedi. Sayfayı yenileyip tekrar deneyin.');
              }
            } finally {
              setLoading(false);
            }
          },
          'expired-callback': () => {
            setError('Doğrulama süresi doldu. Sayfayı yenileyip tekrar deneyin.');
          },
        });
        recaptchaVerifierRef.current = verifier;
        verifier.render();
      } catch (e) {
        console.error('Visible reCAPTCHA setup error:', e);
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecaptchaFallback]);

  const setupRecaptcha = useCallback(() => {
    // Zaten önceden yüklenmişse dokunma
    if (recaptchaVerifierRef.current) return;
    if (!recaptchaContainerRef.current) return;
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => setError('reCAPTCHA süresi doldu, tekrar deneyin.'),
    });
  }, []);

  // ========== EMAIL AUTH ==========
  const handleEmailContinue = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Geçerli bir e-posta adresi girin');
      return;
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
            setError('Bu e-posta ile kayıtlı hesap bulunamadı. Kayıt olmak için Oy Ver butonunu kullanın.');
          }
        } else {
          try {
            const codeRes = await fetch('/api/auth/send-verification-code', {
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
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: unknown) {
        const fbErr = signInErr as { code?: string };
        if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
          setError('Şifre hatalı. Doğru şifrenizi girin.');
        } else if (fbErr.code === 'auth/too-many-requests') {
          setError('Çok fazla deneme. Lütfen bir süre bekleyin.');
        } else if (fbErr.code === 'auth/user-not-found') {
          setError('Bu e-posta ile hesap bulunamadı.');
        } else {
          setError('Giriş başarısız. Lütfen tekrar deneyin.');
        }
        setLoading(false);
        return;
      }
      const idToken = await userCredential.user.getIdToken();
      onAuthenticated(idToken, { password });
    } catch {
      setError('Giriş başarısız. Lütfen tekrar deneyin.');
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
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: verifyCode }),
      });
      const data = await res.json();
      if (data.verified) {
        setEmailStep('set-password');
      } else {
        setError(data.error || 'Doğrulama başarısız');
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
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Kod gönderilemedi');
      else setVerifyCode('');
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
    setLoading(true);
    setError('');
    try {
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (regErr: unknown) {
        const fbErr = regErr as { code?: string };
        if (fbErr.code === 'auth/email-already-in-use') {
          setError('Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.');
          setEmailStep('login');
        } else if (fbErr.code === 'auth/weak-password') {
          setError('Şifre çok zayıf. En az 6 karakter kullanın.');
        } else {
          setError('Kayıt başarısız. Lütfen tekrar deneyin.');
        }
        setLoading(false);
        return;
      }
      const idToken = await userCredential.user.getIdToken();
      try {
        const markRes = await fetch('/api/auth/mark-email-verified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseIdToken: idToken }),
        });
        if (!markRes.ok) console.error('Mark email verified failed:', await markRes.text());
      } catch (err) {
        console.error('Mark email verified error:', err);
      }
      onAuthenticated(idToken, { password });
    } catch {
      setError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
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
        // DB'de kullanıcı bulunamadı veya kayıt tamamlanmamış — VoteModal'a yönlendir
        if ((res.status === 401 || (res.status === 403 && data.needsRegistration)) && onRegistrationNeeded) {
          onRegistrationNeeded();
          setLoading(false);
          return;
        }
        // Tamamlanmamış kayıt (needsRegistration flag'i ile)
        if (data.needsRegistration && onRegistrationNeeded) {
          onRegistrationNeeded();
          setLoading(false);
          return;
        }
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
    setLoading(true);
    setError('');
    try {
      setupRecaptcha();
      if (!recaptchaVerifierRef.current) {
        setError('reCAPTCHA başlatılamadı. Sayfayı yenileyip tekrar deneyin.');
        return;
      }
      const result = await signInWithPhoneNumber(auth, `+90${raw}`, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setPhoneStep('otp');
      setCountdown(90);
    } catch (err: unknown) {
      console.error('Phone auth error:', err);
      const fbErr = err as { code?: string; message?: string };

      // reCAPTCHA hatası → visible fallback'e geç (mobilde sık yaşanır)
      const isRecaptchaError =
        fbErr.code === 'auth/captcha-check-failed' ||
        fbErr.code?.includes('-39') || fbErr.message?.includes('-39');

      if (isRecaptchaError && !showRecaptchaFallback) {
        // Invisible reCAPTCHA başarısız → visible checkbox'a geç
        if (recaptchaVerifierRef.current) {
          try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
          recaptchaVerifierRef.current = null;
        }
        setShowRecaptchaFallback(true);
        setError('');
        setLoading(false);
        return;
      }

      if (fbErr.code === 'auth/too-many-requests') {
        setError('Çok fazla deneme yapıldı. 5-10 dakika bekleyip tekrar deneyin.');
      } else if (fbErr.code === 'auth/invalid-phone-number') {
        setError('Geçersiz telefon numarası. 5XX ile başlayan 10 haneli numara girin.');
      } else if (fbErr.code === 'auth/quota-exceeded') {
        setError('SMS gönderim limiti doldu. Lütfen daha sonra tekrar deneyin.');
      } else if (fbErr.code === 'auth/unauthorized-domain') {
        setError('Bu domain yetkili değil. Firebase ayarlarını kontrol edin.');
      } else {
        setError('SMS gönderilemedi. Sayfayı yenileyip tekrar deneyin.');
      }
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('6 haneli doğrulama kodunu girin');
      return;
    }
    if (!confirmationResult) {
      setError('Doğrulama oturumu bulunamadı. Tekrar kod gönderin.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await confirmationResult.confirm(otpCode);
      const idToken = await userCredential.user.getIdToken();

      if (loginOnly && !needsPasswordSetup) {
        // Normal login flow (shouldn't reach here in phone+password mode)
        onAuthenticated(idToken);
      } else {
        // Registration flow — always show set-credentials
        setPhoneStep('set-credentials');
        // Store the token temporarily
        setConfirmationResult(null);
        // We'll need this token when setting credentials
        (window as unknown as Record<string, string>).__tempFirebaseToken = idToken;
      }
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code === 'auth/invalid-verification-code') {
        setError('Girdiğiniz kod hatalı');
      } else if (fbErr.code === 'auth/code-expired') {
        setError('Kodun süresi dolmuş. Yeni kod gönderin.');
      } else {
        setError('Doğrulama başarısız. Tekrar deneyin.');
      }
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
    const idToken = (window as unknown as Record<string, string>).__tempFirebaseToken;
    if (!idToken) return;
    delete (window as unknown as Record<string, string>).__tempFirebaseToken;

    if (loginOnly) {
      // Migration flow: mevcut kullanıcı şifre belirliyor
      setLoading(true);
      try {
        const res = await fetch('/api/auth/firebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseIdToken: idToken,
            password: credPassword,
          }),
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
      onAuthenticated(idToken, { password: credPassword });
    }
  };

  // ========== FORGOT PASSWORD ==========
  const handleForgotSendCode = async () => {
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }
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
    setLoading(true);
    setError('');
    try {
      setupRecaptcha();
      if (!recaptchaVerifierRef.current) {
        setError('reCAPTCHA başlatılamadı. Sayfayı yenileyip tekrar deneyin.');
        setLoading(false);
        return;
      }
      const result = await signInWithPhoneNumber(auth, `+90${raw}`, recaptchaVerifierRef.current);
      setForgotPhoneConfirmation(result);
      setForgotPhase('forgot-code'); // reuse forgot-code phase for OTP entry
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };

      const isRecaptchaError =
        fbErr.code === 'auth/captcha-check-failed' ||
        fbErr.code?.includes('-39') || fbErr.message?.includes('-39');

      if (isRecaptchaError && !showRecaptchaFallback) {
        if (recaptchaVerifierRef.current) {
          try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
          recaptchaVerifierRef.current = null;
        }
        setShowRecaptchaFallback(true);
        setError('');
        setLoading(false);
        return;
      }

      if (fbErr.code === 'auth/too-many-requests') {
        setError('Çok fazla deneme yapıldı. 5-10 dakika bekleyip tekrar deneyin.');
      } else {
        setError('SMS gönderilemedi. Sayfayı yenileyip tekrar deneyin.');
      }
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
        recaptchaVerifierRef.current = null;
      }
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
    if (!forgotPhoneConfirmation) {
      setError('Doğrulama oturumu bulunamadı. Tekrar deneyin.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // OTP doğrula
      const userCredential = await forgotPhoneConfirmation.confirm(forgotPhoneOtp);
      const idToken = await userCredential.user.getIdToken();

      // Backend'e yeni şifre gönder
      const res = await fetch('/api/auth/reset-password-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseIdToken: idToken, newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Şifre sıfırlama başarısız');
        setLoading(false);
        return;
      }
      setForgotPhase('forgot-new-password'); // success
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code === 'auth/invalid-verification-code') {
        setError('Kod hatalı');
      } else if (fbErr.code === 'auth/code-expired') {
        setError('Kodun süresi dolmuş. Tekrar deneyin.');
      } else {
        setError('Şifre sıfırlama başarısız');
      }
    } finally {
      setLoading(false);
    }
  };

  // ========== RENDER ==========

  // --- FORGOT PASSWORD FLOW ---
  if (forgotPhase === 'forgot-password') {
    // Telefon modunda: SMS ile şifre sıfırlama
    if (method === 'phone') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <div ref={recaptchaContainerRef} id="recaptcha-container-forgot" />
          <h3 className="text-xl font-bold text-black">Şifremi Unuttum</h3>
          <p className="text-sm text-neutral-500">Telefon numaranıza doğrulama kodu göndereceğiz, ardından yeni şifre belirleyebilirsiniz.</p>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Cep Telefonu</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-neutral-100 border border-r-0 border-neutral-300 text-neutral-500 text-sm">+90</span>
              <input
                type="tel" data-clarity-mask="true"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && getRawPhone().length === 10 && handleForgotPhoneSendOtp()}
                className="flex-1 bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
                placeholder="5XX XXX XX XX"
                autoFocus
              />
            </div>
          </div>
          {/* Visible reCAPTCHA fallback */}
          {showRecaptchaFallback && (
            <div className="bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p className="text-xs text-amber-800 font-medium">Ek güvenlik doğrulaması gerekli</p>
              <p className="text-[11px] text-amber-700">Kutucuğu işaretleyin, SMS otomatik gönderilecek.</p>
              <div id="recaptcha-visible" className="flex justify-center overflow-hidden" />
              {loading && <p className="text-xs text-neutral-500 text-center">SMS gönderiliyor...</p>}
            </div>
          )}
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setForgotPhase('input'); setError(''); setShowRecaptchaFallback(false); }}
              className="flex-1 bg-neutral-100 text-black py-3 font-medium hover:bg-neutral-200 transition-colors"
            >
              Geri
            </button>
            {!showRecaptchaFallback && (
              <button
                onClick={handleForgotPhoneSendOtp}
                disabled={loading || getRawPhone().length !== 10}
                className="flex-1 bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Gönderiliyor...' : 'SMS Kodu Gönder'}
              </button>
            )}
          </div>
        </div>
      );
    }

    // Email modunda: e-posta ile şifre sıfırlama
    return (
      <div className="w-full max-w-md mx-auto space-y-5">
        <h3 className="text-xl font-bold text-black">Şifremi Unuttum</h3>
        <p className="text-sm text-neutral-500">Kayıt sırasında girdiğin e-posta adresini yaz, şifre sıfırlama kodu gönderelim.</p>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">E-posta</label>
          <input
            type="email"
            data-clarity-mask="true"
            value={forgotEmail}
            onChange={(e) => { setForgotEmail(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleForgotSendCode()}
            className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
            placeholder="ornek@email.com"
            autoFocus
          />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => { setForgotPhase('input'); setError(''); }}
            className="flex-1 bg-neutral-100 text-black py-3 font-medium hover:bg-neutral-200 transition-colors"
          >
            Geri
          </button>
          <button
            onClick={handleForgotSendCode}
            disabled={loading || !forgotEmail.trim()}
            className="flex-1 bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
          </button>
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
            <h3 className="text-lg font-bold text-black mb-2">Doğrulama Kodu</h3>
            <p className="text-sm text-neutral-600">
              <strong>+90 {phone}</strong> numarasına SMS ile kod gönderdik.
            </p>
          </div>
          <div>
            <input
              type="text"
              inputMode="numeric"
              data-clarity-mask="true"
              value={forgotPhoneOtp}
              onChange={(e) => { setForgotPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black text-center text-2xl tracking-[0.5em] font-mono focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="------"
              maxLength={6}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Yeni Şifre</label>
            <input
              type="password" data-clarity-mask="true"
              value={forgotNewPassword}
              onChange={(e) => { setForgotNewPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && forgotPhoneOtp.length === 6 && forgotNewPassword.length >= 6 && handleForgotPhoneVerifyAndReset()}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="En az 6 karakter"
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            onClick={handleForgotPhoneVerifyAndReset}
            disabled={loading || forgotPhoneOtp.length !== 6 || forgotNewPassword.length < 6}
            className="w-full bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
          </button>
          <button
            onClick={() => { setForgotPhase('forgot-password'); setForgotPhoneOtp(''); setForgotNewPassword(''); setError(''); }}
            className="w-full text-sm text-neutral-500 hover:text-black transition-colors"
          >
            Numarayı Değiştir
          </button>
        </div>
      );
    }

    // Email modunda: e-posta kodu doğrulama + yeni şifre
    return (
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="text-center">
          <h3 className="text-lg font-bold text-black mb-2">Şifre Sıfırlama Kodu</h3>
          <p className="text-sm text-neutral-600">
            <strong>{forgotEmail}</strong> adresine 6 haneli kod gönderdik.
          </p>
        </div>
        <div>
          <input
            type="text"
            inputMode="numeric"
            data-clarity-mask="true"
            value={forgotCode}
            onChange={(e) => { setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            className="w-full bg-white border border-neutral-300 px-4 py-3 text-black text-center text-2xl tracking-[0.5em] font-mono focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
            placeholder="------"
            maxLength={6}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-600 mb-1">Yeni Şifre</label>
          <input
            type="password" data-clarity-mask="true"
            value={forgotNewPassword}
            onChange={(e) => { setForgotNewPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && forgotCode.length === 6 && forgotNewPassword.length >= 6 && handleForgotVerifyAndReset()}
            className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
            placeholder="En az 6 karakter"
          />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          onClick={handleForgotVerifyAndReset}
          disabled={loading || forgotCode.length !== 6 || forgotNewPassword.length < 6}
          className="w-full bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
        </button>
        <button
          onClick={() => { setForgotPhase('forgot-password'); setForgotCode(''); setForgotNewPassword(''); setError(''); }}
          className="w-full text-sm text-neutral-500 hover:text-black transition-colors"
        >
          E-postayı Değiştir
        </button>
      </div>
    );
  }

  if (forgotPhase === 'forgot-new-password') {
    return (
      <div className="w-full max-w-md mx-auto space-y-5 text-center">
        <div className="w-16 h-16 mx-auto bg-green-50 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-black">Şifren Güncellendi!</h3>
        <p className="text-sm text-neutral-500">Yeni şifrenle giriş yapabilirsin.</p>
        <button
          onClick={() => { setForgotPhase('input'); setForgotEmail(''); setForgotCode(''); setForgotNewPassword(''); setError(''); }}
          className="w-full bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  // --- EMAIL AUTH ---
  if (method === 'email') {
    if (emailStep === 'email') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <div className="bg-neutral-50 border border-neutral-200 p-4">
            <div className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0">
                <path d="M8 1C5.79 1 4 2.79 4 5V6H3C2.45 6 2 6.45 2 7V14C2 14.55 2.45 15 3 15H13C13.55 15 14 14.55 14 14V7C14 6.45 13.55 6 13 6H12V5C12 2.79 10.21 1 8 1ZM8 2.5C9.38 2.5 10.5 3.62 10.5 5V6H5.5V5C5.5 3.62 6.62 2.5 8 2.5Z" fill="#404040"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-black mb-1">Bilgilerin güvende</p>
                <ul className="text-xs text-neutral-600 space-y-1">
                  <li>E-postan sadece giriş için kullanılır.</li>
                  <li>Oyun veya kişisel bilgilerin ile asla eşleştirilmez.</li>
                  <li>E-postan kendi sunucumuzda saklanmaz.</li>
                </ul>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">E-posta</label>
            <input
              type="email"
              data-clarity-mask="true"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleEmailContinue()}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="ornek@email.com"
              autoFocus
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            {onBack && (
              <button onClick={onBack} className="flex-1 bg-neutral-100 text-black py-3 font-medium hover:bg-neutral-200 transition-colors">Geri</button>
            )}
            <button
              onClick={handleEmailContinue}
              disabled={loading || !email.trim()}
              className="flex-1 bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Kontrol ediliyor...' : 'Devam Et'}
            </button>
          </div>
          {!loginOnly && (
            <p className="text-[11px] text-neutral-400 text-center">Hesabın yoksa otomatik oluşturulur.</p>
          )}
        </div>
      );
    }

    if (emailStep === 'login') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <h3 className="text-xl font-bold text-black">Giriş Yap</h3>
          <div className="bg-neutral-50 border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500">E-posta</p>
                <p className="text-sm font-medium text-black">{email}</p>
              </div>
              <button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); }} className="text-xs text-neutral-500 hover:text-black transition-colors">Değiştir</button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Şifre</label>
            <input
              ref={passwordInputRef}
              type="password" data-clarity-mask="true"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="Şifrenizi girin"
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); }} className="flex-1 bg-neutral-100 text-black py-3 font-medium hover:bg-neutral-200 transition-colors">Geri</button>
            <button
              onClick={handleEmailLogin}
              disabled={loading || password.length < 6}
              className="flex-1 bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>
        </div>
      );
    }

    if (emailStep === 'verify-code') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-black mb-2">Doğrulama Kodu</h3>
            <p className="text-sm text-neutral-600"><strong>{email}</strong> adresine 6 haneli kod gönderdik.</p>
          </div>
          <div>
            <input
              type="text"
              inputMode="numeric"
              data-clarity-mask="true"
              value={verifyCode}
              onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode.length === 6 && handleVerifyCode()}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black text-center text-2xl tracking-[0.5em] font-mono focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="------"
              maxLength={6}
              autoFocus
            />
          </div>
          {error && <p className="text-red-600 text-xs text-center">{error}</p>}
          <button
            onClick={handleVerifyCode}
            disabled={loading || verifyCode.length !== 6}
            className="w-full bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); setVerifyCode(''); }} className="text-neutral-500 hover:text-black transition-colors">E-postayı Değiştir</button>
            <button onClick={handleResendCode} disabled={loading} className="text-black font-medium hover:underline disabled:opacity-50">Tekrar Gönder</button>
          </div>
        </div>
      );
    }

    if (emailStep === 'set-password') {
      return (
        <div className="w-full max-w-md mx-auto space-y-5">
          <h3 className="text-xl font-bold text-black">Şifre Belirle</h3>
          <p className="text-sm text-neutral-500">E-postan doğrulandı. Şimdi hesabın için bir şifre belirle.</p>
          <div className="bg-neutral-50 border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500">E-posta</p>
                <p className="text-sm font-medium text-black">{email}</p>
              </div>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                Doğrulandı
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Şifre belirle</label>
            <input
              ref={passwordInputRef}
              type="password" data-clarity-mask="true"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && password.length >= 6 && handleSetPassword()}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="En az 6 karakter"
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setEmailStep('email'); setPassword(''); setError(''); setVerifyCode(''); }} className="flex-1 bg-neutral-100 text-black py-3 font-medium hover:bg-neutral-200 transition-colors">Geri</button>
            <button
              onClick={handleSetPassword}
              disabled={loading || password.length < 6}
              className="flex-1 bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </div>
        </div>
      );
    }
  }

  // --- PHONE AUTH ---
  return (
    <div className="w-full max-w-md mx-auto">
      <div ref={recaptchaContainerRef} id="recaptcha-container" />

      {phoneStep === 'input' && (
        <div className="space-y-4">
          {!loginOnly && (
          <div className="bg-neutral-50 border border-neutral-200 p-3 space-y-2">
            <p className="text-xs font-bold text-black">Numaran bizde saklanmaz</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-px flex-shrink-0">
                  <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#525252" strokeWidth="1.2" fill="none"/>
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="#525252" strokeWidth="1.2" fill="none"/>
                </svg>
                <p className="text-[11px] text-neutral-600 leading-snug">Numaran sadece doğrulama kodu göndermek için kullanılır</p>
              </div>
              <div className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-px flex-shrink-0">
                  <circle cx="8" cy="8" r="3" stroke="#525252" strokeWidth="1.2" fill="none"/>
                  <line x1="2" y1="14" x2="14" y2="2" stroke="#525252" strokeWidth="1.2"/>
                </svg>
                <p className="text-[11px] text-neutral-600 leading-snug">Numaranı kaydetmiyoruz — sistemimizde telefon numarası tutulmaz</p>
              </div>
              <div className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-px flex-shrink-0">
                  <path d="M8 1.5L2 4v4c0 3.5 2.5 6.2 6 7 3.5-.8 6-3.5 6-7V4L8 1.5z" stroke="#525252" strokeWidth="1.2" fill="none"/>
                  <polyline points="5.5 8 7 9.5 10.5 6" stroke="#525252" strokeWidth="1.2" fill="none"/>
                </svg>
                <p className="text-[11px] text-neutral-600 leading-snug">Oyun tamamen anonim, kimliğinle eşleştirilemez</p>
              </div>
            </div>
          </div>
          )}

          <div>
            <label className="block text-xs text-neutral-600 mb-1">Cep Telefonu</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-neutral-100 border border-r-0 border-neutral-300 text-neutral-500 text-sm">+90</span>
              <input
                type="tel" data-clarity-mask="true"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(''); setExistingUserDetected(false); }}
                onKeyDown={(e) => e.key === 'Enter' && (loginOnly || existingUserDetected) && getRawPhone().length === 10 && phonePassword.length >= 6 && handlePhonePasswordLogin()}
                className="flex-1 bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
                placeholder="5XX XXX XX XX"
                autoFocus
              />
            </div>
          </div>

          {(loginOnly || existingUserDetected) && (
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Şifre</label>
              <input
                type="password" data-clarity-mask="true"
                value={phonePassword}
                onChange={(e) => { setPhonePassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && getRawPhone().length === 10 && phonePassword.length >= 6 && handlePhonePasswordLogin()}
                className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
                placeholder="Şifrenizi girin"
              />
            </div>
          )}

          {existingUserDetected && (
            <div className="bg-green-50 border border-green-200 p-3">
              <p className="text-xs text-green-800">Bu numarayla kayıtlı hesap bulundu. Şifrenizi girerek devam edin.</p>
            </div>
          )}

          {/* Visible reCAPTCHA fallback — invisible başarısız olunca gösterilir */}
          {showRecaptchaFallback && phoneStep === 'input' && (
            <div className="bg-amber-50 border border-amber-200 p-3 space-y-2">
              <p className="text-xs text-amber-800 font-medium">Ek güvenlik doğrulaması gerekli</p>
              <p className="text-[11px] text-amber-700">
                Bazı cihazlarda otomatik doğrulama çalışmayabiliyor. Aşağıdaki kutucuğu işaretleyin, doğrulama kodunuz otomatik gönderilecek.
              </p>
              <div id="recaptcha-visible" className="flex justify-center overflow-hidden" />
              {loading && (
                <p className="text-xs text-neutral-500 text-center">SMS gönderiliyor...</p>
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-xs">{error}</p>}

          {needsPasswordSetup && (
            <div className="bg-amber-50 border border-amber-200 p-4 space-y-3">
              <p className="text-sm text-amber-800 font-medium">Şifre belirlemeniz gerekiyor</p>
              <p className="text-xs text-amber-700">
                Hesabınızda henüz şifre tanımlı değil. Telefonunuza doğrulama kodu göndereceğiz, ardından bir şifre belirleyebilirsiniz.
              </p>
              <button
                onClick={handleMigrationOtp}
                disabled={loading}
                className="w-full bg-black text-white py-2.5 text-sm font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
              </button>
            </div>
          )}

          {!needsPasswordSetup && !(showRecaptchaFallback && !loginOnly) && (
            <div className="flex gap-2">
              {onBack && (
                <button onClick={onBack} className="shrink-0 bg-neutral-100 text-black px-5 py-3 text-sm font-medium hover:bg-neutral-200 transition-colors">Geri</button>
              )}
              <button
                onClick={(loginOnly || existingUserDetected) ? handlePhonePasswordLogin : handlePhoneCheck}
                disabled={loading || getRawPhone().length !== 10 || ((loginOnly || existingUserDetected) && phonePassword.length < 6)}
                className="flex-1 bg-black text-white py-3 text-sm font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Gönderiliyor...' : (loginOnly || existingUserDetected) ? 'Giriş Yap' : 'Devam Et'}
              </button>
            </div>
          )}

          {(loginOnly || existingUserDetected) && (
            <button
              onClick={() => { setForgotPhase('forgot-password'); setError(''); }}
              className="w-full text-sm text-neutral-500 hover:text-black transition-colors"
            >
              Şifremi Unuttum
            </button>
          )}
        </div>
      )}

      {phoneStep === 'otp' && (
        <div className="space-y-5">
          <div className="bg-neutral-50 border border-neutral-200 p-3 text-center">
            <p className="text-sm text-neutral-700">Kod <strong>SMS</strong> ile gönderildi</p>
            <p className="text-xs text-neutral-500 mt-1">+90 {phone}</p>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Doğrulama Kodu</label>
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              data-clarity-mask="true"
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black text-center text-2xl tracking-[0.5em] font-mono focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="------"
              maxLength={6}
            />
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
          </div>
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => { setPhoneStep('input'); setOtpCode(''); setError(''); setCountdown(0); setConfirmationResult(null); }}
              className="text-neutral-500 hover:text-black transition-colors"
            >
              Numarayı Değiştir
            </button>
            {countdown > 0 ? (
              <span className="text-neutral-400">Tekrar gönder ({countdown}s)</span>
            ) : (
              <button
                onClick={() => { setOtpCode(''); setError(''); setPhoneStep('input'); }}
                disabled={loading}
                className="text-black font-medium hover:underline disabled:opacity-50"
              >
                Tekrar Gönder
              </button>
            )}
          </div>
          <button
            onClick={handleVerifyOtp}
            disabled={loading || otpCode.length !== 6}
            className="w-full bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
          </button>
        </div>
      )}

      {phoneStep === 'set-credentials' && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-black">Şifre Belirle</h3>
          <p className="text-sm text-neutral-500">
            Telefon doğrulandı! Bir sonraki girişte SMS yerine şifreyle giriş yapabilirsin.
          </p>

          <div className="bg-neutral-50 border border-neutral-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500">Telefon</p>
                <p className="text-sm font-medium text-black">+90 {phone}</p>
              </div>
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                Doğrulandı
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Şifre</label>
            <input
              type="password" data-clarity-mask="true"
              value={credPassword}
              onChange={(e) => { setCredPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && credPassword.length >= 6 && handleSetCredentials()}
              className="w-full bg-white border border-neutral-300 px-4 py-3 text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
              placeholder="En az 6 karakter"
              autoFocus
            />
            <p className="text-[11px] text-neutral-400 mt-1">Bir sonraki girişte SMS yerine bu şifreyle giriş yapabilirsiniz.</p>
          </div>

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <button
            onClick={handleSetCredentials}
            disabled={loading || credPassword.length < 6}
            className="w-full bg-black text-white py-3 font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Devam Et
          </button>
        </div>
      )}
    </div>
  );
}
