"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, SearchX } from "lucide-react";
import { CatalogParams } from "./_lib/params";
import { CatalogItemSummary } from "./_lib/query";
import { loadMoreCatalogItems } from "./_lib/actions";
import { SearchIsland } from "@/components/lelang/SearchIsland";
import { CategoryChips } from "@/components/lelang/CategoryChips";
import { ResultBar } from "@/components/lelang/ResultBar";

interface CatalogViewProps {
  initialItems: CatalogItemSummary[];
  totalCount: number;
  initialHasMore: boolean;
  params: CatalogParams;
  categories: string[];
  branches: string[];
}

export default function CatalogView({
  initialItems,
  totalCount,
  initialHasMore,
  params,
  categories,
  branches,
}: CatalogViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [items, setItems] = useState<CatalogItemSummary[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync state whenever props change from Server Component
  useEffect(() => {
    setItems(initialItems);
    setHasMore(initialHasMore);
  }, [initialItems, initialHasMore]);

  // Load more pagination via server action
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const res = await loadMoreCatalogItems(params, items.length, 20);
      setItems((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Gagal memuat barang berikutnya:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, params, items.length]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleResetFilter = () => {
    startTransition(() => {
      router.replace("/");
    });
  };

  return (
    <div className="w-full relative min-h-screen bg-slate-50">
      {/* Top Blue Hero Gradient Background (decorative layer behind header & initial idle pill) */}
      <div
        className="absolute top-0 left-0 right-0 h-[260px] sm:h-[280px] bg-gradient-to-b from-[#1e3a8a] to-[#122557] pointer-events-none -z-0"
        aria-hidden="true"
      />

      {/* Header title & description */}
      <div className="pt-8 sm:pt-10 pb-3 px-4 sm:px-6 lg:px-8 text-center sm:text-left text-white max-w-7xl mx-auto relative z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
          Katalog <span className="text-blue-300">MBG</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-blue-100 max-w-2xl font-medium leading-relaxed">
          Temukan barang preloved & lelang terbaik dari seluruh cabang kami.
        </p>
      </div>

      {/* Main Catalog Content Container (Sticky SearchIsland, CategoryChips, ResultBar, & Products in single tall container) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 relative z-20 pb-16">
        <SearchIsland initialParams={params} availableBranches={branches} />
        <CategoryChips categories={categories} activeCategory={params.category} />
        <ResultBar total={totalCount} params={params} />

        {/* Product Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 pt-1">
            {items.map((item, index) => {
              const isSold = item.publicStatus === "terjual";
              const isBooked = item.publicStatus === "dibooking";
              const thumbUrl =
                item.thumbnailIndex !== null &&
                item.thumbnailIndex !== undefined &&
                item.images[item.thumbnailIndex]
                  ? item.images[item.thumbnailIndex]
                  : item.images[0];

              return (
                <Link
                  key={item.id}
                  href={isSold ? "#" : `/katalog/${item.id}`}
                  onClick={(e) => {
                    if (isSold) e.preventDefault();
                  }}
                  aria-disabled={isSold || undefined}
                  className={`bg-white rounded-xl sm:rounded-2xl overflow-hidden flex flex-col group border relative text-left w-full focus:outline-none content-visibility-card transition-all duration-300 block ${
                    isSold
                      ? "border-slate-200 shadow-none cursor-not-allowed"
                      : "border-slate-200 shadow-2xs hover:shadow-md md:hover:-translate-y-0.5"
                  }`}
                >
                  {/* Thumbnail Image Container (4:3 aspect) */}
                  <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                    {thumbUrl ? (
                      <Image
                        src={thumbUrl}
                        alt={item.displayTitle}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className={`object-cover ${
                          isSold ? "grayscale opacity-60" : "group-hover:scale-105 transition-transform duration-500"
                        }`}
                        priority={index < 4}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                        Tanpa Gambar
                      </div>
                    )}

                    {/* Overlay Terjual */}
                    {isSold && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
                        <span className="px-2 py-1 sm:px-4 sm:py-2 border-2 border-red-600 text-red-600 font-black text-xs sm:text-base tracking-widest rounded-lg -rotate-12 bg-white uppercase">
                          Terjual
                        </span>
                      </div>
                    )}

                    {/* Status Ketersediaan O2O */}
                    {!isSold && (
                      <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 z-10">
                        <span
                          className={`px-1.5 py-0.5 sm:px-2 flex items-center gap-1 rounded-md text-[9px] sm:text-[10px] font-bold ${
                            isBooked ? "bg-amber-500 text-white" : "bg-white text-emerald-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isBooked ? "bg-white" : "bg-emerald-500"}`}
                            aria-hidden="true"
                          />
                          {isBooked ? "Dibooking" : "Tersedia"}
                        </span>
                      </div>
                    )}

                    {/* Condition Badge */}
                    <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-10">
                      <span
                        className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 flex items-center justify-center rounded-md text-[8px] sm:text-[10px] uppercase font-bold text-white shadow-xs ${
                          item.kondisi === "Baru" ? "bg-emerald-700" : "bg-slate-700"
                        }`}
                      >
                        {item.kondisi}
                      </span>
                    </div>
                  </div>

                  {/* Product Card Details */}
                  <div className="p-2.5 sm:p-4 flex flex-col flex-grow bg-white">
                    <div className="text-[9px] sm:text-[10px] text-blue-600 font-bold tracking-wider uppercase mb-1 truncate">
                      {item.category}
                    </div>
                    <h3
                      className={`font-semibold leading-snug mb-1.5 line-clamp-2 text-xs sm:text-base transition-colors h-8 sm:h-12 overflow-hidden ${
                        isSold ? "text-slate-500" : "text-slate-900 group-hover:text-blue-600"
                      }`}
                      title={item.title}
                    >
                      {item.displayTitle}
                    </h3>

                    {/* Spesifikasi kunci (maks. 2 chip) */}
                    {item.specs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1 max-h-[18px] sm:max-h-5 overflow-hidden">
                        {item.specs.map((spec) => (
                          <span
                            key={spec}
                            className="max-w-full truncate rounded bg-slate-100 px-1.5 py-px text-[10px] sm:text-[11px] font-medium text-slate-700 tabular-nums"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-2">
                      <div
                        className={`text-xs sm:text-lg font-black mb-1.5 truncate ${
                          isSold ? "text-slate-400 line-through" : "text-blue-800"
                        }`}
                      >
                        {formatIDR(item.price)}
                      </div>
                      <div className="flex items-center text-[9px] sm:text-xs text-slate-500 gap-1 pt-1.5 border-t border-slate-100">
                        <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                        <span className="truncate">
                          {item.branchName.replace(/^MBG\s*Cabang\s*/i, "").replace(/^Cabang\s*/i, "")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs my-4">
            <SearchX className="w-12 h-12 mb-3 text-slate-300" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              {params.q ? `Tidak ada barang untuk “${params.q}”` : "Tidak ada barang ditemukan"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
              Coba gunakan kata kunci lain yang lebih umum atau reset filter pencarian Anda.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer shadow-xs"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}

        {/* Pagination: Muat Lebih Banyak */}
        {hasMore && (
          <div className="flex justify-center pt-8 pb-4">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 text-sm font-semibold transition-all border border-slate-200 shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                  <span>Memuat...</span>
                </>
              ) : (
                <span>Muat Lebih Banyak</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
