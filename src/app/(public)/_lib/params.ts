export type SortOption = "terbaru" | "harga_asc" | "harga_desc";

export type KondisiOption = "baru" | "bekas";

export type HargaPreset = "lt500k" | "500k-2m" | "2m-5m" | "5m-10m" | "gt10m";

export interface PriceRange {
  min?: number;
  max?: number;
  label: string;
}

export const PRICE_PRESETS: Record<HargaPreset, PriceRange> = {
  lt500k: { max: 500000, label: "< 500rb" },
  "500k-2m": { min: 500000, max: 2000000, label: "500rb–2jt" },
  "2m-5m": { min: 2000000, max: 5000000, label: "2–5 jt" },
  "5m-10m": { min: 5000000, max: 10000000, label: "5–10 jt" },
  gt10m: { min: 10000000, label: "> 10 jt" },
};

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "terbaru", label: "Terbaru" },
  { id: "harga_asc", label: "Harga terendah" },
  { id: "harga_desc", label: "Harga tertinggi" },
];

export interface CatalogParams {
  q: string;
  sort: SortOption;
  category: string;
  kondisi?: KondisiOption;
  harga?: HargaPreset;
  cabang?: string;
  cursor?: string;
}

const VALID_SORTS: Set<string> = new Set(["terbaru", "harga_asc", "harga_desc"]);
const VALID_KONDISI: Set<string> = new Set(["baru", "bekas"]);
const VALID_HARGA: Set<string> = new Set(["lt500k", "500k-2m", "2m-5m", "5m-10m", "gt10m"]);

export function parseCatalogParams(
  rawParams: Record<string, string | string[] | undefined> | URLSearchParams
): CatalogParams {
  const get = (key: string): string | undefined => {
    if (rawParams instanceof URLSearchParams) {
      const v = rawParams.get(key);
      return v !== null ? v : undefined;
    }
    const val = rawParams[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  // 1. q: trim, collapse spaces, max 60 chars
  const rawQ = (get("q") || "").trim().replace(/\s+/g, " ");
  const q = rawQ.slice(0, 60);

  // 2. sort
  const rawSort = get("sort") || "terbaru";
  const sort: SortOption = VALID_SORTS.has(rawSort) ? (rawSort as SortOption) : "terbaru";

  // 3. category
  const rawCategory = get("category") || "";
  const category = rawCategory && rawCategory !== "Semua Kategori" ? rawCategory.trim() : "";

  // 4. kondisi
  const rawKondisi = get("kondisi");
  const kondisi: KondisiOption | undefined =
    rawKondisi && VALID_KONDISI.has(rawKondisi.toLowerCase())
      ? (rawKondisi.toLowerCase() as KondisiOption)
      : undefined;

  // 5. harga
  const rawHarga = get("harga");
  const harga: HargaPreset | undefined =
    rawHarga && VALID_HARGA.has(rawHarga.toLowerCase())
      ? (rawHarga.toLowerCase() as HargaPreset)
      : undefined;

  // 6. cabang (whitelist/sanitize)
  const rawCabang = (get("cabang") || "").trim();
  const cabang = rawCabang ? rawCabang.slice(0, 50) : undefined;

  // 7. cursor
  const rawCursor = (get("cursor") || "").trim();
  const cursor = rawCursor ? rawCursor.slice(0, 100) : undefined;

  return {
    q,
    sort,
    category,
    kondisi,
    harga,
    cabang,
    cursor,
  };
}

export function serializeCatalogParams(params: Partial<CatalogParams>): URLSearchParams {
  const sp = new URLSearchParams();

  if (params.q && params.q.trim()) {
    sp.set("q", params.q.trim());
  }

  if (params.sort && params.sort !== "terbaru" && VALID_SORTS.has(params.sort)) {
    sp.set("sort", params.sort);
  }

  if (params.category && params.category !== "Semua Kategori") {
    sp.set("category", params.category);
  }

  if (params.kondisi && VALID_KONDISI.has(params.kondisi)) {
    sp.set("kondisi", params.kondisi);
  }

  if (params.harga && VALID_HARGA.has(params.harga)) {
    sp.set("harga", params.harga);
  }

  if (params.cabang && params.cabang.trim()) {
    sp.set("cabang", params.cabang.trim());
  }

  if (params.cursor && params.cursor.trim()) {
    sp.set("cursor", params.cursor.trim());
  }

  return sp;
}

export function buildCatalogQueryString(params: Partial<CatalogParams>): string {
  const sp = serializeCatalogParams(params);
  const str = sp.toString();
  return str ? `?${str}` : "";
}

/**
 * Menghitung jumlah grup filter aktif (kondisi, harga, cabang).
 * Catatan sesuai Brief Bagian 5.3 & 15.1: `sort`, `category`, dan `q` tidak dihitung.
 */
export function countActiveFilters(params: CatalogParams): number {
  let count = 0;
  if (params.kondisi) count++;
  if (params.harga) count++;
  if (params.cabang) count++;
  return count;
}
