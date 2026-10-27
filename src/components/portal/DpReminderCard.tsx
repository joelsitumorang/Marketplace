"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DpItemDTO, DpQueryResult } from "@/lib/dp/queries";
import { markDpContacted } from "@/app/mbg-internal-portal/_actions/dp";
import { formatRupiah } from "@/lib/share";

interface DpReminderCardProps {
  data?: DpQueryResult | null;
}

const labelTelat = (daysDiff: number, stageLabel?: string) => {
  if (daysDiff < 0) return `lewat ${Math.abs(daysDiff)} hari`;
  if (daysDiff === 0) return "jatuh tempo hari ini";
  return stageLabel?.toLowerCase() || "besok jatuh tempo";
};

function DaftarMenunggu({ items }: { items: DpItemDTO[] }) {
  return (
    <ul className="px-4 pb-2 border-t border-slate-100 divide-y divide-slate-100">
      {items.map((m) => (
        <li
          key={m.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 py-2.5 text-[13px]"
        >
          <div className="min-w-0 flex-1">
            <span className="font-medium text-slate-900 truncate block" title={m.itemName}>
              {m.itemName}
            </span>
            <span className="text-xs text-slate-500 truncate block">
              {m.buyerName || "Tanpa nama"} · kurang {formatRupiah(m.remainingAmount)} · dihubungi {m.contactCount}x
            </span>
          </div>
          {m.isPhoneValid && m.waLink && (
            <a
              href={m.waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] self-start sm:self-auto shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            >
              <span>Hubungi ulang</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DpReminderCard({ data }: DpReminderCardProps) {
  const [buka, setBuka] = useState(false);
  const [selectedTx, setSelectedTx] = useState<DpItemDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const { perluDihubungi = [], menungguPembeli = [], totalNeedingContact = 0 } = data || {};
  const laporanHref = "/mbg-internal-portal/reports";

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
      } catch {
        toast.error("Gagal memperbarui status kontak.");
      } finally {
        setSelectedTx(null);
      }
    });
  };

  // Kondisi A: tidak ada yang perlu dihubungi (N = 0)
  if (totalNeedingContact === 0) {
    const isi = (
      <>
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[13px]">
          <span className="font-medium text-slate-900">Pengingat DP</span>
          <span className="text-slate-500"> · semua sudah dihubungi hari ini</span>
        </span>
      </>
    );

    return (
      <section className="rounded-xl border border-slate-200 bg-white">
        {menungguPembeli.length > 0 ? (
          <button
            type="button"
            aria-expanded={buka}
            onClick={() => setBuka(!buka)}
            className="flex min-h-12 w-full items-center gap-2.5 px-4 text-left hover:bg-slate-50 transition-colors"
          >
            {isi}
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {menungguPembeli.length} menunggu
            </span>
            <ChevronRight
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${buka ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <div className="flex min-h-12 items-center gap-2.5 px-4">
            {isi}
            <Link
              href={laporanHref}
              className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Semua laporan ↗
            </Link>
          </div>
        )}
        {buka && menungguPembeli.length > 0 && <DaftarMenunggu items={menungguPembeli} />}
      </section>
    );
  }

  // Kondisi B: ada yang perlu dihubungi (N >= 1)
  const tampil = perluDihubungi.slice(0, 3);
  const sisa = perluDihubungi.length - tampil.length;

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white">
        {/* Header Kartu */}
        <div className="flex items-center gap-2.5 px-4 py-3 text-[13px]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          <span className="flex-1 font-medium text-slate-900">Perlu dihubungi ({totalNeedingContact})</span>
          <Link
            href={laporanHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 shrink-0"
          >
            <span>Semua laporan</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Daftar Maksimal 3 Item */}
        <ul className="divide-y divide-slate-100">
          {tampil.map((d) => {
            const terlambatLabel = labelTelat(d.daysDiff, d.stageLabel);
            return (
              <li
                key={d.id}
                className="flex items-center gap-2.5 sm:gap-3 border-t border-slate-100 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900" title={d.itemName}>
                    {d.itemName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {d.buyerName || "Tanpa nama"} · kurang {formatRupiah(d.remainingAmount)}
                    <span className="sm:hidden"> · {terlambatLabel}</span>
                  </p>
                </div>

                <span className="hidden shrink-0 whitespace-nowrap text-xs text-slate-500 sm:block">
                  {terlambatLabel}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {d.isPhoneValid && d.waLink && (
                    <a
                      href={d.waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                      aria-label={`Hubungi pembeli ${d.buyerName || ""} via WhatsApp`}
                    >
                      Hubungi
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedTx(d)}
                    disabled={isPending}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 sm:px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
                    title="Tandai sudah dihubungi"
                    aria-label={`Tandai ${d.itemName} sudah dihubungi`}
                  >
                    <Check className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span className="hidden sm:inline">Sudah dihubungi</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Baris Jika N > 3 */}
        {sisa > 0 && (
          <Link
            href={laporanHref}
            className="block border-t border-slate-100 px-4 py-3 text-[13px] font-medium text-blue-600 hover:underline"
          >
            Lihat {sisa} lainnya
          </Link>
        )}

        {/* Footer: Menunggu konfirmasi pembeli */}
        {menungguPembeli.length > 0 && (
          <>
            <button
              type="button"
              aria-expanded={buka}
              onClick={() => setBuka(!buka)}
              className="flex min-h-11 w-full items-center justify-between border-t border-slate-100 px-4 text-left text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span>Menunggu konfirmasi pembeli ({menungguPembeli.length})</span>
              <ChevronRight
                className={`h-4 w-4 text-slate-400 transition-transform ${buka ? "rotate-90" : ""}`}
                aria-hidden="true"
              />
            </button>
            {buka && <DaftarMenunggu items={menungguPembeli} />}
          </>
        )}
      </section>

      {/* Modal Dialog Konfirmasi Kontak */}
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
