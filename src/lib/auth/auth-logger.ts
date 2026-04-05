import { db } from '@/lib/db';
import { authLogs } from '@/lib/db/schema';
import { NextRequest } from 'next/server';

export type AuthEventType =
  | 'login'           // Başarılı giriş
  | 'login_fail'      // Başarısız giriş
  | 'register'        // Başarılı kayıt
  | 'register_fail'   // Başarısız kayıt (hata)
  | 'register_incomplete' // Doğrulama yapıldı ama DB kaydı tamamlanmadı
  | 'register_blocked'    // Fingerprint/IP limiti ile engellendi
  | 'password_reset'      // Şifre sıfırlama
  | 'password_change'     // Şifre değiştirme
  | 'client_error';       // Client-side hata (reCAPTCHA, SMS, vs.)

interface LogAuthEventParams {
  eventType: AuthEventType;
  authMethod?: 'email' | 'phone';
  identityHint?: string;
  userId?: number;
  request: NextRequest;
  errorCode?: string;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

function maskIdentity(value: string | undefined, method?: string): string | undefined {
  if (!value) return undefined;
  if (method === 'phone') {
    // 5XX XXX XX XX → ***XX XX
    const digits = value.replace(/\D/g, '');
    return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
  }
  // email → ***@domain.com
  if (value.includes('@')) {
    const [, domain] = value.split('@');
    return `***@${domain}`;
  }
  return '***';
}

export async function logAuthEvent({
  eventType,
  authMethod,
  identityHint,
  userId,
  request,
  errorCode,
  errorMessage,
  details,
}: LogAuthEventParams): Promise<void> {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
               request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? null;

    await db.insert(authLogs).values({
      event_type: eventType,
      auth_method: authMethod ?? null,
      identity_hint: maskIdentity(identityHint, authMethod) ?? null,
      user_id: userId ?? null,
      ip_address: ip,
      user_agent: userAgent,
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (err) {
    // Log yazımı ana akışı engellememelidir
    console.error('Auth log write error:', err);
  }
}
