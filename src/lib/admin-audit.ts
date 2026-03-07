// src/lib/admin-audit.ts
import { prisma } from "@/lib/prisma";
import type { Prisma, AdminActionType } from "@prisma/client";

type LogAdminActionParams = {
  adminId: string;
  actionType: AdminActionType;
  entityType: string;
  entityId?: string | null;
  targetUserId?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logAdminAction({
  adminId,
  actionType,
  entityType,
  entityId,
  targetUserId,
  reason,
  metadata,
}: LogAdminActionParams) {
  return prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType,
      entityType,
      entityId: entityId ?? null,
      targetUserId: targetUserId ?? null,
      reason: reason ?? null,
      metadata: metadata ?? undefined,
    },
  });
}