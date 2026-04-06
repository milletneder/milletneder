/**
 * SMS Gönderim Loglayıcı
 *
 * Her SMS gönderimini provider, durum ve zaman damgasıyla kaydeder.
 * Admin dashboard'da provider bazlı istatistikleri göstermek ve
 * ileride analytics panellerinde kullanmak için.
 */

import { db } from '@/lib/db';
import { smsSendLog } from '@/lib/db/schema';

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
}

export type SmsLogStatus = 'sent' | 'failed';

interface LogSmsSendParams {
  provider: string;
  phone: string;
  status: SmsLogStatus;
  isFallback?: boolean;
  errorMessage?: string;
}

export async function logSmsSend({
  provider,
  phone,
  status,
  isFallback = false,
  errorMessage,
}: LogSmsSendParams): Promise<void> {
  try {
    await db.insert(smsSendLog).values({
      provider,
      phone_hint: maskPhone(phone),
      status,
      is_fallback: isFallback,
      error_message: errorMessage ?? null,
    });
  } catch (err) {
    // Log yazımı ana akışı engellememelidir
    console.error('SMS send log write error:', err);
  }
}
