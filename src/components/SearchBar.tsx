"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [searchVal, setSearchVal] = useState("");

  // Sync state with URL search param
  useEffect(() => {
    setSearchVal(searchParams.get("q") || "");
  }, [searchParams]);

  // Debounce the router URL synchronization
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const currentQ = params.get("q") || "";
      if (searchVal === currentQ) return; // Skip if URL matches state

      if (searchVal) {
        params.set("q", searchVal);
      } else {
        params.delete("q");
      }
      const newUrl = pathname === "/" ? `?${params.toString()}` : `/?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchVal, pathname, router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
  };

  return (
    <div className="w-full max-w-2xl relative mx-auto">
      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
        <svg className="h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Cari barang..."
        value={searchVal}
        onChange={handleSearchChange}
        className="w-full pl-14 pr-6 py-4 text-base sm:text-lg text-slate-900 placeholder-slate-400 bg-white border border-slate-200/50 rounded-2xl shadow-md focus:shadow-lg focus:ring-4 focus:ring-blue-500/10 focus:outline-none text-left transition-all font-medium"
      />
    </div>
  );
}
