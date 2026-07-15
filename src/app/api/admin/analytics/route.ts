import { Status } from '@prisma/client';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

const getWibDateKey = (date: Date): string => {
  const wibTime = date.getTime() + (7 * 60 * 60 * 1000);
  const wibDate = new Date(wibTime);
  const yyyy = wibDate.getUTCFullYear();
  const mm = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(wibDate.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getWibFormattedDate = (date: Date): string => {
  const wibTime = date.getTime() + (7 * 60 * 60 * 1000);
  const wibDate = new Date(wibTime);
  const day = wibDate.getUTCDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  return `${day} ${monthNames[wibDate.getUTCMonth()]}`;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let start: Date | null = null;
    let end: Date | null = null;

    const hasDateRange = startDateParam && endDateParam && startDateParam !== "null" && endDateParam !== "null";

    if (hasDateRange) {
      start = parseWibStartOfDay(startDateParam);
      end = parseWibEndOfDay(endDateParam);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { success: false, message: "Format tanggal tidak valid." },
          { status: 400 }
        );
      }
    }

    // 1. Fetch current active stock items (Tersedia)
    const totalActive = await prisma.auctionItem.count({
      where: {
        status: Status.Tersedia,
        branchName: {
          contains: "Pasuruan",
          mode: "insensitive" as const
        }
      }
    });

    const dateFilter = start && end ? {
      transactionDate: {
        gte: start,
        lte: end
      }
    } : {};

    // 2. Fetch sales transactions in date range (excluding returned transactions)
    const sales = await prisma.salesTransaction.findMany({
      where: {
        branchName: {
          contains: "Pasuruan",
          mode: "insensitive" as const
        },
        isReturned: false,
        ...dateFilter
      },
      include: {
        item: {
          select: {
            id: true,
            parentId: true,
            title: true,
            category: true,
            nomorInduk: true,
          }
        }
      },
      orderBy: {
        transactionDate: "desc"
      }
    });

    // 3. Summarize metrics
    const totalSold = sales.length;
    const totalRevenue = sales.reduce((sum, tx) => sum + Number(tx.soldPrice), 0);

    // 4. Generate daily trend data (smooth, no missing dates)
    const dailyMap: { [key: string]: { date: string; formattedDate: string; revenue: number; count: number } } = {};
    let trendStart = start || new Date("2024-01-01T00:00:00.000Z");
    let trendEnd = end || new Date();

    if (!start && sales.length > 0) {
      const oldestTx = sales[sales.length - 1];
      trendStart = new Date(oldestTx.transactionDate);
      trendStart.setHours(0, 0, 0, 0);
    }

    const tempDate = new Date(trendStart);
    const endWibKey = getWibDateKey(trendEnd);
    let safetyCounter = 0;
    while (safetyCounter < 2000) {
      const key = getWibDateKey(tempDate);
      const formattedDate = getWibFormattedDate(tempDate);
      dailyMap[key] = { date: key, formattedDate, revenue: 0, count: 0 };
      
      if (key === endWibKey) {
        break;
      }
      
      tempDate.setUTCDate(tempDate.getUTCDate() + 1);
      safetyCounter++;
    }

    sales.forEach(tx => {
      const key = getWibDateKey(new Date(tx.transactionDate));
      if (dailyMap[key]) {
        dailyMap[key].revenue += Number(tx.soldPrice);
        dailyMap[key].count += 1;
      }
    });
    const dailySalesData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 5. Generate Category Pie Chart data (sales distribution)
    const categoriesMap: { [key: string]: number } = {};
    sales.forEach(tx => {
      const cat = tx.item?.category || "Lainnya";
      categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
    });
    const categoryData = Object.keys(categoriesMap).map(name => ({
      name,
      total: categoriesMap[name]
    }));

    // 6. Generate Cashier Bar Chart data (revenue performance)
    const cashierMap: { [key: string]: number } = {};
    sales.forEach(tx => {
      const cashier = tx.cashierName || "Kasir Utama";
      cashierMap[cashier] = (cashierMap[cashier] || 0) + Number(tx.soldPrice);
    });
    const cashierData = Object.keys(cashierMap).map(name => ({
      name,
      revenue: cashierMap[name]
    }));

    // Fetch variant-specific partial status tracking for the transactions
    const recentSalesSubset = sales.slice(0, 15);
    const parentIds = Array.from(
      new Set(
        recentSalesSubset
          .map(tx => tx.item?.parentId || tx.item?.id)
          .filter(Boolean) as number[]
      )
    );

    const groupItems = parentIds.length > 0 ? await prisma.auctionItem.findMany({
      where: {
        OR: [
          { id: { in: parentIds } },
          { parentId: { in: parentIds } }
        ]
      },
      select: {
        id: true,
        parentId: true,
        nomorInduk: true,
        status: true,
      }
    }) : [];

    const groupStatsMap: { [key: number]: { unsold: number, total: number } } = {};
    groupItems.forEach(item => {
      const groupId = item.parentId || item.id;
      if (!groupStatsMap[groupId]) {
        groupStatsMap[groupId] = { unsold: 0, total: 0 };
      }
      groupStatsMap[groupId].total += 1;
      if (item.status !== Status.Terjual) {
        groupStatsMap[groupId].unsold += 1;
      }
    });

    // 7. Format recent transactions
    const recentTransactions = recentSalesSubset.map(tx => {
      const parentId = tx.item?.parentId || tx.item?.id || null;
      const stats = parentId ? groupStatsMap[parentId] : null;
      const isPartiallySold = stats ? (stats.unsold > 0 && stats.total > 0) : false;
      return {
        id: tx.id,
        sku: tx.sku,
        itemTitle: tx.item?.title || "Item Terhapus",
        transactionDate: tx.transactionDate,
        cashierName: tx.cashierName,
        branchName: tx.branchName,
        soldPrice: Number(tx.soldPrice),
        isPartiallySold,
        unsoldChildrenCount: stats ? stats.unsold : 0,
        totalChildrenCount: stats ? stats.total : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalActive,
        totalSold,
        totalRevenue,
        dailySalesData,
        categoryData,
        cashierData,
        recentTransactions
      }
    });

  } catch (error: any) {
    console.error("Dashboard analytics API error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
