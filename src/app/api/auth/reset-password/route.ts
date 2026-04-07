import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getCode, deleteCode } from '@/lib/auth/verification-codes';
import { deriveKeyFromPassword, encryptVEK, decryptVEK } from '@/lib/crypto/vote-encryption';
import { findRecoveryEntry, type RecoveryEntry } from '@/lib/crypto/recovery-codes';
import { deriveKeyFromRecoveryCode } from '@/lib/crypto/vote-encryption';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword, recoveryCode } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Tüm alanlar gerekli' }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
    }

    // Verify code
    const stored = getCode(email);
    if (!stored) {
      return NextResponse.json({ error: 'Doğrulama kodu bulunamadı veya süresi dolmuş' }, { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      deleteCode(email);
      return NextResponse.json({ error: 'Kodun süresi dolmuş. Yeni kod talep edin.' }, { status: 400 });
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
      deleteCode(email);
      return NextResponse.json({ error: 'Çok fazla deneme. Yeni kod talep edin.' }, { status: 400 });
    }

    if (stored.code !== String(code)) {
      stored.attempts++;
      return NextResponse.json({ error: 'Kod hatalı' }, { status: 400 });
    }

    // Code is valid — find user by recovery_email_hash
    const emailHash = createHash('sha256')
      .update(email.toLowerCase().trim())
      .digest('hex');

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.recovery_email_hash, emailHash))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Henüz kayıt olmadıysanız ana sayfadan "Katıl" butonuyla kayıt olabilirsiniz.' }, { status: 404 });
    }

    // Tam kullanıcı bilgilerini al (VEK + recovery codes için)
    const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updateData: Record<string, unknown> = { password_hash: passwordHash, updated_at: new Date() };

    // VEK re-encrypt: kurtarma koduyla decrypt → yeni şifreyle encrypt
    let vekRecovered = false;
    if (fullUser?.encrypted_vek && fullUser.vote_encryption_version === 1 && recoveryCode) {
      const entries = (fullUser.recovery_codes ?? []) as RecoveryEntry[];
      const match = findRecoveryEntry(recoveryCode, entries);
      if (match) {
        const rcKey = deriveKeyFromRecoveryCode(recoveryCode);
        const vek = decryptVEK(match.entry.encrypted_vek, rcKey);
        if (vek) {
          // VEK'i yeni şifreyle re-encrypt
          const newKey = deriveKeyFromPassword(newPassword, user.id);
          updateData.encrypted_vek = encryptVEK(vek, newKey);
          // Kurtarma kodunu kullanıldı olarak işaretle
          const updatedEntries = [...entries];
          updatedEntries[match.index] = { ...updatedEntries[match.index], used: true };
          updateData.recovery_codes = updatedEntries;
          vekRecovered = true;
        }
      }
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    deleteCode(email);

    return NextResponse.json({
      success: true,
      vekRecovered,
      ...(fullUser?.vote_encryption_version === 1 && !vekRecovered && { needsRecoveryCode: true }),
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Şifre sıfırlama başarısız' }, { status: 500 });
  }
}
