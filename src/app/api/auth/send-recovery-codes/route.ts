import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Giris yapmaniz gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { codes, email } = body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: 'Kodlar gerekli' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: 'Gecerli bir e-posta adresi gerekli' }, { status: 400 });
    }

    const emailStr = String(email).toLowerCase().trim();

    // recovery_email_hash'i güncelle (henüz yoksa)
    if (!user.recovery_email_hash) {
      const emailHash = createHash('sha256').update(emailStr).digest('hex');
      await db.update(users).set({
        recovery_email_hash: emailHash,
        updated_at: new Date(),
      }).where(eq(users.id, user.id));
    }

    // E-posta gönder
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: emailStr,
        subject: 'milletneder.com - Kurtarma Kodlariniz',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #000;">Kurtarma Kodlariniz</h2>
            <p style="color: #666; font-size: 14px;">
              Bu kodlari guvenli bir yerde saklayin. Sifrenizi unutursaniz bu kodlarla
              hesabinizi kurtarabilirsiniz.
            </p>
            <div style="background: #f5f5f5; padding: 20px; margin: 16px 0; font-family: monospace; font-size: 16px; line-height: 2;">
              ${codes.map((c: string, i: number) => `<div>${i + 1}. <strong>${c}</strong></div>`).join('')}
            </div>
            <p style="color: #b45309; font-size: 12px;">
              Bu kodlari kimseyle paylasmayiniz. milletneder.com ekibi sizden asla
              kurtarma kodlarinizi istemez.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px;">milletneder.com</p>
          </div>
        `,
      });

      return NextResponse.json({ success: true });
    } catch (emailErr) {
      console.error('Send recovery codes email error:', emailErr);
      return NextResponse.json({ error: 'E-posta gonderilemedi' }, { status: 500 });
    }
  } catch (error) {
    console.error('Send recovery codes error:', error);
    return NextResponse.json({ error: 'Islem basarisiz' }, { status: 500 });
  }
}
