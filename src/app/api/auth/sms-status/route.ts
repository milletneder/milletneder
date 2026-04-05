import { NextResponse } from 'next/server';
import { getBalanceStatus } from '@/lib/sms/provider';

export async function GET() {
  try {
    const { lowBalance } = await getBalanceStatus();
    return NextResponse.json({ available: !lowBalance });
  } catch {
    // Hata durumunda sistemi açık tut — kullanıcıyı engellemekten kaçın
    return NextResponse.json({ available: true });
  }
}
