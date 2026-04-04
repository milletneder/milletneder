'use client';

import { useEffect, useState } from 'react';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Status = 'loading' | 'success' | 'error' | 'invalid';

function ActionContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus('invalid');
      return;
    }

    if (mode === 'verifyEmail') {
      handleVerifyEmail(oobCode);
    } else if (mode === 'resetPassword') {
      setStatus('invalid');
      setErrorMessage('Şifre sıfırlama henüz desteklenmiyor.');
    } else {
      setStatus('invalid');
    }
  }, [mode, oobCode]);

  const handleVerifyEmail = async (code: string) => {
    try {
      await checkActionCode(auth, code);
      await applyActionCode(auth, code);
      setStatus('success');
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code === 'auth/invalid-action-code') {
        setErrorMessage('Doğrulama linki geçersiz veya süresi dolmuş. Lütfen yeni bir doğrulama maili isteyin.');
      } else if (fbErr.code === 'auth/expired-action-code') {
        setErrorMessage('Doğrulama linkinin süresi dolmuş. Lütfen yeni bir doğrulama maili isteyin.');
      } else {
        setErrorMessage('Doğrulama sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white border border-neutral-200 p-8 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-600">E-posta doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white border border-neutral-200 p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-50 border border-green-200 flex items-center justify-center rounded-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-black mb-2">E-posta Doğrulandı</h1>
          <p className="text-neutral-600 text-sm mb-6">
            E-posta adresiniz başarıyla doğrulandı. Artık siteye dönüp giriş yapabilirsiniz.
          </p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white border border-neutral-200 p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-50 border border-red-200 flex items-center justify-center rounded-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-black mb-2">Geçersiz Link</h1>
          <p className="text-neutral-600 text-sm mb-6">
            {errorMessage || 'Bu doğrulama linki geçersiz. Lütfen siteye dönüp tekrar doğrulama maili isteyin.'}
          </p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  // error
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="bg-white border border-neutral-200 p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 border border-red-200 flex items-center justify-center rounded-full">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-black mb-2">Doğrulama Başarısız</h1>
        <p className="text-neutral-600 text-sm mb-6">{errorMessage}</p>
        <Link
          href="/"
          className="inline-block bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="bg-white border border-neutral-200 p-8 max-w-md w-full mx-4 text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-600">Yükleniyor...</p>
          </div>
        </div>
      }
    >
      <ActionContent />
    </Suspense>
  );
}
