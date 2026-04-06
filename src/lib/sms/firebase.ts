/**
 * Firebase Phone Auth Modülü
 *
 * Firebase Phone Auth istemci tarafında çalışır (reCAPTCHA gerektirir).
 * Bu modül sunucu tarafında Firebase ID token doğrulamasını yapar.
 *
 * Akış:
 *   1. İstemci: Firebase JS SDK ile signInWithPhoneNumber() → SMS gönderilir
 *   2. İstemci: Kod doğrulandıktan sonra Firebase ID token alınır
 *   3. Sunucu: Bu modül ID token'ı doğrular ve telefon numarasını çıkarır
 *   4. Sunucu: Kendi JWT'mizi veririz
 *
 * Fallback: Firebase başarısız olursa istemci otomatik olarak Twilio'ya düşer.
 */

import { getSetting } from '@/lib/admin/settings';
import crypto from 'crypto';

// ── Config cache ───────────────────────────────────────────────
interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  authDomain: string;
  testMode: boolean;
  cachedAt: number;
}

let cachedConfig: FirebaseConfig | null = null;
const CACHE_TTL = 60_000;

async function getConfig(): Promise<FirebaseConfig> {
  if (cachedConfig && Date.now() - cachedConfig.cachedAt < CACHE_TTL) {
    return cachedConfig;
  }

  const apiKey = (await getSetting('firebase_api_key')) || '';
  const projectId = (await getSetting('firebase_project_id')) || '';
  const authDomain = (await getSetting('firebase_auth_domain')) || '';
  const testModeStr = await getSetting('firebase_test_mode');
  const testMode = testModeStr === 'true';

  cachedConfig = { apiKey, projectId, authDomain, testMode, cachedAt: Date.now() };
  return cachedConfig;
}

/** Admin ayarları değiştiğinde cache'i temizle */
export function invalidateFirebaseConfigCache(): void {
  cachedConfig = null;
}

// ── Google public keys cache ──────────────────────────────────
let googleKeys: Record<string, string> | null = null;
let googleKeysExpiry = 0;

async function getGooglePublicKeys(): Promise<Record<string, string>> {
  if (googleKeys && Date.now() < googleKeysExpiry) {
    return googleKeys;
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );

  if (!res.ok) {
    throw new Error('Google public keys alınamadı');
  }

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1000 : 3600_000;

  googleKeys = await res.json();
  googleKeysExpiry = Date.now() + maxAge;
  return googleKeys!;
}

// ── Token verification ────────────────────────────────────────

interface FirebaseTokenPayload {
  phone_number: string;
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time: number;
}

/**
 * Firebase ID token'ını doğrular ve telefon numarasını döndürür.
 * firebase-admin SDK'sı kullanmadan, JWT'yi manuel olarak doğrular.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<{ phoneNumber: string; firebaseUid: string }> {
  const config = await getConfig();

  if (config.testMode) {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Geçersiz token formatı');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!payload.phone_number) throw new Error('Token içinde telefon numarası yok');
    console.log(`[FIREBASE TEST] Token verified (test mode): phone=${payload.phone_number}`);
    return { phoneNumber: payload.phone_number, firebaseUid: payload.sub || 'test' };
  }

  if (!config.projectId) {
    throw new Error('Firebase Project ID ayarlanmalı (Admin Panel > Ayarlar)');
  }

  // JWT header'dan kid (key ID) al
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Geçersiz token formatı');

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const kid = header.kid;
  if (!kid) throw new Error('Token header içinde kid bulunamadı');

  // Google public key'leri al
  const keys = await getGooglePublicKeys();
  const publicKeyPem = keys[kid];
  if (!publicKeyPem) throw new Error('Token imzası doğrulanamadı: bilinmeyen key ID');

  // JWT imzasını doğrula
  const signatureInput = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], 'base64url');

  const isValid = crypto.createVerify('RSA-SHA256')
    .update(signatureInput)
    .verify(publicKeyPem, signature);

  if (!isValid) throw new Error('Token imzası geçersiz');

  // Payload'u parse et ve claim'leri kontrol et
  const payload: FirebaseTokenPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) throw new Error('Token süresi dolmuş');
  if (payload.iat > now + 60) throw new Error('Token iat geçersiz');
  if (payload.aud !== config.projectId) throw new Error('Token audience geçersiz');
  if (payload.iss !== `https://securetoken.google.com/${config.projectId}`) throw new Error('Token issuer geçersiz');
  if (!payload.sub) throw new Error('Token subject boş');
  if (!payload.phone_number) throw new Error('Token içinde telefon numarası yok');

  console.log(`[FIREBASE] Token verified: phone=${payload.phone_number}, uid=${payload.sub}`);
  return { phoneNumber: payload.phone_number, firebaseUid: payload.sub };
}

/**
 * Firebase client config'ini döndürür (public bilgiler, güvenli).
 * İstemci tarafında Firebase SDK'yı başlatmak için gerekli.
 */
export async function getClientConfig(): Promise<{ apiKey: string; authDomain: string; projectId: string } | null> {
  const config = await getConfig();
  if (!config.apiKey || !config.projectId) return null;
  return {
    apiKey: config.apiKey,
    authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
    projectId: config.projectId,
  };
}

/**
 * Firebase bakiye durumu — Firebase bakiye kavramı yoktur.
 * Her zaman available döner.
 */
export async function getBalanceStatus(): Promise<{ balance: number; lowBalance: boolean }> {
  return { balance: 999, lowBalance: false };
}
