import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generateCode, storeCode, isRateLimited } from '@/lib/auth/verification-codes';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi gerekli' }, { status: 400 });
    }

    if (isRateLimited(email)) {
      return NextResponse.json({ error: 'Lütfen 1 dakika bekleyin' }, { status: 429 });
    }

    const code = generateCode();
    storeCode(email, code);

    // Send email via SMTP
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpUser || !smtpPass) {
      console.error('SMTP credentials not configured');
      return NextResponse.json({ error: 'E-posta servisi yapılandırılmamış' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `#MilletNeDer <${smtpFrom}>`,
      to: email,
      subject: 'MilletNeDer Doğrulama Kodu',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #000; margin-bottom: 8px; font-size: 20px;">E-posta Doğrulama</h2>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
            MilletNeDer hesabınızı doğrulamak için aşağıdaki kodu kullanın:
          </p>
          <div style="background: #f5f5f5; border: 1px solid #e0e0e0; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">
            Bu kod 5 dakika içinde geçerliliğini yitirecektir.<br/>
            Bu doğrulamayı siz talep etmediyseniz bu e-postayı yoksayabilirsiniz.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send verification code error:', error);
    return NextResponse.json({ error: 'Doğrulama kodu gönderilemedi' }, { status: 500 });
  }
}
