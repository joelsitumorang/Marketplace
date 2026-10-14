"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  CatalogParams,
  KondisiOption,
  HargaPreset,
  PRICE_PRESETS,
} from "@/app/(public)/_lib/params";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: CatalogParams;
  onApply: (filters: { kondisi?: KondisiOption; harga?: HargaPreset; cabang?: string }) => void;
  availableBranches?: string[];
}

export function FilterSheet({
  isOpen,
  onClose,
  currentParams,
  onApply,
  availableBranches = [],
}: FilterSheetProps) {
  const [draftKondisi, setDraftKondisi] = useState<KondisiOption | undefined>(currentParams.kondisi);
  const [draftHarga, setDraftHarga] = useState<HargaPreset | undefined>(currentParams.harga);
  const [draftCabang, setDraftCabang] = useState<string | undefined>(currentParams.cabang);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Sync draft state with props when opened
  useEffect(() => {
    if (isOpen) {
      setDraftKondisi(currentParams.kondisi);
      setDraftHarga(currentParams.harga);
      setDraftCabang(currentParams.cabang);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, currentParams]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResetDraft = () => {
    setDraftKondisi(undefined);
    setDraftHarga(undefined);
    setDraftCabang(undefined);
  };

  const handleApply = () => {
    onApply({
      kondisi: draftKondisi,
      harga: draftHarga,
      cabang: draftCabang,
    });
    onClose();
  };

  const showBranchFilter = availableBranches.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-sheet-title"
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Scrim Overlay (no blur) */}
      <div
        className="fixed inset-0 bg-[#111111]/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg bg-white rounded-t-[24px] shadow-2xl flex flex-col max-h-[85vh] z-10 animate-in slide-in-from-bottom duration-200"
      >
        {/* Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-9 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 id="filter-sheet-title" className="text-base font-bold text-slate-900">
            Filter Katalog
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup filter"
            className="w-11 h-11 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Body Scrollable */}
        <div className="overflow-y-auto px-5 py-4 space-y-6">
          {/* 1. Kondisi Barang (Segmented Control) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Kondisi Barang
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setDraftKondisi(undefined)}
                className={`h-10 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !draftKondisi
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setDraftKondisi("baru")}
                className={`h-10 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  draftKondisi === "baru"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Baru
              </button>
              <button
                type="button"
                onClick={() => setDraftKondisi("bekas")}
                className={`h-10 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  draftKondisi === "bekas"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bekas
              </button>
            </div>
          </div>

          {/* 2. Rentang Harga Preset */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Rentang Harga
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRICE_PRESETS) as HargaPreset[]).map((key) => {
                const preset = PRICE_PRESETS[key];
                const isSelected = draftHarga === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDraftHarga(isSelected ? undefined : key)}
                    className={`h-10 px-4 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Cabang (Hanya jika multi-cabang > 1) */}
          {showBranchFilter && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Pilih Cabang
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDraftCabang(undefined)}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    !draftCabang
                      ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  Semua Cabang
                </button>
                {availableBranches.map((br) => {
                  const isSelected = draftCabang?.toLowerCase() === br.toLowerCase();
                  return (
                    <button
                      key={br}
                      type="button"
                      onClick={() => setDraftCabang(isSelected ? undefined : br)}
                      className={`h-10 px-4 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {br}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white">
          <button
            type="button"
            onClick={handleResetDraft}
            className="w-24 h-12 flex items-center justify-center text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 h-12 rounded-xl bg-[#111111] text-white text-sm font-bold hover:bg-black transition-colors cursor-pointer shadow-md"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  );
}
export default FilterSheet;
