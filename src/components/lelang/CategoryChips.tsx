"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Smartphone,
  Bike,
  Wrench,
  Shirt,
  Home,
  Package,
} from "lucide-react";
import { parseCatalogParams, buildCatalogQueryString } from "@/app/(public)/_lib/params";

interface CategoryChipsProps {
  categories: string[];
  activeCategory: string;
}

function getCategoryIcon(catName: string) {
  const lower = catName.toLowerCase();
  if (lower === "" || lower.includes("semua")) return <LayoutGrid className="w-4 h-4 shrink-0" />;
  if (lower.includes("elektronik") || lower.includes("hp") || lower.includes("laptop"))
    return <Smartphone className="w-4 h-4 shrink-0" />;
  if (lower.includes("kendaraan") || lower.includes("motor") || lower.includes("mobil") || lower.includes("sepeda"))
    return <Bike className="w-4 h-4 shrink-0" />;
  if (lower.includes("alat tukang") || lower.includes("perkakas") || lower.includes("bengkel"))
    return <Wrench className="w-4 h-4 shrink-0" />;
  if (lower.includes("pakaian") || lower.includes("baju") || lower.includes("fashion"))
    return <Shirt className="w-4 h-4 shrink-0" />;
  if (lower.includes("rumah tangga") || lower.includes("perabot") || lower.includes("dapur"))
    return <Home className="w-4 h-4 shrink-0" />;
  return <Package className="w-4 h-4 shrink-0" />;
}

export function CategoryChips({ categories, activeCategory }: CategoryChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active category chip into view
  useEffect(() => {
    if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeCategory]);

  const handleSelect = (category: string) => {
    const currentParams = parseCatalogParams(searchParams);
    const newCategory = category === "Semua" || category === "Semua Kategori" ? "" : category;
    
    // Perubahan kategori mereset cursor pagination tapi mempertahankan q, sort, filter lain
    const updated = {
      ...currentParams,
      category: newCategory,
      cursor: undefined,
    };

    const qs = buildCatalogQueryString(updated);
    router.replace(qs || "/");
  };

  const allList = ["Semua", ...categories.filter((c) => c && c !== "Semua" && c !== "Semua Kategori")];

  return (
    <div className="w-full overflow-x-auto no-scrollbar hide-scrollbar py-2 px-4 sm:px-6">
      <div className="flex items-center gap-2 min-w-max">
        {allList.map((cat) => {
          const isSemua = cat === "Semua";
          const isActive = isSemua
            ? !activeCategory || activeCategory === "Semua Kategori"
            : activeCategory.toLowerCase() === cat.toLowerCase();

          return (
            <button
              key={cat}
              ref={isActive ? activeBtnRef : undefined}
              type="button"
              onClick={() => handleSelect(cat)}
              className={`h-11 px-4 rounded-[22px] text-sm font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer select-none ${
                isActive
                  ? "bg-[#111111] text-white shadow-sm border-transparent"
                  : "bg-white text-[#333333] border border-[#E4E4DF] hover:bg-slate-50"
              }`}
            >
              {getCategoryIcon(cat)}
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
