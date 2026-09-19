"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Filter } from "lucide-react";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";

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

const formatBranchName = (name: string) => {
  if (name && name.toLowerCase().includes("pasuruan")) {
    return "Cabang Pasuruan - Sangar";
  }
  return name;
};

type Transaction = {
  id: number;
  sku: string;
  soldPrice: any;
  branchName: string;
  cashierName: string;
  transactionDate: string;
  item: {
    title: string;
    category: string;
    hargaMasuk?: any;
  };
  isReturned: boolean;
  returnReason?: string;
  status: string;
  dpDeadline?: string;
};

type Props = {
  initialTransactions: Transaction[];
  branchList: string[];
  currentBranch: string;
  currentStart: string;
  currentEnd: string;
  isSuperAdmin?: boolean;
};

export default function ReportClient({
  initialTransactions,
  branchList,
  currentBranch,
  currentStart,
  currentEnd,
  isSuperAdmin = false,
}: Props) {
  const router = useRouter();

  // Dynamic branch state (unlocked for superadmin)
  const [branch, setBranch] = useState(currentBranch);

  // Initialize dateRange from initial URL parameters
  const [dateRange, setDateRange] = useState<DateRange>({
    from: parseLocalDate(currentStart),
    to: parseLocalDate(currentEnd),
  });

  const [statusFilter, setStatusFilter] = useState("ALL");

  // Sync state with URL props when they change (e.g. on navigation or browser back/forward)
  useEffect(() => {
    setBranch(currentBranch);
    setDateRange({
      from: parseLocalDate(currentStart),
      to: parseLocalDate(currentEnd),
    });
  }, [currentBranch, currentStart, currentEnd]);

  const navigateWithFilters = (selectedBranch: string, selectedRange: DateRange) => {
    const params = new URLSearchParams();
    if (selectedBranch && selectedBranch !== "all") {
      params.set("branch", selectedBranch);
    }

    if (selectedRange.from) {
      const startStr = toLocalIsoDateString(selectedRange.from);
      const endStr = toLocalIsoDateString(selectedRange.to || selectedRange.from);
      params.set("start", startStr);
      params.set("end", endStr);
    }

    router.push(`/mbg-internal-portal/reports?${params.toString()}`);
  };

  const handleBranchChange = (newBranch: string) => {
    setBranch(newBranch);
    navigateWithFilters(newBranch, dateRange);
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    navigateWithFilters(branch, newRange);
  };

  const handleExportExcel = () => {
    console.log("handleExportExcel triggered!");
    const params = new URLSearchParams();
    if (branch) {
      params.set("branch", branch);
    }
    if (dateRange.from) {
      const startStr = toLocalIsoDateString(dateRange.from);
      const endStr = toLocalIsoDateString(dateRange.to || dateRange.from);
      params.set("startDate", startStr);
      params.set("endDate", endStr);
      // Keep "start" and "end" for backward compatibility
      params.set("start", startStr);
      params.set("end", endStr);
    }
    params.set("status", statusFilter);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/lelang';
    const url = `${basePath}/api/admin/reports/export?${params.toString()}`;
    console.log("Triggering download via anchor for: ", url);
    
    // Create a temporary anchor element to trigger the download and bypass any client-side routing
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatIDR = (val: any) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
      Number(val)
    );
  };

  // Exclude returned transaction prices from the total revenue
  const totalOmset = initialTransactions.reduce((acc, tx) => acc + (tx.isReturned ? 0 : Number(tx.soldPrice)), 0);
  const totalHargaMasuk = initialTransactions.reduce((acc, tx) => acc + (tx.isReturned ? 0 : (tx.item?.hargaMasuk ? Number(tx.item.hargaMasuk) : 0)), 0);
  const totalRevenue = totalOmset - totalHargaMasuk; // Pendapatan Bersih
  const activeTxCount = initialTransactions.filter(tx => !tx.isReturned).length;
  const returnedTxCount = initialTransactions.filter(tx => tx.isReturned).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Laporan Penjualan</h1>
          <p className="text-slate-600 mt-1">Rekapitulasi data transaksi dari cabang Anda.</p>
        </div>
      </div>

      {/* Ultra-Compact Filter Row */}
      <div className="flex items-center gap-1.5 w-full bg-white p-2 rounded-xl border border-gray-150 shadow-sm">
        <div className="hidden md:flex items-center gap-2 font-semibold text-slate-700 mr-2 flex-shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          FILTER LAPORAN
        </div>
        <div className="hidden">
          <label className="block text-xs text-slate-600 mb-1 font-medium">Cabang</label>
          <select
            disabled={!isSuperAdmin}
            value={branch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className={`${
              !isSuperAdmin 
                ? "bg-slate-50 text-slate-500 cursor-not-allowed" 
                : "bg-white text-slate-800 cursor-pointer"
            } border border-slate-200 rounded-md px-3 py-2 text-sm outline-none w-48 shadow-sm font-medium`}
          >
            {isSuperAdmin && <option value="all">Semua Cabang</option>}
            {branchList.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        
        {/* Date Range Picker Wrapper */}
        <div className="flex-1 min-w-0 md:flex-initial md:w-64">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} placeholder="Semua Waktu" />
        </div>

        {/* Transaction Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-[28%] md:w-44 shrink-0 text-xs md:text-sm px-1.5 md:px-3 py-2 border border-slate-200 rounded-lg bg-gray-50 md:bg-white text-slate-800 font-semibold md:font-medium outline-none cursor-pointer shadow-sm hover:border-slate-300 transition-all min-h-[38px] md:min-h-[44px]"
        >
          <option value="ALL">Semua</option>
          <option value="SUKSES">Sukses</option>
          <option value="RETUR">Retur</option>
        </select>

        {/* Excel Export Button */}
        <button
          onClick={handleExportExcel}
          disabled={initialTransactions.length === 0}
          className="bg-status-tersedia hover:bg-status-tersedia/90 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 md:px-4 md:py-2.5 rounded-lg shrink-0 flex items-center justify-center transition-all active:scale-95 shadow-sm font-bold min-h-[38px] md:min-h-[44px]"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline ml-1.5 text-xs md:text-sm font-semibold">Export Excel</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {/* PENDAPATAN BERSIH */}
        <div className="bg-white rounded-2xl p-3.5 md:p-6 border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Pendapatan Bersih</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900">{formatIDR(totalRevenue)}</h3>
          </div>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-green-50 flex items-center justify-center border border-green-100 flex-shrink-0">
            <span className="text-lg md:text-2xl">💰</span>
          </div>
        </div>

        {/* TOTAL OMSET */}
        <div className="bg-white rounded-2xl p-3.5 md:p-6 border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Total Omset</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900">{formatIDR(totalOmset)}</h3>
          </div>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 flex-shrink-0">
            <span className="text-lg md:text-2xl">📈</span>
          </div>
        </div>

        {/* TOTAL TRANSAKSI */}
        <div className="bg-white rounded-2xl p-3.5 md:p-6 border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Total Transaksi</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900">{activeTxCount}</h3>
          </div>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-purple-50 flex items-center justify-center border border-purple-100 flex-shrink-0">
            <span className="text-lg md:text-2xl">🛍️</span>
          </div>
        </div>

        {/* TRANSAKSI RETUR */}
        <div className="bg-white rounded-2xl p-3.5 md:p-6 border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Transaksi Retur</p>
            <h3 className="text-xl md:text-2xl font-black text-slate-900">{returnedTxCount}</h3>
          </div>
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-red-50 flex items-center justify-center border border-red-100 flex-shrink-0">
            <span className="text-lg md:text-2xl">🔄</span>
          </div>
        </div>
      </div>

      {/* Desktop Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Tgl Transaksi</th>
                <th className="px-6 py-4 font-semibold">Barang</th>
                <th className="px-6 py-4 font-semibold">Cabang & Kasir</th>
                <th className="px-6 py-4 font-semibold text-right">Harga Masuk</th>
                <th className="px-6 py-4 font-semibold text-right">Harga Jual</th>
                <th className="px-6 py-4 font-semibold text-right">Pendapatan Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialTransactions.map((tx) => {
                const cost = tx.item?.hargaMasuk ? Number(tx.item.hargaMasuk) : 0;
                const sold = Number(tx.soldPrice);
                const profit = tx.isReturned ? 0 : (sold - cost);
                return (
                  <tr key={tx.id} className={`hover:bg-slate-50 transition-colors bg-white ${tx.isReturned ? "opacity-75" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">
                        {new Date(tx.transactionDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(tx.transactionDate).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{tx.sku}</span>
                        {tx.isReturned && (
                          <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-black bg-rose-100 text-rose-600 border border-rose-200">
                            RETUR
                          </span>
                        )}
                        {!tx.isReturned && tx.status === "DP" && (
                          <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-black bg-orange-100 text-orange-600 border border-orange-200">
                            DP
                          </span>
                        )}
                        {!tx.isReturned && tx.status === "DP" && tx.dpDeadline && new Date(tx.dpDeadline) < new Date() && (
                          <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-black bg-red-100 text-red-600 border border-red-200 animate-pulse">
                            JATUH TEMPO
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600 text-xs truncate max-w-[200px]" title={tx.item?.title || "Item Terhapus"}>
                        {tx.item?.title || "Item Terhapus"}
                      </div>
                      {tx.isReturned && tx.returnReason && (
                        <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-0.5 mt-1 inline-block max-w-xs truncate" title={tx.returnReason}>
                          Alasan: {tx.returnReason}
                        </div>
                      )}
                      {!tx.isReturned && tx.status === "DP" && tx.dpDeadline && (
                        <div className="text-[10px] text-orange-600 mt-1">
                          Tempo: {new Date(tx.dpDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{formatBranchName(tx.branchName)}</div>
                      <div className="text-xs text-slate-500">Kasir: {tx.cashierName}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                      {cost > 0 ? formatIDR(cost) : "-"}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.isReturned ? "line-through text-slate-400" : "text-slate-900"}`}>
                      {formatIDR(sold)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.isReturned ? "text-slate-400" : profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.isReturned ? "-" : formatIDR(profit)}
                    </td>
                  </tr>
                );
              })}
              {initialTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 bg-white">
                    Tidak ada data transaksi pada rentang filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (visible only on mobile) */}
      <div className="block md:hidden space-y-3">
        {initialTransactions.map((tx) => (
          <div key={tx.id} className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 ${tx.isReturned ? "opacity-75" : ""}`}>
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600 inline-block">
                    {tx.sku}
                  </span>
                  {tx.isReturned && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-black bg-rose-100 text-rose-600 border border-rose-200">
                      RETUR
                    </span>
                  )}
                  {!tx.isReturned && tx.status === "DP" && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-black bg-orange-100 text-orange-600 border border-orange-200">
                      DP
                    </span>
                  )}
                  {!tx.isReturned && tx.status === "DP" && tx.dpDeadline && new Date(tx.dpDeadline) < new Date() && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-black bg-red-100 text-red-600 border border-red-200 animate-pulse">
                      JATUH TEMPO
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight">{tx.item?.title || "Item Terhapus"}</h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date(tx.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • {new Date(tx.transactionDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {tx.isReturned && tx.returnReason && (
                  <div className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                    Alasan: {tx.returnReason}
                  </div>
                )}
              </div>
              <div className="text-right whitespace-nowrap flex flex-col items-end">
                <div className={`font-bold text-sm ${tx.isReturned ? "line-through text-slate-400" : "text-slate-900"}`}>{formatIDR(tx.soldPrice)}</div>
                {!tx.isReturned && (
                  <>
                    <div className="text-[10px] text-slate-500 mt-0.5">Masuk: {tx.item?.hargaMasuk ? formatIDR(tx.item.hargaMasuk) : "-"}</div>
                    <div className={`text-[10px] font-bold ${(Number(tx.soldPrice) - (tx.item?.hargaMasuk ? Number(tx.item.hargaMasuk) : 0)) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      Bersih: {formatIDR(Number(tx.soldPrice) - (tx.item?.hargaMasuk ? Number(tx.item.hargaMasuk) : 0))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-50 text-[11px] flex justify-between text-slate-600">
              <span className="truncate pr-2">{formatBranchName(tx.branchName)}</span>
              <span className="font-medium whitespace-nowrap shrink-0">Kasir: {tx.cashierName}</span>
            </div>
          </div>
        ))}
        {initialTransactions.length === 0 && (
          <div className="py-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
            <p className="text-sm">Tidak ada transaksi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
