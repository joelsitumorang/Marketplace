"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  CatalogParams,
  countActiveFilters,
  parseCatalogParams,
  buildCatalogQueryString,
} from "@/app/(public)/_lib/params";
import { suggestItems } from "@/app/(public)/_lib/actions";
import "./island.css";

// Lazy-load FilterSheet to keep initial JS payload minimal
const FilterSheet = dynamic(() => import("./FilterSheet"), {
  ssr: false,
});

interface SearchIslandProps {
  initialParams: CatalogParams;
  availableBranches?: string[];
}

const RECENT_SEARCHES_KEY = "mbg_recent_searches";

export function SearchIsland({ initialParams, availableBranches = [] }: SearchIslandProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [currentParams, setCurrentParams] = useState<CatalogParams>(initialParams);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [inputValue, setInputValue] = useState(initialParams.q || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<
    Array<{ id: number; title: string; price: number; sku: string }>
  >([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state with URL searchParams
  useEffect(() => {
    const parsed = parseCatalogParams(searchParams);
    setCurrentParams(parsed);
    setInputValue(parsed.q || "");
  }, [searchParams]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignore in private browsing mode
    }
  }, []);

  const saveRecentSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    try {
      const existing = recentSearches.filter((k) => k.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...existing].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore error
    }
  };

  const clearRecentSearches = () => {
    try {
      setRecentSearches([]);
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  };

  // Setup IntersectionObserver sentinel for reliable collapsed state
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel scrolls out of view above top, pill is collapsed
        setIsCollapsed(!entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Fetch suggestions when typing in expanded state
  useEffect(() => {
    if (!isExpanded) {
      setSuggestions([]);
      return;
    }

    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoadingSuggestions(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await suggestItems(trimmed);
        setSuggestions(results);
      } catch (err) {
        console.error("Gagal memuat saran barang:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue, isExpanded]);

  // Open Island in expanded focus state
  const handleOpenIsland = useCallback(() => {
    setIsExpanded(true);
    // Synchronously focus input on user tap for iOS Safari compatibility
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  // Close island without modifying URL
  const handleCloseIsland = useCallback(() => {
    setIsExpanded(false);
    setInputValue(currentParams.q || "");
  }, [currentParams.q]);

  // Submit search query
  const handleSubmitSearch = (keyword: string) => {
    const trimmed = keyword.trim().slice(0, 60);
    setIsExpanded(false);
    if (trimmed) {
      saveRecentSearch(trimmed);
    }

    const updated = {
      ...currentParams,
      q: trimmed,
      cursor: undefined, // reset pagination
    };

    const qs = buildCatalogQueryString(updated);
    startTransition(() => {
      router.push(qs || "/");
    });
  };

  // Keyboard navigation & Esc key handling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isExpanded) {
        handleCloseIsland();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, handleCloseIsland]);

  const activeFilterCount = countActiveFilters(currentParams);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <>
      {/* 1px Sentinel untuk IntersectionObserver (Bagian 7.3) */}
      <div
        ref={sentinelRef}
        className="w-full h-[1px] pointer-events-none opacity-0"
        aria-hidden="true"
      />

      {/* Sticky Dynamic Island Wrap */}
      <div
        className="island-wrap px-4 sm:px-6"
        data-collapsed={isCollapsed ? "true" : "false"}
        data-expanded={isExpanded ? "true" : "false"}
      >
        <div className="island-pill">
          {/* Collapsed Search Icon Button (44x44px for direct tap when collapsed) */}
          <button
            type="button"
            onClick={handleOpenIsland}
            aria-label="Cari barang"
            className="w-11 h-11 ml-1.5 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors shrink-0 cursor-pointer"
          >
            <Search className="w-5 h-5" strokeWidth={2} />
          </button>

          {/* Search Text Trigger Area (Pill text: placeholder or active keyword) */}
          <button
            type="button"
            onClick={handleOpenIsland}
            aria-haspopup="dialog"
            aria-label="Cari barang"
            className="island-text flex-1 min-w-0 h-full text-left flex items-center px-2 cursor-pointer select-none transition-opacity duration-150 overflow-hidden"
          >
            {currentParams.q ? (
              <span className="font-semibold text-white text-[15px] truncate">
                {currentParams.q}
              </span>
            ) : (
              <span className="text-[#A1A1A6] text-[15px] truncate">
                Cari iPhone, laptop, atau SKU…
              </span>
            )}
          </button>

          {/* Filter Button Circle (44x44px with badge) */}
          <div className="relative mr-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              aria-label={`Filter katalog${activeFilterCount > 0 ? `, ${activeFilterCount} aktif` : ""}`}
              className="w-11 h-11 rounded-full bg-[#2A2A2C] text-white flex items-center justify-center hover:bg-[#38383B] active:bg-[#444448] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Active Filter Count Badge */}
            {activeFilterCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-[#32D74B] text-[#111111] font-extrabold text-[10px] flex items-center justify-center border-2 border-[#111111] pointer-events-none select-none"
                aria-hidden="true"
              >
                {activeFilterCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Island Dialog & Scrim Overlay (State B) */}
      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cari barang"
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6"
        >
          {/* Background Scrim (no blur) */}
          <div
            className="fixed inset-0 bg-[#111111]/50 transition-opacity"
            onClick={handleCloseIsland}
            aria-hidden="true"
          />

          {/* Expanded Island Box */}
          <div className="island-expanded-container relative w-full max-w-xl max-h-[calc(100dvh-32px)] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Row 1: Search Input & Action Buttons (56px) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitSearch(inputValue);
              }}
              className="h-14 flex items-center px-4 gap-2.5 shrink-0 border-b border-[#2A2A2C]"
            >
              <Search className="w-5 h-5 text-[#8E8E93] shrink-0" strokeWidth={2} />

              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                inputMode="search"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Cari iPhone, laptop, atau SKU…"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white text-base placeholder-[#A1A1A6] font-medium"
              />

              {/* Clear Text Button (only shown when there is input) */}
              {inputValue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Hapus teks"
                  className="w-8 h-8 rounded-full bg-[#2A2A2C] text-white flex items-center justify-center hover:bg-[#38383B] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Batal Button */}
              <button
                type="button"
                onClick={handleCloseIsland}
                className="h-11 px-3 text-[#32D74B] text-[15px] font-semibold flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer shrink-0"
              >
                Batal
              </button>
            </form>

            {/* Scrollable Suggestion & History Body */}
            <div className="overflow-y-auto p-4 space-y-4 max-h-[60vh]">
              {/* Section 1: SARAN BARANG (Fase 3) */}
              {inputValue.trim().length >= 2 && (
                <div>
                  <h4 className="text-xs font-semibold tracking-wider text-[#A1A1A6] uppercase mb-2">
                    SARAN BARANG
                  </h4>

                  {loadingSuggestions ? (
                    <div className="py-3 text-center text-xs text-[#A1A1A6]">
                      Mencari barang...
                    </div>
                  ) : suggestions.length > 0 ? (
                    <ul role="listbox" className="divide-y divide-[#2A2A2C]/60">
                      {suggestions.map((item) => (
                        <li key={item.id} role="option" aria-selected="false">
                          <button
                            type="button"
                            onClick={() => {
                              setIsExpanded(false);
                              router.push(`/katalog/${item.id}`);
                            }}
                            className="w-full h-12 flex items-center justify-between text-left hover:bg-[#2A2A2C]/40 px-2 rounded-xl transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                              <Search className="w-4 h-4 text-[#8E8E93] shrink-0" />
                              <span className="text-sm text-white font-medium truncate group-hover:text-[#32D74B] transition-colors">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-xs text-[#A1A1A6] font-mono shrink-0">
                              {formatIDR(item.price)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-3 text-center text-xs text-[#A1A1A6]">
                      Tidak ada saran untuk &ldquo;{inputValue}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: PENCARIAN TERAKHIR (Fase 3) */}
              {recentSearches.length > 0 && inputValue.trim().length === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-semibold tracking-wider text-[#A1A1A6] uppercase">
                      PENCARIAN TERAKHIR
                    </h4>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Hapus riwayat
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setInputValue(term);
                          handleSubmitSearch(term);
                        }}
                        className="h-10 px-3.5 rounded-full bg-[#2A2A2C] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#38383B] transition-colors cursor-pointer"
                      >
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bottom Sheet (Fase 2) */}
      <FilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentParams={currentParams}
        availableBranches={availableBranches}
        onApply={(applied) => {
          const updated = {
            ...currentParams,
            ...applied,
            cursor: undefined,
          };
          const qs = buildCatalogQueryString(updated);
          startTransition(() => {
            router.replace(qs || "/");
          });
        }}
      />
    </>
  );
}
export default SearchIsland;
