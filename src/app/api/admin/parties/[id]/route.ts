import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { parties } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { logAdminAction } from '@/lib/admin/audit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const partyId = parseInt(id, 10);
    if (isNaN(partyId)) {
      return NextResponse.json({ error: 'Geçersiz parti ID' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(parties)
      .where(eq(parties.id, partyId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Parti bulunamadı' }, { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string | null;
    const short_name = formData.get('short_name') as string | null;
    const slug = formData.get('slug') as string | null;
    const color = formData.get('color') as string | null;
    const text_color = formData.get('text_color') as string | null;
    const is_active_str = formData.get('is_active') as string | null;
    const sort_order_str = formData.get('sort_order') as string | null;
    const logoFile = formData.get('logo') as File | null;

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (name) updateData.name = name;
    if (short_name) updateData.short_name = short_name;
    if (slug) updateData.slug = slug;
    if (color) updateData.color = color;
    if (text_color) updateData.text_color = text_color;
    if (is_active_str !== null) updateData.is_active = is_active_str === 'true';
    if (sort_order_str !== null) updateData.sort_order = parseInt(sort_order_str) || 0;

    if (logoFile && logoFile.size > 0) {
      const ext = logoFile.name.split('.').pop() || 'png';
      const fileSlug = slug || existing.slug;
      const filename = `${fileSlug}-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'parties');
      await mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      await writeFile(path.join(uploadDir, filename), buffer);
      updateData.logo_url = `/uploads/parties/${filename}`;
    }

    const [updatedParty] = await db
      .update(parties)
      .set(updateData)
      .where(eq(parties.id, partyId))
      .returning();

    await logAdminAction({
      adminId: admin.id,
      action: 'update_party',
      targetType: 'party',
      targetId: partyId,
      details: { name: updatedParty.name, slug: updatedParty.slug },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ party: updatedParty });
  } catch (error) {
    console.error('Party update error:', error);
    return NextResponse.json(
      { error: 'Parti güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
