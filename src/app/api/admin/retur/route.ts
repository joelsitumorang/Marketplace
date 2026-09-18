import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { ReturnStatus, ReturnReason, Status } from "@prisma/client";
import { revalidatePath } from "next/cache";

function selisihHariKalender(dari: Date, ke: Date): number {
  const awal = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate());
  const akhir = new Date(ke.getFullYear(), ke.getMonth(), ke.getDate());
  return Math.round((akhir.getTime() - awal.getTime()) / 864e5);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ReturnStatus | null;
    const reason = searchParams.get("reason") as ReturnReason | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    let branch = searchParams.get("branch");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    // ADMIN can only see their own branch
    if (session.role === "ADMIN") {
      branch = session.asal_cabang;
    }

    const where: any = {};

    if (status) where.status = status;
    if (reason) where.reason = reason;
    if (branch) where.salesTransaction = { branchName: branch };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [returns, total] = await Promise.all([
      prisma.salesReturn.findMany({
        where,
        include: {
          salesTransaction: {
            select: {
              sku: true,
              soldPrice: true,
              cashierName: true,
              branchName: true,
              transactionDate: true,
            },
          },
          auctionItem: {
            select: {
              title: true,
              sku: true,
              category: true,
            },
          },
          processedBy: {
            select: {
              nama_lengkap: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              nama_lengkap: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.salesReturn.count({ where }),
    ]);

    const hasMore = skip + returns.length < total;

    return NextResponse.json({ success: true, data: returns, total, hasMore });
  } catch (error) {
    console.error("GET Returns Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { salesTransactionId, reason, reasonNote, condition, refundAmount, refundMethod } = body;

    if (!salesTransactionId || !reason || !condition || refundAmount === undefined || !refundMethod) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    if ((reason === "LAINNYA" || reason === "TIDAK_SESUAI_DESKRIPSI") && (!reasonNote || reasonNote.length < 10)) {
      return NextResponse.json({ success: false, message: "Catatan alasan retur minimal 10 karakter" }, { status: 400 });
    }

    const transaction = await prisma.salesTransaction.findUnique({
      where: { id: Number(salesTransactionId) },
      include: { item: true },
    });

    if (!transaction || !transaction.item) {
      return NextResponse.json({ success: false, message: "Transaksi atau item tidak ditemukan" }, { status: 404 });
    }

    if (refundAmount > transaction.soldPrice) {
      return NextResponse.json({ success: false, message: "Jumlah refund melebihi harga jual" }, { status: 400 });
    }

    if (transaction.isReturned) {
      return NextResponse.json({ success: false, message: "Transaksi ini sudah diretur" }, { status: 400 });
    }

    if (session.role === "ADMIN" && transaction.branchName !== session.asal_cabang) {
      return NextResponse.json({ success: false, message: "Tidak dapat meretur transaksi dari cabang lain" }, { status: 403 });
    }

    const existingPending = await prisma.salesReturn.findFirst({
      where: {
        salesTransactionId: transaction.id,
        status: "MENUNGGU_PERSETUJUAN",
      },
    });

    if (existingPending) {
      return NextResponse.json({ success: false, message: "Sudah ada pengajuan retur untuk transaksi ini" }, { status: 400 });
    }

    const daysSincePurchase = selisihHariKalender(transaction.transactionDate, new Date());

    if (daysSincePurchase > 30) {
      return NextResponse.json({ success: false, message: "Transaksi melewati batas maksimal retur (30 hari)." }, { status: 400 });
    }

    let status: ReturnStatus;
    let requiresApproval = false;

    if (daysSincePurchase > 3) {
      requiresApproval = true;
      status = "MENUNGGU_PERSETUJUAN";
    } else {
      status = "DISETUJUI";
    }

    let createdReturn;

    if (status === "DISETUJUI") {
      createdReturn = await prisma.$transaction(async (tx) => {
        const retur = await tx.salesReturn.create({
          data: {
            salesTransactionId: transaction.id,
            auctionItemId: transaction.itemId,
            processedById: session.id,
            reason,
            reasonNote,
            condition,
            refundAmount,
            refundMethod,
            status,
            approvedById: session.id,
            approvedAt: new Date(),
          },
        });

        const finalReasonNote = reasonNote || reason;

        await tx.salesTransaction.update({
          where: { id: transaction.id },
          data: {
            isReturned: true,
            returnReason: finalReasonNote,
          },
        });

        let itemStatus: Status = "RETUR";
        let isVisible = false;

        if (condition === "LAYAK_JUAL_ULANG") {
          itemStatus = "Tersedia";
          isVisible = true;
        }

        await tx.auctionItem.update({
          where: { id: transaction.itemId },
          data: {
            status: itemStatus,
            isMarketplaceVisible: isVisible,
            returnReason: finalReasonNote,
          },
        });

        return retur;
      });

      await logActivity(
        session.id,
        "Retur Otomatis Disetujui",
        `Retur SKU ${transaction.sku} disetujui otomatis (${daysSincePurchase} hari)`
      );

      revalidatePath("/");
      revalidatePath(`/katalog/${transaction.itemId}`);
    } else {
      createdReturn = await prisma.salesReturn.create({
        data: {
          salesTransactionId: transaction.id,
          auctionItemId: transaction.itemId,
          processedById: session.id,
          reason,
          reasonNote,
          condition,
          refundAmount,
          refundMethod,
          status,
        },
      });

      await logActivity(
        session.id,
        "Retur Diajukan",
        `Pengajuan retur SKU ${transaction.sku} (${daysSincePurchase} hari) menunggu persetujuan`
      );
    }

    return NextResponse.json({
      success: true,
      data: createdReturn,
      message: status === "DISETUJUI" ? "Retur otomatis disetujui" : "Pengajuan retur berhasil, menunggu persetujuan",
    });
  } catch (error) {
    console.error("POST Return Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
