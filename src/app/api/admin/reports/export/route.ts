import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ExcelJS from "exceljs";

function parseWibStartOfDay(dateStr: string): Date {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
  date.setUTCHours(date.getUTCHours() - 7);
  return date;
}

function parseWibEndOfDay(dateStr: string): Date {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const date = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  date.setUTCHours(date.getUTCHours() - 7);
  return date;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start") || searchParams.get("startDate");
    const endParam = searchParams.get("end") || searchParams.get("endDate");
    const branchParam = searchParams.get("branch");
    const statusParam = searchParams.get("status") || "ALL";

    const isSuperAdmin = session.role === "SUPERADMIN";

    // Enforce locked branch security on query
    let branchNameFilter = undefined;
    let exportBranchName = "";

    if (!isSuperAdmin) {
      branchNameFilter = session.asal_cabang;
      exportBranchName = session.asal_cabang;
    } else {
      if (branchParam && branchParam !== "all") {
        branchNameFilter = branchParam;
        exportBranchName = branchParam;
      } else {
        exportBranchName = "Semua_Cabang";
      }
    }

    let dateFilter = {};
    if (startParam && endParam && startParam !== "null" && endParam !== "null") {
      const start = parseWibStartOfDay(startParam);
      const end = parseWibEndOfDay(endParam);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        dateFilter = {
          transactionDate: {
            gte: start,
            lte: end,
          },
        };
      }
    }

    const where: any = {
      branchName: {
        contains: "Pasuruan",
        mode: "insensitive" as const,
      },
      ...dateFilter,
    };

    if (statusParam === "SUKSES") {
      where.isReturned = false;
    } else if (statusParam === "RETUR") {
      where.isReturned = true;
    }

    // Query sales transactions from database
    const transactions = await prisma.salesTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        item: { select: { title: true, category: true, hargaMasuk: true } },
      },
    });

    // Create ExcelJS workbook and sheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Penjualan");

    let titleText = "LAPORAN PENJUALAN - SEMUA TRANSAKSI";
    if (statusParam === "SUKSES") {
      titleText = "LAPORAN PENJUALAN - TRANSAKSI SUKSES";
    } else if (statusParam === "RETUR") {
      titleText = "LAPORAN PENJUALAN - TRANSAKSI RETUR";
    }

    // Write title in Row 1
    worksheet.mergeCells("A1:J1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = titleText;
    titleCell.font = { name: "Arial", size: 14, bold: true };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(1).height = 30;

    // Leave Row 2 empty
    worksheet.getRow(2).height = 15;

    // Define columns mapping and header values dynamically
    let columnsDef = [];
    let headerRowValues = [];

    if (statusParam === "RETUR") {
      columnsDef = [
        { key: "id", width: 15 },
        { key: "waktu", width: 25 },
        { key: "sku", width: 15 },
        { key: "namaBarang", width: 30 },
        { key: "kategori", width: 15 },
        { key: "alasanRetur", width: 30 },
        { key: "cabang", width: 20 },
        { key: "kasir", width: 20 },
        { key: "hargaMasuk", width: 20 },
        { key: "hargaTerjual", width: 20 },
        { key: "pendapatanBersih", width: 20 },
        { key: "statusTransaksi", width: 18 },
      ];
      headerRowValues = [
        "ID Transaksi",
        "Waktu Transaksi",
        "SKU",
        "Nama Barang",
        "Kategori",
        "Alasan Retur",
        "Cabang",
        "Kasir",
        "Harga Masuk",
        "Harga Terjual",
        "Pendapatan Bersih",
        "Status Transaksi"
      ];
    } else {
      columnsDef = [
        { key: "id", width: 15 },
        { key: "waktu", width: 25 },
        { key: "sku", width: 15 },
        { key: "namaBarang", width: 30 },
        { key: "kategori", width: 15 },
        { key: "cabang", width: 20 },
        { key: "kasir", width: 20 },
        { key: "hargaMasuk", width: 20 },
        { key: "hargaTerjual", width: 20 },
        { key: "pendapatanBersih", width: 20 },
        { key: "statusTransaksi", width: 18 },
        { key: "alasanRetur", width: 30 },
      ];
      headerRowValues = [
        "ID Transaksi",
        "Waktu Transaksi",
        "SKU",
        "Nama Barang",
        "Kategori",
        "Cabang",
        "Kasir",
        "Harga Masuk",
        "Harga Terjual",
        "Pendapatan Bersih",
        "Status Transaksi",
        "Alasan Retur"
      ];
    }

    worksheet.columns = columnsDef;

    // Write header row at Row 3
    const headerRow = worksheet.getRow(3);
    headerRow.values = headerRowValues;
    headerRow.height = 25;

    // Style the Header Row cells: Bright Yellow fill (#FFFF00) and bold text
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "000000" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF00" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "CCCCCC" } },
        bottom: { style: "thin", color: { argb: "CCCCCC" } },
        left: { style: "thin", color: { argb: "CCCCCC" } },
        right: { style: "thin", color: { argb: "CCCCCC" } },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    // Populate data rows starting at Row 4
    transactions.forEach((tx) => {
      const cost = tx.item?.hargaMasuk ? Number(tx.item.hargaMasuk) : 0;
      const sold = Number(tx.soldPrice);
      const profit = tx.isReturned ? 0 : (sold - cost);

      const newRow = worksheet.addRow({
        id: `TX-${String(tx.id).padStart(5, "0")}`,
        waktu: new Date(tx.transactionDate).toLocaleString("id-ID"),
        sku: tx.sku,
        namaBarang: tx.item?.title || "Item Terhapus",
        kategori: tx.item?.category || "Lainnya",
        cabang: tx.branchName,
        kasir: tx.cashierName,
        hargaMasuk: cost,
        hargaTerjual: sold,
        pendapatanBersih: profit,
        statusTransaksi: tx.isReturned ? "RETUR" : "SUKSES",
        alasanRetur: tx.isReturned ? (tx.returnReason || "Tidak ada alasan") : "-",
      });

      newRow.height = 20;

      // Apply custom background fill for RETUR status
      newRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "E5E7EB" } },
          bottom: { style: "thin", color: { argb: "E5E7EB" } },
          left: { style: "thin", color: { argb: "E5E7EB" } },
          right: { style: "thin", color: { argb: "E5E7EB" } },
        };
        if (statusParam === "RETUR") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFF0F0" },
          };
        }
      });
    });

    // Format the number format dynamically using column key
    worksheet.getColumn("hargaMasuk").numFmt = '#,##0';
    worksheet.getColumn("hargaTerjual").numFmt = '#,##0';
    worksheet.getColumn("pendapatanBersih").numFmt = '#,##0';

    // Calculate sums
    const totalOmset = transactions.reduce((sum, tx) => sum + (tx.isReturned ? 0 : Number(tx.soldPrice)), 0);
    const totalHargaMasuk = transactions.reduce((sum, tx) => sum + (tx.isReturned ? 0 : (tx.item?.hargaMasuk ? Number(tx.item.hargaMasuk) : 0)), 0);
    const totalRevenue = totalOmset - totalHargaMasuk; // Pendapatan Bersih

    // Append a dedicated Summary Row at the bottom
    const summaryRow = worksheet.addRow({
      kasir: "Total",
      hargaMasuk: totalHargaMasuk,
      hargaTerjual: totalOmset,
      pendapatanBersih: totalRevenue,
    });

    summaryRow.height = 22;

    // Style summary row to be bold
    summaryRow.getCell("kasir").font = { bold: true };
    summaryRow.getCell("hargaMasuk").font = { bold: true };
    summaryRow.getCell("hargaMasuk").numFmt = '#,##0';
    summaryRow.getCell("hargaTerjual").font = { bold: true };
    summaryRow.getCell("hargaTerjual").numFmt = '#,##0';
    summaryRow.getCell("pendapatanBersih").font = { bold: true };
    summaryRow.getCell("pendapatanBersih").numFmt = '#,##0';

    summaryRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "9CA3AF" } },
        bottom: { style: "double", color: { argb: "9CA3AF" } },
      };
    });

    // Compile workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const sanitizedBranch = exportBranchName.replace(/\s+/g, "_");
    const todayStr = new Date().toISOString().split("T")[0];

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=Laporan_MBG_${sanitizedBranch}_${todayStr}.xlsx`,
      },
    });

  } catch (error: any) {
    console.error("Failed to generate excel export:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat ekspor excel." },
      { status: 500 }
    );
  }
}
