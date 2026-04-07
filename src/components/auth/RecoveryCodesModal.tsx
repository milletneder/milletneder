'use client';
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { X, Copy, Check, Download, Mail, Loader2 } from 'lucide-react';

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

    ctx.fillStyle = '#666666';
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

  const stepProgress = step === 'explain' ? 33 : step === 'codes' ? 66 : 100;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg border border-border rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">
            {step === 'explain' ? 'Oy Koruma' : step === 'codes' ? 'Kurtarma Kodlarınız' : 'Onay'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4 pb-2">
          <Progress value={stepProgress} className="h-1" />
          <div className="flex justify-between mt-1.5">
            <span className={`text-xs ${step === 'explain' ? 'font-medium' : 'text-muted-foreground'}`}>Bilgi</span>
            <span className={`text-xs ${step === 'codes' ? 'font-medium' : 'text-muted-foreground'}`}>Kodlar</span>
            <span className={`text-xs ${step === 'confirm' ? 'font-medium' : 'text-muted-foreground'}`}>Onay</span>
          </div>
        </div>

        {/* Step 1: Explanation */}
        {step === 'explain' && (
          <>
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Oy tercihinizi uçtan uca koruma altına alarak kimliğinizden ayırıyoruz.
                Koruma sonrası veritabanında yalnızca okunamaz veri kalır.
                Bu işlem geri alınamaz; şifrenizi unutursanız aşağıdaki kurtarma kodları tek erişim yolunuzdur.
              </p>

              <div className="space-y-5">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 rounded-lg">1</div>
                  <div>
                    <h4 className="text-sm font-bold mb-1">Neden koruma?</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Oy tercihiniz koruma altına alındığında biz dahil kimse hangi partiye oy verdiğinizi göremez.
                      Veritabanında sadece okunamaz veri kalır.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 rounded-lg">2</div>
                  <div>
                    <h4 className="text-sm font-bold mb-1">Kurtarma kodları ne işe yarar?</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Şifrenizi unutursanız kurtarma kodlarıyla hesabınıza erişebilirsiniz.
                      Kodlar olmadan oy geçmişinize ulaşamazsınız.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 rounded-lg">3</div>
                  <div>
                    <h4 className="text-sm font-bold mb-1">Korumazsam ne olur?</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Oy koruma isteğe bağlıdır. Korumazsanız oy tercihiniz veritabanında açık metin olarak kalır.
                      Bu durumda veritabanına erişimi olan bir kişi teknik olarak oy tercihinizi kimliğinizle eşleştirebilir.
                      Koruma bu ihtimali tamamen ortadan kaldırır.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border">
              {needsRegenerate ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Kodlarınızı görmek için mevcut şifrenizi girin:</p>
                  <Input
                    type="password"
                    value={regenPassword}
                    onChange={(e) => { setRegenPassword(e.target.value); setRegenError(''); }}
                    placeholder="Mevcut şifreniz"
                    onKeyDown={(e) => e.key === 'Enter' && regenPassword.length >= 6 && handleRegenerate()}
                  />
                  {regenError && <p className="text-destructive text-sm mt-1">{regenError}</p>}
                  <Button
                    className="w-full"
                    onClick={handleRegenerate}
                    disabled={regenLoading || regenPassword.length < 6}
                  >
                    {regenLoading ? (
                      <>
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                        Kodlar oluşturuluyor...
                      </>
                    ) : 'Kodlarımı Oluştur'}
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={() => setStep('codes')}>
                  Kodlarımı Göster
                </Button>
              )}
            </div>
          </>
        )}

        {/* Step 2: Codes */}
        {step === 'codes' && (
          <>
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground mb-4">Bu 8 kodu güvenli bir yere kaydedin. Bir daha gösterilmeyecekler.</p>
              <div className="grid grid-cols-2 gap-2">
                {codes.map((code, i) => (
                  <div
                    key={i}
                    className="bg-muted border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-center tracking-wider"
                  >
                    <span className="text-muted-foreground mr-1">{i + 1}.</span>
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-3 flex flex-wrap gap-2">
              <Button variant="outline" className="flex-1 min-w-[120px]" onClick={handleDownload}>
                <Download className="size-4 mr-1.5" />
                PNG Olarak İndir
              </Button>
              <Button variant="outline" className="flex-1 min-w-[120px]" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="size-4 mr-1.5" />
                    Kopyalandı!
                  </>
                ) : (
                  <>
                    <Copy className="size-4 mr-1.5" />
                    Kodları Kopyala
                  </>
                )}
              </Button>
            </div>

            <div className="px-6 pb-4">
              {emailSent ? (
                <Card>
                  <CardContent className="pt-4 pb-3 text-sm">
                    Kurtarma kodları e-postanıza gönderildi.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                    placeholder="E-posta adresiniz (isteğe bağlı)"
                  />
                  <Button
                    variant="outline"
                    onClick={handleEmail}
                    disabled={emailSending || !emailInput.trim()}
                  >
                    {emailSending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="size-4 mr-1.5" />
                        Gönder
                      </>
                    )}
                  </Button>
                </div>
              )}
              {emailError && <p className="text-destructive text-sm mt-1">{emailError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('explain')}>
                Geri
              </Button>
              <Button className="flex-[2]" onClick={() => setStep('confirm')}>
                Kaydettim, Devam Et
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <>
            <div className="px-6 py-6">
              <Card className="mb-5">
                <CardContent className="pt-5">
                  <h4 className="text-sm font-bold mb-2">Son adım</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Onayladığınızda oy tercihiniz kalıcı olarak koruma altına alınır. Bundan sonra oyunuzu sadece siz görebilirsiniz.
                    Şifrenizi unutursanız yalnızca kurtarma kodlarıyla erişebilirsiniz.
                  </p>
                </CardContent>
              </Card>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5 accent-primary w-4 h-4"
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  Kurtarma kodlarımı güvenli bir yere kaydettim. Kodlarımı onayladığımda oy tercihimin koruma altına alınmasını ve kimliğimle eşleştirilemez hale gelmesini kabul ediyorum.
                </span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('codes')}>
                Geri
              </Button>
              <Button
                className="flex-[2]"
                onClick={onConfirm}
                disabled={!checked}
              >
                Oyumu Korumaya Al
              </Button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
