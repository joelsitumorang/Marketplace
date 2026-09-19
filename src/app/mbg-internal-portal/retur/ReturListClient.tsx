"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

const RETURN_REASON_LABELS: Record<string, string> = {
  TIDAK_SESUAI_DESKRIPSI: "Tidak Sesuai Deskripsi",
  RUSAK_SAAT_DITERIMA: "Rusak Saat Diterima",
  KELENGKAPAN_KURANG: "Kelengkapan Kurang",
  SALAH_INPUT_KASIR: "Salah Input Kasir",
  BERUBAH_PIKIRAN: "Berubah Pikiran",
  LAINNYA: "Lainnya",
};

const RETURN_CONDITION_LABELS: Record<string, string> = {
  LAYAK_JUAL_ULANG: "Layak Jual Ulang",
  PERLU_PERBAIKAN: "Perlu Perbaikan",
  RUSAK_TOTAL: "Rusak Total",
};

const RETURN_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  MENUNGGU_PERSETUJUAN: { label: "Menunggu Persetujuan", className: "bg-amber-50 text-amber-700 border-amber-200" },
  DISETUJUI: { label: "Disetujui", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DITOLAK: { label: "Ditolak", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

interface ReturListClientProps {
  isSuperAdmin: boolean;
  userBranch: string;
}

export default function ReturListClient({ isSuperAdmin, userBranch }: ReturListClientProps) {
  const [activeTab, setActiveTab] = useState<"SEMUA" | "MENUNGGU_PERSETUJUAN">("SEMUA");
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("SEMUA");
  const [reasonFilter, setReasonFilter] = useState("SEMUA");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  // Approval Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<any>(null);
  const [approvalAction, setApprovalAction] = useState<"DISETUJUI" | "DITOLAK" | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalError, setApprovalError] = useState("");

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      let queryParams = `?limit=${limit}&skip=${skip}`;
      
      if (activeTab === "MENUNGGU_PERSETUJUAN") {
        queryParams += `&status=MENUNGGU_PERSETUJUAN`;
      } else if (statusFilter !== "SEMUA") {
        queryParams += `&status=${statusFilter}`;
      }
      
      if (reasonFilter !== "SEMUA") {
        queryParams += `&reason=${reasonFilter}`;
      }
      if (startDate) queryParams += `&startDate=${startDate}`;
      if (endDate) queryParams += `&endDate=${endDate}`;

      const res = await fetch(`/api/admin/retur${queryParams}`);
      const data = await res.json();
      
      if (data.success) {
        setReturns(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch returns:", error);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, statusFilter, reasonFilter, startDate, endDate]);

  const fetchPendingCount = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch(`/api/admin/retur?status=MENUNGGU_PERSETUJUAN&limit=1`);
      const data = await res.json();
      if (data.success) {
        setPendingCount(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch pending count", error);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount, returns]); // Refresh count when returns change

  const formatCurrency = (amount: number | string) => {
    return Number(amount)?.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  };

  const handleApproveReject = async () => {
    if (!approvalTarget || !approvalAction || !approvalNote.trim()) {
      setApprovalError("Catatan wajib diisi.");
      return;
    }

    setIsSubmittingApproval(true);
    setApprovalError("");
    try {
      const res = await fetch(`/api/admin/retur/${approvalTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approvalAction,
          approvalNote: approvalNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowApprovalModal(false);
        setApprovalNote("");
        setApprovalTarget(null);
        setApprovalAction(null);
        fetchReturns();
        fetchPendingCount();
      } else {
        setApprovalError(data.message || "Gagal memproses persetujuan.");
      }
    } catch (error) {
      setApprovalError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const openApprovalModal = (retur: any, action: "DISETUJUI" | "DITOLAK") => {
    setApprovalTarget(retur);
    setApprovalAction(action);
    setApprovalNote("");
    setApprovalError("");
    setShowApprovalModal(true);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Retur</h1>
          <p className="text-sm text-slate-500">Kelola pengajuan retur barang dari pelanggan.</p>
        </div>
        <Link 
          href="/mbg-internal-portal/retur/new" 
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Ajukan Retur
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        {isSuperAdmin && (
          <div className="flex border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => { setActiveTab("SEMUA"); setPage(1); }}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "SEMUA" 
                  ? "border-brand-600 text-brand-700" 
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Semua Retur
            </button>
            <button
              onClick={() => { setActiveTab("MENUNGGU_PERSETUJUAN"); setPage(1); }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "MENUNGGU_PERSETUJUAN" 
                  ? "border-brand-600 text-brand-700" 
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Menunggu Persetujuan
              {pendingCount > 0 && (
                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-4">
          <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium text-sm">
            <Filter className="w-4 h-4" /> Filter
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeTab !== "MENUNGGU_PERSETUJUAN" && (
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="MENUNGGU_PERSETUJUAN">Menunggu Persetujuan</option>
                <option value="DISETUJUI">Disetujui</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            )}
            
            <select
              value={reasonFilter}
              onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
            >
              <option value="SEMUA">Semua Alasan</option>
              {Object.entries(RETURN_REASON_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
            />
            
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
              />
              <button
                onClick={() => fetchReturns()}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-300"
                title="Refresh"
              >
                <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Data List */}
        <div className="p-0 md:p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat data...</div>
          ) : returns.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <Search className="w-12 h-12 mb-3 text-slate-300" />
              <p>Tidak ada data retur yang ditemukan.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <th className="px-6 py-4 font-semibold">Tanggal</th>
                      <th className="px-6 py-4 font-semibold">SKU / Barang</th>
                      <th className="px-6 py-4 font-semibold">Alasan & Kondisi</th>
                      <th className="px-6 py-4 font-semibold">Nominal (Rp)</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Pemroses</th>
                      {isSuperAdmin && activeTab === "MENUNGGU_PERSETUJUAN" && (
                        <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returns.map((retur) => (
                      <tr key={retur.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(retur.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-mono text-slate-500 text-xs">{retur.salesTransaction?.sku}</div>
                          <div className="font-medium text-slate-900 line-clamp-2">{retur.auctionItem?.title || "Item Tidak Diketahui"}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-slate-900 font-medium">{RETURN_REASON_LABELS[retur.reason] || retur.reason}</div>
                          <div className="text-slate-500 text-xs mt-0.5">{RETURN_CONDITION_LABELS[retur.condition] || retur.condition}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {formatCurrency(retur.refundAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${RETURN_STATUS_CONFIG[retur.status]?.className || "bg-slate-100"}`}>
                            {RETURN_STATUS_CONFIG[retur.status]?.label || retur.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-slate-900">{retur.salesTransaction?.cashierName}</div>
                          <div className="text-slate-500 text-xs">{retur.processedBy?.nama_lengkap}</div>
                        </td>
                        {isSuperAdmin && activeTab === "MENUNGGU_PERSETUJUAN" && (
                          <td className="px-6 py-4 text-sm text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => openApprovalModal(retur, "DISETUJUI")}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => openApprovalModal(retur, "DITOLAK")}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-medium transition-colors"
                            >
                              Tolak
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {returns.map((retur) => (
                  <div key={retur.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-xs text-slate-500 mb-1">{retur.salesTransaction?.sku}</div>
                        <div className="font-medium text-slate-900 text-sm line-clamp-2">{retur.auctionItem?.title || "Item Tidak Diketahui"}</div>
                      </div>
                      <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium border ${RETURN_STATUS_CONFIG[retur.status]?.className || "bg-slate-100"}`}>
                        {RETURN_STATUS_CONFIG[retur.status]?.label || retur.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Alasan</span>
                        <span className="font-medium text-slate-900">{RETURN_REASON_LABELS[retur.reason] || retur.reason}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Nominal</span>
                        <span className="font-medium text-slate-900">{formatCurrency(retur.refundAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Tanggal</span>
                        <span className="text-slate-700">{formatDate(retur.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Pemroses</span>
                        <span className="text-slate-700">{retur.processedBy?.nama_lengkap}</span>
                      </div>
                    </div>

                    {isSuperAdmin && activeTab === "MENUNGGU_PERSETUJUAN" && (
                      <div className="flex gap-2 pt-3 border-t border-slate-100 mt-3">
                        <button
                          onClick={() => openApprovalModal(retur, "DISETUJUI")}
                          className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-medium transition-colors"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => openApprovalModal(retur, "DITOLAK")}
                          className="flex-1 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-medium transition-colors"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Halaman {page} dari {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && approvalTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              {approvalAction === "DISETUJUI" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {approvalAction === "DISETUJUI" ? "Setujui Retur" : "Tolak Retur"}
                </h3>
                <p className="text-sm text-slate-500">SKU: {approvalTarget.salesTransaction?.sku}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 text-sm">
              <div>
                <span className="block text-slate-500 text-xs mb-1">Barang</span>
                <span className="font-medium text-slate-900">{approvalTarget.auctionItem?.title || "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Alasan Retur</span>
                  <span className="font-medium text-slate-900">{RETURN_REASON_LABELS[approvalTarget.reason] || approvalTarget.reason}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Kondisi Barang</span>
                  <span className="font-medium text-slate-900">{RETURN_CONDITION_LABELS[approvalTarget.condition] || approvalTarget.condition}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Nominal Refund</span>
                  <span className="font-medium text-slate-900">{formatCurrency(approvalTarget.refundAmount)}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Kasir</span>
                  <span className="font-medium text-slate-900">{approvalTarget.salesTransaction?.cashierName}</span>
                </div>
              </div>
              {approvalTarget.reasonNote && (
                <div>
                  <span className="block text-slate-500 text-xs mb-1">Detail Alasan Kasir</span>
                  <p className="text-slate-800 bg-white p-2 rounded border border-slate-200 mt-1">{approvalTarget.reasonNote}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan {approvalAction === "DISETUJUI" ? "Persetujuan" : "Penolakan"} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 min-h-[100px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm resize-none"
                  placeholder={`Masukkan alasan kenapa retur ini ${approvalAction === "DISETUJUI" ? "disetujui" : "ditolak"}...`}
                  required
                />
                {approvalError && <p className="text-rose-500 text-xs mt-1.5">{approvalError}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
                  disabled={isSubmittingApproval}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApproveReject}
                  disabled={isSubmittingApproval}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-colors text-sm ${
                    approvalAction === "DISETUJUI" 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "bg-rose-600 hover:bg-rose-700"
                  } disabled:opacity-50`}
                >
                  {isSubmittingApproval ? "Memproses..." : approvalAction === "DISETUJUI" ? "Setujui Retur" : "Tolak Retur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
