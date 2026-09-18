"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";

type LogEntry = {
  id: number;
  createdAt: string;
  adminEmail: string;
  eventType: string;
  productSku: string;
  productName: string;
  description: string;
};

const LOGS_PER_PAGE = 20;

export default function LogAktivitasPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * LOGS_PER_PAGE;
      const params = new URLSearchParams({
        limit: String(LOGS_PER_PAGE),
        skip: String(skip),
      });
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      if (eventTypeFilter && eventTypeFilter !== "all") {
        params.set("eventType", eventTypeFilter);
      }

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const resData = await res.json();

      if (res.ok && resData.success) {
        setLogs(resData.data);
        setTotal(resData.total);
      } else {
        setError(resData.message || "Gagal memuat log aktivitas.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, eventTypeFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setEventTypeFilter("all");
    setCurrentPage(1);
    // Triggering update immediately
    setTimeout(() => fetchLogs(), 0);
  };

  const totalPages = Math.max(1, Math.ceil(total / LOGS_PER_PAGE));

  const EventTypeBadge = ({ type }: { type: string }) => {
    let classes = "";
    switch (type) {
      case "Barang Masuk":
        classes = "bg-blue-50 text-blue-700 border-blue-200";
        break;
      case "Barang Terjual":
        classes = "bg-slate-700 text-white border-slate-800";
        break;
      case "Barang Dipersiapkan / Dipesan":
        classes = "bg-amber-50 text-amber-700 border-amber-200";
        break;
      case "Barang Retur":
        classes = "bg-rose-50 text-rose-700 border-rose-200";
        break;
      case "Retur Diajukan":
        classes = "bg-orange-50 text-orange-700 border-orange-200";
        break;
      case "Retur Otomatis Disetujui":
        classes = "bg-teal-50 text-teal-700 border-teal-200";
        break;
      case "Retur Disetujui SUPERADMIN":
        classes = "bg-emerald-50 text-emerald-700 border-emerald-200";
        break;
      case "Retur Ditolak":
        classes = "bg-red-50 text-red-700 border-red-200";
        break;
      default:
        classes = "bg-slate-100 text-slate-700 border-slate-200";
    }

    return (
      <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border ${classes}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-8 h-8 text-brand-600" />
            Log Aktivitas
          </h1>
          <p className="text-slate-500 mt-1">Audit trail riwayat mutasi barang dan tindakan sistem oleh administrator.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm font-semibold text-sm min-h-[40px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU, Nama Barang, Email Admin, atau Deskripsi..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm min-h-[44px]"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-white text-sm min-h-[44px]"
            >
              <option value="all">Semua Tipe Aktivitas</option>
              <option value="Barang Masuk">Barang Masuk (Create)</option>
              <option value="Barang Terjual">Barang Terjual (Sold)</option>
              <option value="Barang Dipersiapkan / Dipesan">Barang Dipersiapkan / Dipesan (Reserved)</option>
              <option value="Barang Retur">Barang Retur (Return)</option>
              <option value="Retur Diajukan">Retur Diajukan</option>
              <option value="Retur Otomatis Disetujui">Retur Otomatis Disetujui</option>
              <option value="Retur Disetujui SUPERADMIN">Retur Disetujui SUPERADMIN</option>
              <option value="Retur Ditolak">Retur Ditolak</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 md:flex-none px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md shadow-brand-500/10 transition-all text-sm min-h-[44px] flex items-center justify-center"
            >
              Cari
            </button>
            {(searchQuery.trim() || eventTypeFilter !== "all") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors text-sm font-semibold min-h-[44px]"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Admin/Email</th>
                <th className="px-6 py-4">Tipe Aktivitas</th>
                <th className="px-6 py-4">Barang / SKU</th>
                <th className="px-6 py-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-white">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Memuat log sistem...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-white">
                    <div className="py-6 flex flex-col items-center justify-center">
                      <span className="text-3xl mb-2">📜</span>
                      <p className="text-sm font-semibold text-slate-500">Belum ada log sistem terekam.</p>
                      <p className="text-xs text-slate-400 mt-1">Sesuaikan kata kunci pencarian atau filter tipe aktivitas Anda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {log.adminEmail}
                    </td>
                    <td className="px-6 py-4">
                      <EventTypeBadge type={log.eventType} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-slate-900 font-bold text-xs">{log.productSku}</div>
                      <div className="text-slate-500 text-xs truncate max-w-[200px]" title={log.productName}>
                        {log.productName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-sm truncate whitespace-normal text-xs leading-relaxed" title={log.description}>
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar */}
      {!loading && logs.length > 0 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">
            Halaman <span className="text-slate-900 font-bold">{currentPage}</span> dari{" "}
            <span className="text-slate-900 font-bold">{totalPages}</span>
            <span className="hidden sm:inline text-slate-400 ml-2">
              (Total {total} log)
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[40px] justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[40px] justify-center"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
