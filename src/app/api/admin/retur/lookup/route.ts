import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
    const sku = searchParams.get("sku");

    if (!sku) {
      return NextResponse.json({ success: false, message: "SKU diperlukan" }, { status: 400 });
    }

    const transaction = await prisma.salesTransaction.findFirst({
      where: {
        sku: sku,
        isReturned: false,
      },
      orderBy: {
        transactionDate: "desc",
      },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            sku: true,
            category: true,
            status: true,
            price: true,
            images: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, message: "Tidak ditemukan transaksi aktif untuk SKU ini." }, { status: 404 });
    }

    const daysSincePurchase = selisihHariKalender(transaction.transactionDate, new Date());
    
    const canReturn = daysSincePurchase <= 30;
    const requiresApproval = daysSincePurchase > 3;
    const isBlocked = daysSincePurchase > 30;

    const existingPending = await prisma.salesReturn.findFirst({
      where: {
        salesTransactionId: transaction.id,
        status: "MENUNGGU_PERSETUJUAN",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        daysSincePurchase,
        canReturn,
        requiresApproval,
        isBlocked,
        hasPendingReturn: !!existingPending,
      },
    });
  } catch (error) {
    console.error("GET Lookup Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
