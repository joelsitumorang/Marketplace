import { prisma } from "./prisma";

export type AuditLogEventType =
  | "Barang Masuk"
  | "Barang Terjual"
  | "Barang Dipersiapkan / Dipesan"
  | "Barang Retur"
  | "Retur Diajukan"
  | "Retur Otomatis Disetujui"
  | "Retur Disetujui SUPERADMIN"
  | "Retur Ditolak";

export async function logActivity({
  adminEmail,
  eventType,
  productSku,
  productName,
  description,
}: {
  adminEmail: string;
  eventType: AuditLogEventType;
  productSku: string;
  productName: string;
  description: string;
}) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        adminEmail,
        eventType,
        productSku,
        productName,
        description,
      },
    });
    console.log(`[AUDIT_LOG_SUCCESS] Written log ID ${log.id} for event ${eventType}`);
    return log;
  } catch (error) {
    console.error(`[AUDIT_LOG_ERROR] Failed to write audit log for event ${eventType}:`, error);
    return null;
  }
}
