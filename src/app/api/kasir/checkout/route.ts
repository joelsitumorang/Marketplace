import { Status } from '@prisma/client';
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, paymentMethod, amountCash, amountTransfer, isDP, dpAmount } = body;

    // Validate: must have items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Keranjang kosong. Minimal 1 barang untuk checkout." },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.itemId || !item.sku || !item.soldPrice || !item.branchName || !item.cashierName) {
        return NextResponse.json(
          { success: false, message: `Data tidak lengkap untuk SKU: ${item.sku || "unknown"}` },
          { status: 400 }
        );
      }
    }

    // Execute batch transaction atomically
    const result = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of items) {
        // 1. Verify item exists and is available
        const dbItem = await tx.auctionItem.findUnique({ where: { id: item.itemId } });
        if (!dbItem) {
          throw new Error(`Barang dengan ID ${item.itemId} (SKU: ${item.sku}) tidak ditemukan.`);
        }
        if (dbItem.status === Status.Terjual) {
          throw new Error(`Barang "${dbItem.title}" (SKU: ${item.sku}) sudah terjual sebelumnya.`);
        }

        // 2. Update item status to Terjual
        const updatedItem = await tx.auctionItem.update({
          where: { id: item.itemId },
          data: { status: Status.Terjual },
        });

        // 3. Create sales transaction record
        const txStatus = isDP ? "DP" : "LUNAS";
        const dpDeadline = isDP ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null;

        const salesTx = await tx.salesTransaction.create({
          data: {
            itemId: item.itemId,
            sku: item.sku,
            soldPrice: item.soldPrice,
            branchName: item.branchName,
            cashierName: item.cashierName,
            paymentMethod: paymentMethod || "TUNAI",
            amountCash: amountCash || null,
            amountTransfer: amountTransfer || null,
            status: txStatus,
            dpDeadline,
          },
        });

        // 4. Jika DP, catat pembayaran awal sebagai cicilan pertama
        if (isDP && dpAmount > 0) {
          // Asumsikan dpAmount dari 1 barang? Tunggu, checkout kasir biasanya memproses banyak barang sekaligus!
          // Tapi dpAmount di frontend adalah DP TOTAL untuk seluruh keranjang.
          // Wah, kita memecah DP per barang secara proporsional.
          
          const totalHargaKeranjang = items.reduce((sum: number, it: any) => sum + Number(it.soldPrice), 0);
          const proporsiDP = Number(item.soldPrice) / totalHargaKeranjang;
          const itemDPAmount = dpAmount * proporsiDP;

          await tx.paymentInstallment.create({
            data: {
              salesTransactionId: salesTx.id,
              amount: itemDPAmount,
              paymentMethod: paymentMethod || "TUNAI",
              processedBy: item.cashierName
            }
          });
        }

        results.push({ updatedItem, salesTx });
      }

      return results;
    });

    // Log audit activity for each item checked out
    for (const res of result) {
      await logActivity({
        adminEmail: res.salesTx.cashierName,
        eventType: "Barang Terjual",
        productSku: res.salesTx.sku,
        productName: res.updatedItem.title,
        description: `Barang terjual via POS Kasir oleh ${res.salesTx.cashierName} dengan harga ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(res.salesTx.soldPrice))}.`,
      });
    }

    // Purge public catalog cache so sold items disappear instantly
    revalidatePath("/");
    for (const item of items) {
      revalidatePath(`/katalog/${item.itemId}`);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
