import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { deriveKeyFromPassword, decryptVEK } from '@/lib/crypto/vote-encryption';
import { generateRecoveryCodes, createRecoveryEntries } from '@/lib/crypto/recovery-codes';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 });
    }

    const { currentPassword } = await request.json();

    if (!currentPassword) {
      return NextResponse.json({ error: 'Mevcut şifrenizi girin' }, { status: 400 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: 'Şifre belirlenmemiş' }, { status: 400 });
    }

    // Şifreyi doğrula
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Şifre hatalı' }, { status: 401 });
    }

    // VEK decrypt
    if (!user.encrypted_vek || user.vote_encryption_version !== 1) {
      return NextResponse.json({ error: 'Oy şifreleme sistemi henüz aktif değil' }, { status: 400 });
    }

    const derivedKey = deriveKeyFromPassword(currentPassword, user.id);
    const vek = decryptVEK(user.encrypted_vek, derivedKey);
    if (!vek) {
      return NextResponse.json({ error: 'Şifreleme anahtarı çözümlenemedi' }, { status: 500 });
    }

    // Yeni kurtarma kodları oluştur
    const codes = generateRecoveryCodes(8);
    const entries = createRecoveryEntries(codes, vek);

    await db
      .update(users)
      .set({
        recovery_codes: entries,
        recovery_codes_confirmed: false,
        recovery_codes_generated_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Regenerate recovery codes error:', error);
    return NextResponse.json({ error: 'Kurtarma kodları oluşturulamadı' }, { status: 500 });
  }
}
