import { NextRequest, NextResponse } from 'next/server';
import { desc, and, or, lte, gte, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { rounds } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 403 }
      );
    }

    const allRounds = await db
      .select()
      .from(rounds)
      .orderBy(desc(rounds.start_date));

    return NextResponse.json({ rounds: allRounds });
  } catch (error) {
    console.error('Rounds list error:', error);
    return NextResponse.json(
      { error: 'Turlar listelenirken bir hata oluştu' },
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
        { status: 403 }
      );
    }

    const body = await request.json();
    const { start_date, end_date } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Başlangıç ve bitiş tarihi gereklidir' },
        { status: 400 }
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' },
        { status: 400 }
      );
    }

    // Check for overlapping active rounds
    const overlapping = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.is_active, true),
          or(
            and(lte(rounds.start_date, endDate), gte(rounds.end_date, startDate))
          )
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      return NextResponse.json(
        { error: 'Bu tarih aralığında aktif bir tur zaten mevcut' },
        { status: 409 }
      );
    }

    const [newRound] = await db
      .insert(rounds)
      .values({
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      })
      .returning();

    await logAdminAction({
      adminId: admin.id,
      action: 'create_round',
      targetType: 'round',
      targetId: newRound.id,
      details: { start_date, end_date },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ round: newRound }, { status: 201 });
  } catch (error) {
    console.error('Round create error:', error);
    return NextResponse.json(
      { error: 'Tur oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}
