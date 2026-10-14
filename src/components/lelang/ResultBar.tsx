"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check, X } from "lucide-react";
import {
  CatalogParams,
  SortOption,
  SORT_OPTIONS,
  PRICE_PRESETS,
  parseCatalogParams,
  buildCatalogQueryString,
} from "@/app/(public)/_lib/params";

interface ResultBarProps {
  total: number;
  params: CatalogParams;
}

export function ResultBar({ total, params }: ResultBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);

  // Close sort menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    }
    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSortOpen]);

  const handleSortChange = (newSort: SortOption) => {
    setIsSortOpen(false);
    const current = parseCatalogParams(searchParams);
    const updated = { ...current, sort: newSort, cursor: undefined };
    const qs = buildCatalogQueryString(updated);
    router.replace(qs || "/");
  };

  const handleRemoveFilter = (filterKey: "kondisi" | "harga" | "cabang") => {
    const current = parseCatalogParams(searchParams);
    const updated = { ...current, [filterKey]: undefined, cursor: undefined };
    const qs = buildCatalogQueryString(updated);
    router.replace(qs || "/");
  };

  const handleResetAll = () => {
    // Reset all search, filter, and sort
    router.replace("/");
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.id === params.sort)?.label || "Terbaru";

  const hasActiveFilters = Boolean(
    params.q || params.kondisi || params.harga || params.cabang || (params.category && params.category !== "Semua Kategori")
  );

  return (
    <div className="w-full space-y-2.5 px-4 sm:px-6 pt-2 pb-1">
      {/* Baris 1: Chip Sort + Chip Filter Aktif */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar hide-scrollbar py-0.5">
        {/* Sort Chip Dropdown */}
        <div className="relative shrink-0" ref={sortRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isSortOpen}
            className="h-9 px-3.5 rounded-full text-[13px] font-semibold bg-white text-[#333333] border border-[#E4E4DF] hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs select-none"
          >
            <span>{currentSortLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {isSortOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = params.sort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSortChange(opt.id)}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#32D74B]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Filter Chips */}
        {params.kondisi && (
          <span className="h-9 px-3 rounded-full text-xs font-semibold bg-[#111111] text-white flex items-center gap-1.5 shrink-0 shadow-2xs select-none">
            <span>Kondisi: {params.kondisi === "baru" ? "Baru" : "Bekas"}</span>
            <button
              type="button"
              onClick={() => handleRemoveFilter("kondisi")}
              aria-label="Hapus filter kondisi"
              className="p-0.5 rounded-full hover:bg-white/20 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}

        {params.harga && PRICE_PRESETS[params.harga] && (
          <span className="h-9 px-3 rounded-full text-xs font-semibold bg-[#111111] text-white flex items-center gap-1.5 shrink-0 shadow-2xs select-none">
            <span>Harga: {PRICE_PRESETS[params.harga].label}</span>
            <button
              type="button"
              onClick={() => handleRemoveFilter("harga")}
              aria-label="Hapus filter harga"
              className="p-0.5 rounded-full hover:bg-white/20 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}

        {params.cabang && (
          <span className="h-9 px-3 rounded-full text-xs font-semibold bg-[#111111] text-white flex items-center gap-1.5 shrink-0 shadow-2xs select-none">
            <span>Cabang: {params.cabang}</span>
            <button
              type="button"
              onClick={() => handleRemoveFilter("cabang")}
              aria-label="Hapus filter cabang"
              className="p-0.5 rounded-full hover:bg-white/20 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* Baris 2: Hitungan Barang & Tombol Reset Filter */}
      <div className="flex items-center justify-between text-[13px] pt-1">
        <div className="text-[#4A4A46] min-w-0 truncate">
          <strong className="font-bold text-[#111111]">{total} barang</strong>
          {params.q ? (
            <span> untuk &ldquo;<span className="font-medium text-[#111111]">{params.q}</span>&rdquo;</span>
          ) : params.category ? (
            <span> di kategori &ldquo;<span className="font-medium text-[#111111]">{params.category}</span>&rdquo;</span>
          ) : null}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetAll}
            className="shrink-0 text-[13px] font-semibold text-blue-600 underline hover:text-blue-800 transition-colors cursor-pointer min-h-[44px] flex items-center pl-3"
          >
            Reset filter
          </button>
        )}
      </div>
    </div>
  );
}
