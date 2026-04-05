import { NextResponse } from 'next/server';
import { getBalanceStatus } from '@/lib/sms/provider';
import { getSetting } from '@/lib/admin/settings';

export async function GET() {
  try {
    // Admin panelden test amacli bakiye dusuk simule edilebilir
    const forcelow = await getSetting('force_low_balance');
    if (forcelow === 'true') {
      return NextResponse.json({ available: false });
    }

    const { lowBalance } = await getBalanceStatus();
    return NextResponse.json({ available: !lowBalance });
  } catch {
    // Hata durumunda sistemi açık tut — kullanıcıyı engellemekten kaçın
    return NextResponse.json({ available: true });
  }
}
