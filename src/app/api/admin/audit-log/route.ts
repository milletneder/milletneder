import { NextRequest, NextResponse } from 'next/server';
import { sql, eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminAuditLogs, admins } from '@/lib/db/schema';
import { getAdminFromRequest } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Yetkilendirme gerekli' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const adminIdFilter = searchParams.get('adminId');
    const actionFilter = searchParams.get('action');
    const targetTypeFilter = searchParams.get('targetType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (adminIdFilter) {
      conditions.push(eq(adminAuditLogs.admin_id, parseInt(adminIdFilter, 10)));
    }
    if (actionFilter) {
      conditions.push(eq(adminAuditLogs.action, actionFilter));
    }
    if (targetTypeFilter) {
      conditions.push(eq(adminAuditLogs.target_type, targetTypeFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select({
        id: adminAuditLogs.id,
        admin_id: adminAuditLogs.admin_id,
        action: adminAuditLogs.action,
        target_type: adminAuditLogs.target_type,
        target_id: adminAuditLogs.target_id,
        details: adminAuditLogs.details,
        ip_address: adminAuditLogs.ip_address,
        created_at: adminAuditLogs.created_at,
        admin_name: admins.name,
        admin_email: admins.email,
      })
      .from(adminAuditLogs)
      .leftJoin(admins, eq(adminAuditLogs.admin_id, admins.id));

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminAuditLogs);

    let results;
    let totalResult;

    if (whereClause) {
      results = await query.where(whereClause).orderBy(desc(adminAuditLogs.created_at)).limit(limit).offset(offset);
      totalResult = await countQuery.where(whereClause);
    } else {
      results = await query.orderBy(desc(adminAuditLogs.created_at)).limit(limit).offset(offset);
      totalResult = await countQuery;
    }

    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      logs: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json(
      { error: 'Denetim kayıtları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
