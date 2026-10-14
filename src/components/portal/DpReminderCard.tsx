"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { 
  Clock, 
  AlertCircle, 
  AlertTriangle, 
  MessageCircle, 
  Check, 
  ExternalLink, 
  ChevronDown,
  PhoneOff,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DpItemDTO, DpQueryResult } from "@/lib/dp/queries";
import { markDpContacted } from "@/app/mbg-internal-portal/_actions/dp";

interface DpReminderCardProps {
  data: DpQueryResult;
}

export default function DpReminderCard({ data }: DpReminderCardProps) {
  const [selectedTx, setSelectedTx] = useState<DpItemDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const { perluDihubungi, menungguPembeli, totalNeedingContact } = data;

  // Aturan Brief 5.5: Sembunyikan kartu bila N = 0 (hindari kartu kosong)
  if (totalNeedingContact === 0 && menungguPembeli.length === 0) {
    return null;
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleConfirmContacted = () => {
    if (!selectedTx) return;

    startTransition(async () => {
      try {
        const res = await markDpContacted(selectedTx.id);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error("Gagal memperbarui status kontak.");
      } finally {
        setSelectedTx(null);
      }
    });
  };

  const renderStageChip = (item: DpItemDTO) => {
    if (item.stage === "H_MINUS_1") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
          <span>{item.stageLabel}</span>
        </span>
      );
    }
    if (item.stage === "H0") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
          <span>{item.stageLabel}</span>
        </span>
      );
    }
    // OVERDUE
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
        <span>{item.stageLabel}</span>
      </span>
    );
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        {/* Header Kartu */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Perlu Dihubungi ({totalNeedingContact})
            </h3>
            <span className="text-xs text-slate-500 hidden sm:inline">
              — Pengingat pelunasan DP pembeli
            </span>
          </div>

          <Link
            href="/mbg-internal-portal/reports"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors min-h-[36px]"
          >
            <span>Semua Laporan</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Daftar Utama: Perlu Dihubungi */}
        {perluDihubungi.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {perluDihubungi.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                {/* Info Barang & Pembeli */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderStageChip(item)}
                    <span className="text-xs font-mono text-slate-400">SKU: {item.sku}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 font-medium">{item.branchName}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate" title={item.itemName}>
                    {item.itemName}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Pembeli: </span>
                      <span className="font-bold text-slate-800">
                        {item.buyerName ? item.buyerName : "Tanpa nama"}
                      </span>
                    </div>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <div className="font-medium">
                      <span>DP Rp {formatRupiah(item.dpAmount)}</span>
                      <span className="text-slate-300 mx-1">·</span>
                      <span className="font-bold text-rose-600">
                        Kurang Rp {formatRupiah(item.remainingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  {/* Tombol WhatsApp */}
                  {item.isPhoneValid && item.waLink ? (
                    <a
                      href={item.waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors min-h-[44px]"
                      aria-label={`Hubungi pembeli ${item.buyerName || ""} via WhatsApp`}
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Hubungi via WA</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed min-h-[44px]"
                      title={item.phoneError || "Nomor WhatsApp belum tercatat"}
                    >
                      <PhoneOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Nomor belum ada</span>
                    </button>
                  )}

                  {/* Tombol Sudah Dihubungi */}
                  <button
                    onClick={() => setSelectedTx(item)}
                    disabled={isPending}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors min-h-[44px]"
                  >
                    <Check className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>Sudah dihubungi</span>
                  </button>

                  {/* Aksi Tambahan untuk OVERDUE: Buka Transaksi */}
                  {item.stage === "OVERDUE" && (
                    <Link
                      href="/mbg-internal-portal/reports"
                      className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors min-h-[44px]"
                    >
                      <span>Buka transaksi</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-sm">
            Semua transaksi DP yang jatuh tempo telah dihubungi untuk hari ini.
          </div>
        )}

        {/* Sub-Daftar Collapsible: Menunggu Pembeli */}
        {menungguPembeli.length > 0 && (
          <details className="group border-t border-slate-200 bg-slate-50/50">
            <summary className="flex items-center justify-between px-5 py-3 cursor-pointer select-none text-xs font-bold text-slate-600 hover:text-slate-900 min-h-[44px]">
              <span>Menunggu konfirmasi pembeli ({menungguPembeli.length})</span>
              <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                <span className="text-[11px] font-normal group-open:hidden">Tampilkan</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </div>
            </summary>

            <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
              {menungguPembeli.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {renderStageChip(item)}
                      <span className="font-bold text-slate-900 truncate">{item.itemName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pembeli: <span className="font-semibold text-slate-700">{item.buyerName || "-"}</span> · 
                      Sisa Rp {formatRupiah(item.remainingAmount)} · 
                      Dihubungi {item.contactCount}x ({item.lastContactStage})
                    </p>
                  </div>

                  {item.isPhoneValid && item.waLink && (
                    <a
                      href={item.waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors min-h-[36px]"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      <span>Hubungi ulang</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Modal Dialog Konfirmasi Modern */}
      <ConfirmDialog
        isOpen={Boolean(selectedTx)}
        title="Tandai Sudah Dihubungi?"
        message={`Apakah Anda sudah menghubungi pembeli untuk barang "${selectedTx?.itemName}"? Status pengingat akan diperbarui dan dipindahkan ke 'Menunggu pembeli'.`}
        confirmText={isPending ? "Menyimpan..." : "Ya, Sudah Dihubungi"}
        cancelText="Batal"
        onConfirm={handleConfirmContacted}
        onCancel={() => setSelectedTx(null)}
      />
    </>
  );
}
