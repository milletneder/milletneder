import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyToken, signToken } from '@/lib/auth/jwt';
import { deriveKeyFromPassword, encryptVEK, decryptVEK } from '@/lib/crypto/vote-encryption';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyToken(authHeader.slice(7));
    } catch {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json({ error: 'Yeni şifre en az 6 karakter olmalı' }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // If user already has a password, verify current password
    if (user.password_hash) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Mevcut şifrenizi girin' }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Mevcut şifre hatalı' }, { status: 401 });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updateData: Record<string, unknown> = { password_hash: passwordHash, updated_at: new Date() };

    // VEK re-encrypt: eski şifreyle decrypt → yeni şifreyle encrypt
    if (user.encrypted_vek && user.vote_encryption_version === 1 && currentPassword) {
      const oldKey = deriveKeyFromPassword(currentPassword, user.id);
      const vek = decryptVEK(user.encrypted_vek, oldKey);
      if (vek) {
        const newKey = deriveKeyFromPassword(newPassword, user.id);
        updateData.encrypted_vek = encryptVEK(vek, newKey);
      }
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    // Yeni JWT oluştur (vp/vk güncelle)
    const newToken = signToken({
      userId: user.id,
      vp: payload.vp,
      vk: payload.vk,
    });

    return NextResponse.json({ success: true, token: newToken });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Şifre değiştirme başarısız' }, { status: 500 });
  }
}
