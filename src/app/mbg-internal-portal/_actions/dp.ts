"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { calcDpDueDate, calcDpStage, getWibDateString } from "@/lib/dp/stage";

export async function markDpContacted(transactionId: number) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
      return { success: false, message: "Tidak memiliki hak akses." };
    }

    const tx = await prisma.salesTransaction.findUnique({
      where: { id: transactionId },
      include: {
        item: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!tx) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    if (tx.status !== "DP") {
      return { success: false, message: "Transaksi ini sudah bukan status DP." };
    }

    // Otorisasi cabang untuk role ADMIN
    if (session.role === "ADMIN") {
      const cleanSessionBranch = (session.asal_cabang || "").replace(/^MBG\s+Cabang\s+/i, "").replace(/^MBG\s+/i, "").trim().toLowerCase();
      const cleanTxBranch = (tx.branchName || "").replace(/^MBG\s+Cabang\s+/i, "").replace(/^MBG\s+/i, "").trim().toLowerCase();

      if (!cleanTxBranch.includes(cleanSessionBranch) && !cleanSessionBranch.includes(cleanTxBranch)) {
        return { success: false, message: "Anda tidak berhak mengakses transaksi cabang lain." };
      }
    }

    const now = new Date();
    const dueDate = tx.dpDeadline ? new Date(tx.dpDeadline) : calcDpDueDate(new Date(tx.transactionDate));
    const stageInfo = calcDpStage(dueDate, now);

    if (!stageInfo.stage) {
      return { success: false, message: "Transaksi belum masuk tahap pengingat." };
    }

    // Idempotensi terhadap klik ganda
    if (tx.lastContactStage === stageInfo.stage) {
      if (stageInfo.stage !== "OVERDUE") {
        return { success: true, message: "Sudah ditandai pada tahap ini." };
      }

      // Jika OVERDUE, periksa apakah sudah ditandai pada hari kalender WIB yang sama
      if (tx.lastContactedAt && getWibDateString(new Date(tx.lastContactedAt)) === getWibDateString(now)) {
        return { success: true, message: "Sudah ditandai hari ini." };
      }
    }

    // Update database
    await prisma.salesTransaction.update({
      where: { id: transactionId },
      data: {
        lastContactedAt: now,
        lastContactStage: stageInfo.stage,
        contactCount: { increment: 1 },
      },
    });

    // Sensor nomor telepon di AuditLog (maksimal 4 digit terakhir)
    const phoneMasked = tx.buyerPhone
      ? `...${tx.buyerPhone.slice(-4)}`
      : "tanpa no WA";

    await logActivity({
      adminEmail: session.email,
      eventType: "DP_CONTACTED",
      productSku: tx.sku,
      productName: tx.item?.title || tx.sku,
      description: `Tandai sudah dihubungi (${stageInfo.label}) - Pembeli: ${tx.buyerName || "Anonim"} (${phoneMasked})`,
    });

    revalidatePath("/mbg-internal-portal");
    revalidatePath("/mbg-internal-portal/kasir");

    return { success: true, message: "Berhasil menandai sudah dihubungi." };
  } catch (error: any) {
    console.error("Gagal menjalankan markDpContacted:", error);
    return { success: false, message: error.message || "Terjadi kesalahan internal server." };
  }
}
