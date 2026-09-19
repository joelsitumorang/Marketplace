import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const { transactionId, amount, paymentMethod, processedBy } = await request.json();

    if (!transactionId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: "Data tidak valid." }, { status: 400 });
    }

    const tx = await prisma.salesTransaction.findUnique({
      where: { id: transactionId },
      include: { installments: true }
    });

    if (!tx) {
      return NextResponse.json({ success: false, message: "Transaksi tidak ditemukan." }, { status: 404 });
    }

    if (tx.status !== "DP") {
      return NextResponse.json({ success: false, message: "Transaksi ini tidak berstatus DP." }, { status: 400 });
    }

    // Hitung total terbayar sebelumnya
    const totalPaidBefore = tx.installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
    const newTotalPaid = totalPaidBefore + amount;
    const isLunas = newTotalPaid >= Number(tx.soldPrice);

    await prisma.$transaction(async (db) => {
      // 1. Buat cicilan baru
      await db.paymentInstallment.create({
        data: {
          salesTransactionId: tx.id,
          amount,
          paymentMethod: paymentMethod || "TUNAI",
          processedBy: processedBy || "Admin"
        }
      });

      // 2. Update status jika lunas
      if (isLunas) {
        await db.salesTransaction.update({
          where: { id: tx.id },
          data: { status: "LUNAS" }
        });
      }
    });

    revalidatePath("/mbg-internal-portal/reports");

    return NextResponse.json({ success: true, isLunas });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
