"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

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

const RETURN_CONDITION_DESCS: Record<string, string> = {
  LAYAK_JUAL_ULANG: "Barang dalam kondisi baik, bisa langsung dijual kembali",
  PERLU_PERBAIKAN: "Barang perlu diperbaiki sebelum dijual ulang",
  RUSAK_TOTAL: "Barang tidak bisa dijual, keluar dari katalog",
};

interface ReturFormClientProps {
  cashierName: string;
  branchName: string;
  initialSku: string;
  userRole: string;
}

export default function ReturFormClient({ cashierName, branchName, initialSku, userRole }: ReturFormClientProps) {
  const router = useRouter();
  
  // Lookup Phase State
  const [skuQuery, setSkuQuery] = useState(initialSku);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [transaction, setTransaction] = useState<any>(null);

  // Form Phase State
  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [condition, setCondition] = useState("");
  const [refundAmount, setRefundAmount] = useState<number | "">("");
  const [refundMethod, setRefundMethod] = useState("Tunai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Computed from transaction
  const daysSincePurchase = transaction?.daysSincePurchase ?? 0;
  const isTooOld = daysSincePurchase > 30;
  const requiresApproval = daysSincePurchase > 3;
  const canProceedWithForm = transaction && !isTooOld && !transaction.hasPendingReturn;

  const needsDetailText = reason === "LAINNYA" || reason === "TIDAK_SESUAI_DESKRIPSI";

  useEffect(() => {
    if (initialSku && !transaction) {
      handleLookup(initialSku);
    }
  }, [initialSku]);

  const handleLookup = async (skuToLookup: string) => {
    if (!skuToLookup.trim()) {
      setLookupError("Silakan masukkan SKU.");
      return;
    }
    
    setIsLookingUp(true);
    setLookupError("");
    setTransaction(null);
    
    try {
      const res = await fetch(`/api/admin/retur/lookup?sku=${encodeURIComponent(skuToLookup)}`);
      const data = await res.json();
      
      if (data.success) {
        const lookupData = data.data;
        setTransaction({
          ...lookupData.transaction,
          daysSincePurchase: lookupData.daysSincePurchase,
          canReturn: lookupData.canReturn,
          requiresApproval: lookupData.requiresApproval,
          isBlocked: lookupData.isBlocked,
          hasPendingReturn: lookupData.hasPendingReturn,
        });
        setRefundAmount(Number(lookupData.transaction.soldPrice));
      } else {
        setLookupError(data.message || "Transaksi tidak ditemukan.");
      }
    } catch (error) {
      setLookupError("Terjadi kesalahan sistem saat mencari transaksi.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(skuQuery);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (needsDetailText && reasonDetail.trim().length < 10) {
      setSubmitError("Penjelasan tambahan wajib diisi minimal 10 karakter untuk alasan ini.");
      return;
    }

    if (refundAmount === "" || refundAmount < 0 || refundAmount > Number(transaction.soldPrice)) {
      setSubmitError("Nominal refund tidak valid. Maksimal sebesar harga jual awal.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        salesTransactionId: transaction.id,
        reason,
        reasonNote: reasonDetail.trim(),
        condition,
        refundAmount: Number(refundAmount),
        refundMethod,
      };

      const res = await fetch("/api/admin/retur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowSuccessModal(true);
      } else {
        setSubmitError(data.message || "Gagal mengajukan retur.");
      }
    } catch (error) {
      setSubmitError("Terjadi kesalahan sistem saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount?.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href="/mbg-internal-portal/retur" 
          className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ajukan Retur Baru</h1>
          <p className="text-sm text-slate-500">Proses pengembalian barang dari pelanggan.</p>
        </div>
      </div>

      {/* Phase 1: Lookup */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Cari Transaksi Berdasarkan SKU
        </label>
        <form onSubmit={handleLookupSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={skuQuery}
              onChange={(e) => setSkuQuery(e.target.value)}
              placeholder="Contoh: ITM-001..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-base md:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLookingUp}
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 whitespace-nowrap"
          >
            {isLookingUp ? "Mencari..." : "Cari"}
          </button>
        </form>
        {lookupError && (
          <p className="mt-3 text-sm text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
            {lookupError}
          </p>
        )}
      </div>

      {/* Transaction Details & Banner (Shown if found) */}
      {transaction && (
        <div className="space-y-6">
          {/* Banner */}
          {transaction.hasPendingReturn ? (
             <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
               <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-semibold text-amber-900">Retur Sedang Diproses</h4>
                 <p className="text-amber-800 text-sm mt-1">Transaksi ini sudah memiliki pengajuan retur yang menunggu persetujuan. Anda tidak dapat mengajukan retur ganda.</p>
               </div>
             </div>
          ) : daysSincePurchase <= 3 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 items-start">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-emerald-900">Bisa Diproses Langsung</h4>
                <p className="text-emerald-800 text-sm mt-1">Transaksi berumur {daysSincePurchase} hari. Retur dapat diproses langsung oleh kasir.</p>
              </div>
            </div>
          ) : daysSincePurchase > 3 && daysSincePurchase <= 30 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Memerlukan Persetujuan</h4>
                <p className="text-amber-800 text-sm mt-1">Transaksi berumur {daysSincePurchase} hari, melewati batas 3 hari. Pengajuan akan dikirim ke SUPERADMIN untuk persetujuan.</p>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 items-start">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-rose-900">Melewati Batas Maksimal</h4>
                <p className="text-rose-800 text-sm mt-1">Transaksi berumur {daysSincePurchase} hari, melewati batas maksimal 30 hari. Retur tidak dapat diproses.</p>
              </div>
            </div>
          )}

          {/* Transaction Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900">Detail Transaksi</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <span className="block text-slate-500 text-xs mb-1">SKU Barang</span>
                <span className="font-mono text-slate-900">{transaction.sku}</span>
              </div>
              <div className="lg:col-span-2">
                <span className="block text-slate-500 text-xs mb-1">Nama Barang</span>
                <span className="font-medium text-slate-900">{transaction.itemTitle}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs mb-1">Harga Jual</span>
                <span className="font-medium text-brand-700">{formatCurrency(transaction.soldPrice)}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs mb-1">Tanggal Transaksi</span>
                <span className="text-slate-900">{formatDate(transaction.createdAt)}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-xs mb-1">Lokasi & Kasir</span>
                <span className="text-slate-900">{transaction.branchName} - {transaction.cashierName}</span>
              </div>
            </div>
          </div>

          {/* Phase 2: Form */}
          {canProceedWithForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-semibold text-slate-900">Form Pengajuan Retur</h3>
              </div>
              
              <form onSubmit={handleSubmitReturn} className="p-6 space-y-6">
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alasan Retur <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-base md:text-sm"
                  >
                    <option value="" disabled>Pilih Alasan</option>
                    {Object.entries(RETURN_REASON_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Reason Detail */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Penjelasan Tambahan {needsDetailText && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    required={needsDetailText}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 min-h-[100px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-sm resize-none"
                    placeholder="Tuliskan detail kondisi barang..."
                  />
                  {needsDetailText && (
                    <p className="text-xs text-slate-500 mt-1.5">*Wajib diisi (min. 10 karakter) untuk alasan ini.</p>
                  )}
                </div>

                {/* Condition (Radios) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Kondisi Barang Saat Kembali <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {Object.entries(RETURN_CONDITION_LABELS).map(([val, label]) => (
                      <label 
                        key={val} 
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          condition === val 
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="condition"
                          value={val}
                          checked={condition === val}
                          onChange={(e) => setCondition(e.target.value)}
                          className="mt-1 w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                          required
                        />
                        <div>
                          <div className={`font-medium ${condition === val ? "text-brand-900" : "text-slate-900"}`}>
                            {label}
                          </div>
                          <div className={`text-sm mt-0.5 ${condition === val ? "text-brand-700" : "text-slate-500"}`}>
                            {RETURN_CONDITION_DESCS[val]}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  {/* Refund Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nominal Refund (Maks. {formatCurrency(transaction.soldPrice)}) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-500 sm:text-sm">Rp</span>
                      </div>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        max={transaction.soldPrice}
                        min={0}
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl pl-12 pr-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-base md:text-sm"
                      />
                    </div>
                  </div>

                  {/* Refund Method */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Metode Pengembalian Dana <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 md:py-2.5 min-h-[44px] text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-base md:text-sm"
                    >
                      <option value="Tunai">Tunai</option>
                      <option value="Transfer">Transfer Bank</option>
                      <option value="Tukar Barang">Tukar Barang Baru</option>
                    </select>
                  </div>
                </div>

                {/* Errors */}
                {submitError && (
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm border border-rose-100">
                    {submitError}
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
                  <Link
                    href="/mbg-internal-portal/retur"
                    className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm text-sm"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-2.5 rounded-xl text-white font-medium transition-colors shadow-sm text-sm ${
                      requiresApproval 
                        ? "bg-amber-600 hover:bg-amber-700" 
                        : "bg-emerald-600 hover:bg-emerald-700"
                    } disabled:opacity-50`}
                  >
                    {isSubmitting ? "Menyimpan..." : requiresApproval ? "Ajukan Persetujuan Retur" : "Proses Retur"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {requiresApproval ? "Pengajuan Berhasil" : "Retur Berhasil Diproses"}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              {requiresApproval 
                ? "Pengajuan retur Anda telah dikirim dan menunggu persetujuan dari Superadmin." 
                : "Proses retur telah berhasil disimpan ke dalam sistem."}
            </p>
            <button
              onClick={() => router.push("/mbg-internal-portal/retur")}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Kembali ke Daftar Retur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
