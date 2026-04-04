import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { logAdminAction } from '@/lib/admin/audit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allParties = await db
      .select()
      .from(parties)
      .orderBy(asc(parties.sort_order));

    return NextResponse.json({ parties: allParties });
  } catch (error) {
    console.error('Parties list error:', error);
    return NextResponse.json(
      { error: 'Partiler listelenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const short_name = formData.get('short_name') as string;
    const slug = formData.get('slug') as string;
    const color = (formData.get('color') as string) || '#555555';
    const text_color = (formData.get('text_color') as string) || '#ffffff';
    const is_active = formData.get('is_active') === 'true';
    const sort_order = parseInt(formData.get('sort_order') as string) || 0;
    const logoFile = formData.get('logo') as File | null;

    if (!name || !short_name || !slug) {
      return NextResponse.json(
        { error: 'Ad, kısaltma ve slug alanları gereklidir' },
        { status: 400 }
      );
    }

    let logo_url: string | null = null;

    if (logoFile && logoFile.size > 0) {
      const ext = logoFile.name.split('.').pop() || 'png';
      const filename = `${slug}-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'parties');
      await mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      await writeFile(path.join(uploadDir, filename), buffer);
      logo_url = `/uploads/parties/${filename}`;
    }

    const [newParty] = await db
      .insert(parties)
      .values({
        name,
        short_name,
        slug,
        color,
        text_color,
        logo_url,
        is_active,
        sort_order,
      })
      .returning();

    await logAdminAction({
      adminId: admin.id,
      action: 'create_party',
      targetType: 'party',
      targetId: newParty.id,
      details: { name, slug },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ party: newParty }, { status: 201 });
  } catch (error) {
    console.error('Party create error:', error);
    return NextResponse.json(
      { error: 'Parti oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}
