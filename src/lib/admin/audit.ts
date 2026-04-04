import { db } from '@/lib/db';
import { adminAuditLogs } from '@/lib/db/schema';

interface AuditParams {
  adminId: number;
  action: string;
  targetType: string;
  targetId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAdminAction(params: AuditParams) {
  await db.insert(adminAuditLogs).values({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    details: params.details ? JSON.stringify(params.details) : null,
    ip_address: params.ipAddress ?? null,
  });
}
