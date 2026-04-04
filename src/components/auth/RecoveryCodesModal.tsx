'use client';
import { useState, useRef, useCallback } from 'react';

type Step = 'explain' | 'codes' | 'confirm';

interface RecoveryCodesModalProps {
  codes: string[];
  onConfirm: () => void;
  onClose: () => void;
  hasRecoveryEmail?: boolean;
  showRegenerateFlow?: boolean;
}

export default function RecoveryCodesModal({ codes: initialCodes, onConfirm, onClose, hasRecoveryEmail, showRegenerateFlow }: RecoveryCodesModalProps) {
  const [step, setStep] = useState<Step>('explain');
  const [codes, setCodes] = useState<string[]>(initialCodes);
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const [regenPassword, setRegenPassword] = useState('');
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleRegenerate = async () => {
    if (!regenPassword || regenPassword.length < 6) {
      setRegenError('Şifre en az 6 karakter olmalı');
      return;
    }
    setRegenLoading(true);
    setRegenError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/regenerate-recovery-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: regenPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegenError(data.error || 'İşlem başarısız');
      } else {
        setCodes(data.codes);
        setStep('codes');
      }
    } catch {
      setRegenError('Bir hata oluştu');
    }
    setRegenLoading(false);
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const text = codes.join('\n');
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [codes]);

  const handleDownload = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 520;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 520);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('milletneder.com', 30, 40);
    ctx.fillStyle = '#666666';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Kurtarma Kodları', 30, 62);
    ctx.fillText(new Date().toLocaleDateString('tr-TR'), 30, 80);
    ctx.strokeStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.moveTo(30, 95);
    ctx.lineTo(570, 95);
    ctx.stroke();

    for (let i = 0; i < codes.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 30 + col * 280;
      const y = 130 + row * 50;
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(x, y - 22, 250, 36);
      ctx.strokeStyle = '#e0e0e0';
      ctx.strokeRect(x, y - 22, 250, 36);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`${i + 1}. ${codes[i]}`, x + 12, y);
    }

    ctx.fillStyle = '#b45309';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Bu kodları güvenli bir yerde saklayın.', 30, 470);
    ctx.fillText('Şifrenizi unutursanız bu kodlarla hesabınızı kurtarabilirsiniz.', 30, 488);

    const link = document.createElement('a');
    link.download = 'milletneder-kurtarma-kodlari.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [codes]);

  const handleEmail = useCallback(async () => {
    const email = emailInput.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Geçerli bir e-posta adresi girin');
      return;
    }
    setEmailError('');
    setEmailSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/send-recovery-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ codes, email }),
      });
      if (res.ok) {
        setEmailSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setEmailError(data.error || 'Gönderilemedi');
      }
    } catch {
      setEmailError('Bağlantı hatası');
    }
    setEmailSending(false);
  }, [codes, emailInput]);

  const needsRegenerate = showRegenerateFlow && codes.length === 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-black">
            {step === 'explain' ? 'Oy Şifreleme' : step === 'codes' ? 'Kurtarma Kodlarınız' : 'Onay'}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-black text-xl leading-none">&times;</button>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-1">
            {['explain', 'codes', 'confirm'].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-1 ${
                  (s === 'explain' && step !== 'explain') || (s === 'codes' && step === 'confirm')
                    ? 'bg-black'
                    : s === step
                    ? 'bg-black'
                    : 'bg-neutral-200'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className={`text-xs ${step === 'explain' ? 'text-black font-medium' : 'text-neutral-400'}`}>Bilgi</span>
            <span className={`text-xs ${step === 'codes' ? 'text-black font-medium' : 'text-neutral-400'}`}>Kodlar</span>
            <span className={`text-xs ${step === 'confirm' ? 'text-black font-medium' : 'text-neutral-400'}`}>Onay</span>
          </div>
        </div>

        {/* Step 1: Explanation */}
        {step === 'explain' && (
          <>
            <div className="px-6 py-4">
              {/* Giriş özeti */}
              <p className="text-sm text-neutral-600 leading-relaxed mb-5">
                Oy tercihinizi uçtan uca şifreleyerek kimliğinizden ayırıyoruz.
                Şifreleme sonrası veritabanında yalnızca okunamaz veri kalır.
                Bu işlem geri alınamaz; şifrenizi unutursanız aşağıdaki kurtarma kodları tek erişim yolunuzdur.
              </p>

              <div className="space-y-5">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="text-sm font-bold text-black mb-1">Neden şifreleme?</h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      Oy tercihiniz şifrelendiğinde biz dahil kimse hangi partiye oy verdiğinizi göremez.
                      Veritabanında sadece şifreli veri kalır.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="text-sm font-bold text-black mb-1">Kurtarma kodları ne işe yarar?</h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      Şifrenizi unutursanız kurtarma kodlarıyla hesabınıza erişebilirsiniz.
                      Kodlar olmadan oy geçmişinize ulaşamazsınız.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="text-sm font-bold text-black mb-1">Şifrelemezsem ne olur?</h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      Şifreleme isteğe bağlıdır. Şifrelemezseniz oy tercihiniz veritabanında açık metin olarak kalır.
                      Bu durumda veritabanına erişimi olan bir kişi teknik olarak oy tercihinizi kimliğinizle eşleştirebilir.
                      Şifreleme bu ihtimali tamamen ortadan kaldırır.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200">
              {needsRegenerate ? (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-500">Kodlarınızı görmek için mevcut şifrenizi girin:</p>
                  <input
                    type="password"
                    value={regenPassword}
                    onChange={(e) => { setRegenPassword(e.target.value); setRegenError(''); }}
                    placeholder="Mevcut şifreniz"
                    className="w-full bg-white border border-neutral-300 px-4 py-3 text-sm text-black focus:border-black focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && regenPassword.length >= 6 && handleRegenerate()}
                  />
                  {regenError && <p className="text-red-600 text-sm mt-1">{regenError}</p>}
                  <button
                    onClick={handleRegenerate}
                    disabled={regenLoading || regenPassword.length < 6}
                    className="w-full bg-black text-white py-3 text-sm font-bold hover:bg-neutral-800 transition-colors disabled:opacity-30"
                  >
                    {regenLoading ? 'Kodlar oluşturuluyor...' : 'Kodlarımı Oluştur'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setStep('codes')}
                  className="w-full bg-black text-white py-3 text-sm font-bold hover:bg-neutral-800 transition-colors"
                >
                  Kodlarımı Göster
                </button>
              )}
            </div>
          </>
        )}

        {/* Step 2: Codes */}
        {step === 'codes' && (
          <>
            <div className="px-6 py-4">
              <p className="text-sm text-neutral-500 mb-4">Bu 8 kodu güvenli bir yere kaydedin. Bir daha gösterilmeyecekler.</p>
              <div className="grid grid-cols-2 gap-2">
                {codes.map((code, i) => (
                  <div
                    key={i}
                    className="bg-neutral-50 border border-neutral-200 px-3 py-2.5 font-mono text-sm text-black text-center tracking-wider"
                  >
                    <span className="text-neutral-400 mr-1">{i + 1}.</span>
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-3 flex flex-wrap gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 min-w-[120px] bg-neutral-100 text-black px-3 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors border border-neutral-200"
              >
                PNG Olarak İndir
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 min-w-[120px] bg-neutral-100 text-black px-3 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors border border-neutral-200"
              >
                {copied ? 'Kopyalandı!' : 'Kodları Kopyala'}
              </button>
            </div>

            <div className="px-6 pb-4">
              {emailSent ? (
                <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  Kurtarma kodları e-postanıza gönderildi.
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                    placeholder="E-posta adresiniz (isteğe bağlı)"
                    className="flex-1 bg-white border border-neutral-300 px-4 py-2.5 text-sm text-black focus:border-black focus:outline-none transition-colors placeholder-neutral-400"
                  />
                  <button
                    onClick={handleEmail}
                    disabled={emailSending || !emailInput.trim()}
                    className="bg-neutral-100 text-black px-4 py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors border border-neutral-200 disabled:opacity-50 whitespace-nowrap"
                  >
                    {emailSending ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </div>
              )}
              {emailError && <p className="text-red-600 text-sm mt-1">{emailError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 flex gap-2">
              <button
                onClick={() => setStep('explain')}
                className="flex-1 border border-neutral-200 text-neutral-600 py-3 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Geri
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-[2] bg-black text-white py-3 text-sm font-bold hover:bg-neutral-800 transition-colors"
              >
                Kaydettim, Devam Et
              </button>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <>
            <div className="px-6 py-6">
              <div className="bg-neutral-50 border border-neutral-200 p-5 mb-5">
                <h4 className="text-sm font-bold text-black mb-2">Son adım</h4>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Onayladığınızda oy tercihiniz kalıcı olarak şifrelenir. Bundan sonra oyunuzu sadece siz görebilirsiniz.
                  Şifrenizi unutursanız yalnızca kurtarma kodlarıyla erişebilirsiniz.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 accent-black w-4 h-4"
                />
                <span className="text-sm text-neutral-700 leading-relaxed">
                  Kurtarma kodlarımı güvenli bir yere kaydettim. Kodlarımı onayladığımda oy tercihimin şifrelenmesini ve kimliğimle eşleştirilemez hale gelmesini kabul ediyorum.
                </span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 flex gap-2">
              <button
                onClick={() => setStep('codes')}
                className="flex-1 border border-neutral-200 text-neutral-600 py-3 text-sm font-medium hover:bg-neutral-50 transition-colors"
              >
                Geri
              </button>
              <button
                onClick={onConfirm}
                disabled={!checked}
                className="flex-[2] bg-black text-white py-3 text-sm font-bold hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Oyumu Şifrele
              </button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
