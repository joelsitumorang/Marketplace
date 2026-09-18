import { Status } from '@prisma/client';
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import AdminDashboardClient from "./AdminDashboardClient";

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

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 flex items-center gap-5 border border-slate-200">
            <div className="w-14 h-14 rounded-xl bg-slate-100"></div>
            <div>
              <div className="h-4 w-32 bg-slate-100 rounded mb-2"></div>
              <div className="h-6 w-24 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Chart Skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="h-6 w-48 bg-slate-200 rounded mb-6"></div>
        <div className="h-80 w-full bg-slate-50 rounded"></div>
      </div>
    </div>
  );
}

async function DashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Parallelize queries to eliminate sequential blocking and reduce TTFB latency
  const [
    totalActive, 
    sales,
    totalReturCount,
    returAmountAgg,
    pendingApprovalCount
  ] = await Promise.all([
    prisma.auctionItem.count({
      where: {
        status: Status.Tersedia,
        branchName: {
          contains: "Pasuruan",
          mode: "insensitive" as const
        }
      }
    }),
    prisma.salesTransaction.findMany({
      where: {
        branchName: {
          contains: "Pasuruan",
          mode: "insensitive" as const
        },
        isReturned: false
      },
      include: {
        item: {
          select: {
            title: true,
            category: true
          }
        }
      },
      orderBy: {
        transactionDate: "desc"
      }
    }),
    prisma.salesReturn.count({
      where: {
        status: "DISETUJUI",
        createdAt: {
          gte: startOfMonth
        }
      }
    }),
    prisma.salesReturn.aggregate({
      _sum: { refundAmount: true },
      where: {
        status: "DISETUJUI",
        createdAt: {
          gte: startOfMonth
        }
      }
    }),
    prisma.salesReturn.count({
      where: {
        status: "MENUNGGU_PERSETUJUAN"
      }
    })
  ]);

  const totalReturAmount = returAmountAgg._sum.refundAmount || 0;

  const totalSold = sales.length;
  const totalRevenue = sales.reduce((sum, tx) => sum + Number(tx.soldPrice), 0);

  // Determine trend start date dynamically (oldest transaction or fallback to 2024-01-01)
  let trendStart = new Date("2024-01-01T00:00:00.000Z");
  const trendEnd = new Date();

  if (sales.length > 0) {
    const oldestTx = sales[sales.length - 1];
    trendStart = new Date(oldestTx.transactionDate);
    trendStart.setHours(0, 0, 0, 0);
  }

  // Daily trend
  const dailyMap: { [key: string]: { date: string; formattedDate: string; revenue: number; count: number } } = {};
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

  // Category Pie Chart
  const categoriesMap: { [key: string]: number } = {};
  sales.forEach(tx => {
    const cat = tx.item?.category || "Lainnya";
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
  });
  const categoryData = Object.keys(categoriesMap).map(name => ({
    name,
    total: categoriesMap[name]
  }));

  // Cashier Bar Chart
  const cashierMap: { [key: string]: number } = {};
  sales.forEach(tx => {
    const cashier = tx.cashierName || "Kasir Utama";
    cashierMap[cashier] = (cashierMap[cashier] || 0) + Number(tx.soldPrice);
  });
  const cashierData = Object.keys(cashierMap).map(name => ({
    name,
    revenue: cashierMap[name]
  }));

  // Recent transactions
  const recentTransactions = sales.slice(0, 15).map(tx => ({
    id: tx.id,
    sku: tx.sku,
    itemTitle: tx.item?.title || "Item Terhapus",
    transactionDate: tx.transactionDate.toISOString(),
    cashierName: tx.cashierName,
    branchName: tx.branchName,
    soldPrice: Number(tx.soldPrice)
  }));

  const initialData = {
    totalActive,
    totalSold,
    totalRevenue,
    dailySalesData,
    categoryData,
    cashierData,
    recentTransactions,
    totalReturCount,
    totalReturAmount,
    pendingApprovalCount
  };

  return (
    <AdminDashboardClient 
      initialData={initialData}
      initialStartDate="null"
      initialEndDate="null"
    />
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Analytics</h1>
        <p className="text-slate-500 mt-1">Ringkasan performa katalog dan penjualan.</p>
      </div>

      <Suspense fallback={<AdminDashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
