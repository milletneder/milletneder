import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { votes } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { logAdminAction } from '@/lib/admin/audit';

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
    const voteId = parseInt(id, 10);
    if (isNaN(voteId)) {
      return NextResponse.json({ error: 'Geçersiz oy ID' }, { status: 400 });
    }

    const [vote] = await db
      .select()
      .from(votes)
      .where(eq(votes.id, voteId))
      .limit(1);

    if (!vote) {
      return NextResponse.json({ error: 'Oy bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { action, reason } = body;

    let isValid: boolean;
    let auditAction: string;

    switch (action) {
      case 'invalidate':
        isValid = false;
        auditAction = 'invalidate_vote';
        break;
      case 'validate':
        isValid = true;
        auditAction = 'validate_vote';
        break;
      default:
        return NextResponse.json(
          { error: 'Geçersiz işlem. İzin verilen işlemler: invalidate, validate' },
          { status: 400 }
        );
    }

    await db
      .update(votes)
      .set({ is_valid: isValid, updated_at: new Date() })
      .where(eq(votes.id, voteId));

    await logAdminAction({
      adminId: admin.id,
      action: auditAction,
      targetType: 'vote',
      targetId: voteId,
      details: { reason: reason ?? null, previousState: vote.is_valid },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ message: 'Oy başarıyla güncellendi' });
  } catch (error) {
    console.error('Vote update error:', error);
    return NextResponse.json(
      { error: 'Oy güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
