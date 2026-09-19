import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Status } from "@prisma/client";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const items = await prisma.auctionItem.findMany({
      where: {
        status: Status.Tersedia
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Barang Tersedia");

    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "SKU", key: "sku", width: 20 },
      { header: "Nama Barang", key: "title", width: 30 },
      { header: "Kategori", key: "category", width: 20 },
      { header: "Kondisi", key: "kondisi", width: 15 },
      { header: "Cabang", key: "branchName", width: 20 },
      { header: "Harga Jual", key: "price", width: 20 },
      { header: "Harga Masuk", key: "hargaMasuk", width: 20 },
      { header: "Deskripsi", key: "description", width: 50 },
      { header: "Minus", key: "defects", width: 30 },
      { header: "Dilihat", key: "viewCount", width: 10 },
      { header: "Tampil di Marketplace", key: "isMarketplaceVisible", width: 25 },
      { header: "Tanggal Dibuat", key: "createdAt", width: 25 },
    ];

    items.forEach((item) => {
      sheet.addRow({
        id: item.id,
        sku: item.sku,
        title: item.title,
        category: item.category,
        kondisi: item.kondisi,
        branchName: item.branchName,
        price: Number(item.price),
        hargaMasuk: item.hargaMasuk ? Number(item.hargaMasuk) : "",
        description: item.description,
        defects: item.defects,
        viewCount: item.viewCount,
        isMarketplaceVisible: item.isMarketplaceVisible ? "Ya" : "Tidak",
        createdAt: item.createdAt.toISOString(),
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Laporan_Barang_Tersedia.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
