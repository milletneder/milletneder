import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash, createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getAdminAuth } from '@/lib/firebase/admin';
import { deriveKeyFromPassword, encryptVEK, decryptVEK, deriveKeyFromRecoveryCode } from '@/lib/crypto/vote-encryption';
import { findRecoveryEntry, type RecoveryEntry } from '@/lib/crypto/recovery-codes';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { firebaseIdToken, newPassword, recoveryCode } = await request.json();

    if (!firebaseIdToken) {
      return NextResponse.json({ error: 'Firebase token gerekli' }, { status: 400 });
    }

    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
    }

    // Firebase token doğrula
    const adminAuth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(firebaseIdToken);
    } catch {
      return NextResponse.json({ error: 'Kimlik doğrulama başarısız' }, { status: 401 });
    }

    // identity_hash ile kullanıcı ara (HMAC destekli)
    const identityValue = decodedToken.email || decodedToken.phone_number || decodedToken.uid;
    const rawHash = createHash('sha256').update(identityValue.toLowerCase().trim()).digest('hex');
    const IDENTITY_KEY = process.env.IDENTITY_KEY;
    const identityHash = IDENTITY_KEY
      ? createHmac('sha256', IDENTITY_KEY).update(Buffer.from(rawHash, 'hex')).digest('hex')
      : rawHash;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.identity_hash, identityHash))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Bu numarayla kayıtlı bir hesap bulunamadı. Henüz kayıt olmadıysanız ana sayfadan "Oy Ver" butonuyla kayıt olabilirsiniz.' }, { status: 404 });
    }

    // Şifreyi güncelle
    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    const updateData: Record<string, unknown> = { password_hash: passwordHash, updated_at: new Date() };

    // VEK re-encrypt: kurtarma koduyla decrypt → yeni şifreyle encrypt
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
