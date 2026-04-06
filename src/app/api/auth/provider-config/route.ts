/**
 * SMS Sağlayıcı Konfigürasyonu (İstemci İçin)
 *
 * İstemci tarafına aktif SMS sağlayıcısını ve Firebase config'ini döndürür.
 * Firebase aktifse, istemci Firebase JS SDK'yı dinamik olarak yükler.
 */

import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/admin/settings';
import { getClientConfig } from '@/lib/sms/firebase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const provider = (await getSetting('sms_provider')) || 'twilio';
    const fallback = (await getSetting('sms_provider_fallback')) || 'twilio';

    let firebaseConfig = null;
    if (provider === 'firebase') {
      firebaseConfig = await getClientConfig();
    }

    return NextResponse.json({
      provider,
      fallback,
      firebaseConfig,
    });
  } catch {
    return NextResponse.json({ provider: 'twilio', fallback: 'twilio', firebaseConfig: null });
  }
}
