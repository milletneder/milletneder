import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { getSetting } from '@/lib/admin/settings';

export const dynamic = 'force-dynamic';

async function getSmtpConfig() {
  const host = await getSetting('smtp_host') || process.env.SMTP_HOST || '';
  const port = parseInt(await getSetting('smtp_port') || process.env.SMTP_PORT || '587', 10);
  const user = await getSetting('smtp_user') || process.env.SMTP_USER || '';
  const pass = await getSetting('smtp_pass') || process.env.SMTP_PASS || '';
  const from = await getSetting('smtp_from') || process.env.SMTP_FROM || user;
  return { host, port, user, pass, from };
}

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

    // SMTP yapılandırmasını al
    const smtp = await getSmtpConfig();
    if (!smtp.host || !smtp.user || !smtp.pass) {
      console.error('SMTP not configured. Set SMTP settings in Admin Panel > Ayarlar or env vars.');
      return NextResponse.json({ error: 'E-posta servisi henüz yapılandırılmamış. Admin panelden SMTP ayarlarını girin.' }, { status: 500 });
    }

    // E-posta gönder
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });

      await transporter.sendMail({
        from: smtp.from,
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
