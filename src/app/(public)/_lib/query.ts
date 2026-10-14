import { prisma } from "@/lib/prisma";
import { Status, Kondisi, Prisma } from "@prisma/client";
import { CatalogParams, PRICE_PRESETS } from "./params";

export const catalogItemSelect = {
  id: true,
  sku: true,
  branchName: true,
  title: true,
  category: true,
  price: true,
  status: true,
  images: true,
  thumbnailIndex: true,
  kondisi: true,
  createdAt: true,
  isMarketplaceVisible: true,
} as const;

export type CatalogItemSummary = {
  id: number;
  sku: string;
  branchName: string;
  title: string;
  category: string;
  price: number;
  status: Status;
  images: string[];
  thumbnailIndex: number | null;
  kondisi: Kondisi;
  createdAt: string;
};

export function buildCatalogWhere(params: CatalogParams): Prisma.AuctionItemWhereInput {
  const where: Prisma.AuctionItemWhereInput = {
    branchName: {
      contains: "Pasuruan",
      mode: "insensitive",
    },
    status: Status.Tersedia,
    isMarketplaceVisible: true,
  };

  // 1. Kategori
  if (params.category && params.category !== "Semua Kategori") {
    where.category = params.category;
  }

  // 2. Kondisi
  if (params.kondisi) {
    where.kondisi = params.kondisi === "baru" ? Kondisi.Baru : Kondisi.Bekas;
  }

  // 3. Rentang Harga Preset
  if (params.harga && PRICE_PRESETS[params.harga]) {
    const preset = PRICE_PRESETS[params.harga];
    const priceFilter: Prisma.DecimalFilter = {};
    if (preset.min !== undefined) {
      priceFilter.gte = preset.min;
    }
    if (preset.max !== undefined) {
      priceFilter.lt = preset.max;
    }
    where.price = priceFilter;
  }

  // 4. Multi-cabang (jika ada param cabang dan diizinkan)
  if (params.cabang) {
    where.branchName = {
      contains: params.cabang,
      mode: "insensitive",
    };
  }

  // 5. Query Pencarian (Tokenized AND matching across title, sku, or category)
  if (params.q) {
    const rawTokens = params.q.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    if (rawTokens.length > 0) {
      where.AND = rawTokens.map((t) => ({
        OR: [
          { title: { contains: t, mode: "insensitive" } },
          { sku: { contains: t, mode: "insensitive" } },
          { category: { contains: t, mode: "insensitive" } },
        ],
      }));
    }
  }

  return where;
}

export function buildCatalogOrderBy(
  sort: CatalogParams["sort"]
): Prisma.AuctionItemOrderByWithRelationInput[] {
  switch (sort) {
    case "harga_asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "harga_desc":
      return [{ price: "desc" }, { id: "desc" }];
    case "terbaru":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export function serializeItems(items: any[]): CatalogItemSummary[] {
  return items.map((item) => ({
    id: item.id,
    sku: item.sku,
    branchName: item.branchName,
    title: item.title,
    category: item.category,
    price: Number(item.price),
    status: item.status,
    images: item.images || [],
    thumbnailIndex: item.thumbnailIndex ?? 0,
    kondisi: item.kondisi,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
  }));
}

export async function fetchCatalogData(params: CatalogParams, pageSize = 20) {
  const where = buildCatalogWhere(params);
  const orderBy = buildCatalogOrderBy(params.sort);

  const [items, total] = await Promise.all([
    prisma.auctionItem.findMany({
      where,
      select: catalogItemSelect,
      orderBy,
      take: pageSize,
    }),
    prisma.auctionItem.count({ where }),
  ]);

  return {
    items: serializeItems(items),
    total,
    hasMore: items.length < total,
  };
}
