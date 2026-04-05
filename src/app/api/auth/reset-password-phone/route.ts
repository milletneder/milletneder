import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isPhoneOtpVerified } from '@/lib/auth/phone-otp-store';
import { hashIdentity } from '@/lib/auth/registration';
import { deriveKeyFromPassword, encryptVEK, decryptVEK, deriveKeyFromRecoveryCode } from '@/lib/crypto/vote-encryption';
import { findRecoveryEntry, type RecoveryEntry } from '@/lib/crypto/recovery-codes';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone, newPassword, recoveryCode } = await request.json();

    // Validate phone
    const raw = String(phone || '').replace(/\s/g, '');
    if (raw.length !== 10 || !raw.startsWith('5')) {
      return NextResponse.json({ error: 'Geçersiz telefon numarası' }, { status: 400 });
    }

    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
    }

    const fullPhone = `+90${raw}`;

    // Verify phone was OTP-verified
    if (!isPhoneOtpVerified(fullPhone)) {
      return NextResponse.json({ error: 'Telefon numarası doğrulanmamış. Önce OTP ile doğrulayın.' }, { status: 401 });
    }

    // Find user by identity_hash
    const identityHash = hashIdentity(fullPhone);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Bu numarayla kayıtlı bir hesap bulunamadı.' }, { status: 404 });
    }

    // Update password
    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    const updateData: Record<string, unknown> = { password_hash: passwordHash, updated_at: new Date() };

    // VEK re-encrypt with recovery code
    let vekRecovered = false;
    if (user.encrypted_vek && user.vote_encryption_version === 1 && recoveryCode) {
      const entries = (user.recovery_codes ?? []) as RecoveryEntry[];
      const match = findRecoveryEntry(recoveryCode, entries);
      if (match) {
        const rcKey = deriveKeyFromRecoveryCode(recoveryCode);
        const vek = decryptVEK(match.entry.encrypted_vek, rcKey);
        if (vek) {
          const newKey = deriveKeyFromPassword(String(newPassword), user.id);
          updateData.encrypted_vek = encryptVEK(vek, newKey);
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

    return NextResponse.json({
      success: true,
      vekRecovered,
      ...(user.vote_encryption_version === 1 && !vekRecovered && { needsRecoveryCode: true }),
    });
  } catch (error) {
    console.error('Reset password phone error:', error);
    return NextResponse.json({ error: 'Şifre sıfırlama başarısız' }, { status: 500 });
  }
}
