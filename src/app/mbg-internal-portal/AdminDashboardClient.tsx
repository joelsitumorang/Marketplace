"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { Package, TrendingUp, DollarSign, Loader2, Calendar, RotateCcw } from "lucide-react";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";
import Link from "next/link";

const toLocalIsoDateString = (date: Date | null): string => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === "null") return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

type AnalyticsData = {
  totalActive: number;
  totalSold: number;
  totalRevenue: number;
  dailySalesData: { date: string; formattedDate: string; revenue: number; count: number }[];
  categoryData: { name: string; total: number }[];
  cashierData: { name: string; revenue: number }[];
  recentTransactions: {
    id: number;
    sku: string;
    itemTitle: string;
    transactionDate: string;
    cashierName: string;
    branchName: string;
    soldPrice: number;
  }[];
  totalReturCount: number;
  totalReturAmount: number;
  pendingApprovalCount: number;
  topViewedItems?: {
    id: number;
    sku: string;
    title: string;
    viewCount: number;
    branchName: string;
  }[];
};

type Props = {
  initialData: AnalyticsData;
  initialStartDate: string;
  initialEndDate: string;
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#3b82f6", "#06b6d4"];

export default function AdminDashboardClient({ initialData, initialStartDate, initialEndDate }: Props) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);

  // Initialize date range from props
  const [dateRange, setDateRange] = useState<DateRange>({
    from: parseLocalDate(initialStartDate),
    to: parseLocalDate(initialEndDate),
  });

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const formatDateString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  useEffect(() => {
    // Avoid double fetching initial data on mount
    const startIso = toLocalIsoDateString(dateRange.from);
    const endIso = toLocalIsoDateString(dateRange.to || dateRange.from);
    const initStartIso = initialStartDate && initialStartDate !== "null" ? initialStartDate.split("T")[0] : null;
    const initEndIso = initialEndDate && initialEndDate !== "null" ? initialEndDate.split("T")[0] : null;

    if (startIso === initStartIso && endIso === initEndIso && data === initialData) {
      return;
    }

    let active = true;

    async function fetchAnalytics() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (startIso) queryParams.set("startDate", startIso);
        if (endIso) queryParams.set("endDate", endIso);

        const res = await fetch(`/api/admin/analytics?${queryParams.toString()}`);
        const result = await res.json();
        if (active && result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Gagal memuat analitik dashboard:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, [dateRange]);

  const statCards = [
    { title: "Item Aktif Tersedia", value: data.totalActive, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Item Terjual (Periode)", value: data.totalSold, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { title: "Total Pendapatan (Periode)", value: formatIDR(data.totalRevenue), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Retur Bulan Ini", value: `${data.totalReturCount} transaksi`, icon: RotateCcw, color: "text-rose-600", bg: "bg-rose-50", subtitle: formatIDR(data.totalReturAmount) },
  ];

  return (
    <div className="space-y-6 pb-12 relative">
      
      {/* Fase 1: Mobile-First Header Background & Floating Profile */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-brand-600 to-red-500 -z-10 -mx-4 md:-mx-8 -mt-4 md:-mt-8 rounded-b-3xl"></div>
      
      <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4 mx-2 sm:mx-0 mt-4 md:mt-2 flex items-center gap-4">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
           <Package className="w-7 h-7 text-slate-400" />
        </div>
        <div className="flex-1">
           <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">Admin Pusat MBG</h2>
           <p className="text-xs text-slate-500 mt-0.5">Portal Manajemen Cabang</p>
        </div>
        <a href="/lelang" target="_blank" className="px-3 py-1.5 border-2 border-brand-500 text-brand-600 text-xs font-bold rounded-full hover:bg-brand-50 transition-colors whitespace-nowrap">
          Kunjungi Toko
        </a>
      </div>

      {/* Fase 2: Actionable Status Pesanan (4 Columns Shopee-Style) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mx-2 sm:mx-0 flex justify-between text-center mt-2 mb-4">
        <div className="flex flex-col items-center flex-1">
           <span className="text-xl md:text-2xl font-bold text-slate-800">{data.totalActive}</span>
           <span className="text-[10px] md:text-xs text-slate-500 leading-tight mt-1">Stok<br/>Tersedia</span>
        </div>
        <div className="w-px bg-slate-100"></div>
        <div className="flex flex-col items-center flex-1">
           <span className="text-xl md:text-2xl font-bold text-slate-800">{data.pendingApprovalCount || 0}</span>
           <span className="text-[10px] md:text-xs text-slate-500 leading-tight mt-1">Perlu<br/>Persetujuan</span>
        </div>
        <div className="w-px bg-slate-100"></div>
        <div className="flex flex-col items-center flex-1">
           <span className="text-xl md:text-2xl font-bold text-slate-800">{data.totalReturCount}</span>
           <span className="text-[10px] md:text-xs text-slate-500 leading-tight mt-1">Retur<br/>Bulan Ini</span>
        </div>
        <div className="w-px bg-slate-100"></div>
        <div className="flex flex-col items-center flex-1">
           <span className="text-xl md:text-2xl font-bold text-slate-800">{data.totalSold}</span>
           <span className="text-[10px] md:text-xs text-slate-500 leading-tight mt-1">Pesanan<br/>Selesai</span>
        </div>
      </div>

      {/* Fase 3: Menu Navigasi Grid (Icon Horizontal) */}
      <div className="mx-2 sm:mx-0 overflow-x-auto hide-scrollbar mb-6">
        <div className="flex gap-4 md:grid md:grid-cols-5 min-w-max md:min-w-0 pb-2">
          
          <Link href="/mbg-internal-portal/kasir" className="flex flex-col items-center gap-2 w-16 md:w-auto hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 bg-orange-100 text-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-slate-700 text-center leading-tight">Kasir<br/>POS</span>
          </Link>

          <Link href="/mbg-internal-portal/items" className="flex flex-col items-center gap-2 w-16 md:w-auto hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-slate-700 text-center leading-tight">Produk</span>
          </Link>

          <Link href="/mbg-internal-portal/retur" className="flex flex-col items-center gap-2 w-16 md:w-auto hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-slate-700 text-center leading-tight">Retur</span>
          </Link>

          <Link href="/mbg-internal-portal/reports" className="flex flex-col items-center gap-2 w-16 md:w-auto hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-slate-700 text-center leading-tight">Laporan</span>
          </Link>

          <Link href="/mbg-internal-portal/settings" className="flex flex-col items-center gap-2 w-16 md:w-auto hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-[10px] md:text-xs font-semibold text-slate-700 text-center leading-tight">Pengaturan</span>
          </Link>

        </div>
        <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mt-2 md:hidden"></div>
      </div>

      {/* Fase 4: Pengumuman / Banner Bawah */}
      <div className="mx-2 sm:mx-0 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-800">Pengumuman Internal</h3>
          <span className="text-xs text-brand-600 font-semibold cursor-pointer">Lainnya {'>'}</span>
        </div>
        <div className="bg-brand-600 rounded-xl p-4 text-white relative overflow-hidden flex items-center justify-between shadow-sm">
          <div className="z-10">
            <h4 className="font-bold text-sm mb-1">SOP Penerimaan Retur 2026</h4>
            <p className="text-xs opacity-90 max-w-[200px] mb-3">Pastikan barang difoto sebelum diproses ke gudang pusat.</p>
            <button className="bg-white text-brand-600 text-[10px] font-black px-3 py-1.5 rounded uppercase tracking-wider hover:bg-brand-50 transition-colors">CEK SELENGKAPNYA</button>
          </div>
          <div className="absolute right-[-20px] top-[-20px] opacity-20">
            <Package className="w-32 h-32" />
          </div>
        </div>
      </div>

      {/* Date Range Picker Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <Calendar className="w-5 h-5 text-slate-400" />
          Pilih Filter Rentang Waktu:
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-2xl">
          <div className="flex flex-col items-center gap-3 bg-white p-5 rounded-2xl shadow-lg border border-slate-100">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Memperbarui data analitik...</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${stat.bg} shrink-0`}>
              <stat.icon className={`w-5 h-5 md:w-7 md:h-7 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[11px] md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1 leading-tight">{stat.title}</p>
              <h3 className="text-lg md:text-2xl font-black text-slate-900 leading-none">{stat.value}</h3>
              {stat.subtitle && (
                <p className="text-[11px] md:text-sm font-semibold text-slate-600 mt-1">{stat.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Product Sales Chart Block */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Grafik Perkembangan Penjualan & Pendapatan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tren harian nilai transaksi di seluruh cabang.</p>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="w-full">
            {data.dailySalesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="formattedDate" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `Rp ${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                    formatter={(value: any, name: any) => {
                      if (name === "revenue") return [formatIDR(value), "Pendapatan"];
                      if (name === "count") return [value, "Jumlah Transaksi"];
                      return [value, name];
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" name="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-[300px] flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data tren penjualan pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Live Transactions List Table directly below Graph */}
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
            <h4 className="text-sm font-bold text-slate-800">List Transaksi Terbaru (Periode Terpilih)</h4>
            <span className="text-xs text-slate-500 font-medium">Menampilkan maks. 15 transaksi</span>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">ID Transaksi</th>
                  <th className="px-6 py-3.5">Tanggal/Waktu</th>
                  <th className="px-6 py-3.5">Kasir</th>
                  <th className="px-6 py-3.5">Cabang</th>
                  <th className="px-6 py-3.5">Detail Barang</th>
                  <th className="px-6 py-3.5 text-right">Total Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">TX-{String(tx.id).padStart(5, "0")}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDateString(tx.transactionDate)}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{tx.cashierName}</td>
                    <td className="px-6 py-4 text-slate-600">{tx.branchName}</td>
                    <td className="px-6 py-4 text-slate-700 max-w-[200px] truncate">
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600 mr-1.5">{tx.sku}</span>
                      {tx.itemTitle}
                      {(tx as any).isPartiallySold && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider animate-pulse">
                          ⚠️ Belum Lengkap (Kurang {(tx as any).unsoldChildrenCount}/{(tx as any).totalChildrenCount})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatIDR(tx.soldPrice)}</td>
                  </tr>
                ))}
                {data.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Belum ada transaksi terekam dalam rentang tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Recent Transactions List */}
          <div className="block md:hidden bg-slate-50 p-3 space-y-3">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600 mb-1 inline-block">
                      TX-{String(tx.id).padStart(5, "0")} • {tx.sku}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{tx.itemTitle}</h3>
                    {(tx as any).isPartiallySold && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                          ⚠️ Belum Lengkap (Kurang {(tx as any).unsoldChildrenCount}/{(tx as any).totalChildrenCount})
                        </span>
                      </div>
                    )}
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {formatDateString(tx.transactionDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-green-600 text-xs">{formatIDR(tx.soldPrice)}</div>
                  </div>
                </div>
              </div>
            ))}
            {data.recentTransactions.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                Belum ada transaksi terekam.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Sub-Charts Grid (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart: Category Sales Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Distribusi Kategori Penjualan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Proporsi item terjual berdasarkan kategori produk.</p>
          </div>
          <div className="w-full my-4 flex items-center justify-center">
            {data.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="total"
                  >
                    {data.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                    formatter={(value) => [`${value} item`, "Jumlah"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" fontSize={11} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm h-[260px] flex items-center justify-center">Tidak ada data distribusi kategori.</div>
            )}
          </div>
        </div>

        {/* Bar Chart: Cashier Revenue Performance */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Performa Pendapatan per Kasir</h3>
            <p className="text-xs text-slate-500 mt-0.5">Total omzet penjualan yang dicatat oleh masing-masing kasir.</p>
          </div>
          <div className="w-full my-4">
            {data.cashierData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.cashierData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `Rp ${val / 1000000}jt`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                    formatter={(value: any) => [formatIDR(value), "Omzet"]}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {data.cashierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-[260px] flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data performa kasir.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Top Viewed Items Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-8">
        <div>
          <h3 className="text-base font-bold text-slate-900">Barang Paling Banyak Dilihat</h3>
          <p className="text-xs text-slate-500 mt-0.5">Top 5 barang yang paling sering dibuka di katalog publik (all time).</p>
        </div>
        <div className="w-full mt-4 overflow-x-auto">
          {data.topViewedItems && data.topViewedItems.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs font-semibold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Barang & SKU</th>
                  <th className="px-4 py-3">Cabang</th>
                  <th className="px-4 py-3 text-right">View Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topViewedItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{item.branchName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {item.viewCount} views
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-slate-400 text-sm h-32 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Belum ada data tampilan barang.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
