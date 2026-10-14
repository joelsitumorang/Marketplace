import { prisma } from "@/lib/prisma";
import { Status, Kondisi, Prisma, TransactionStatus } from "@prisma/client";
import { CatalogParams, PRICE_PRESETS } from "./params";
import {
  PublicStatus,
  derivePublicStatus,
  extractKeySpecs,
  formatProductTitle,
} from "@/lib/product-display";

/** Barang terjual tetap tampil (di urutan bawah) selama sekian hari setelah transaksi. */
export const SOLD_VISIBLE_DAYS = 7;

export const catalogItemSelect = {
  id: true,
  sku: true,
  branchName: true,
  title: true,
  category: true,
  // Hanya dibaca di server untuk ekstraksi spesifikasi, tidak dikirim ke browser
  description: true,
  price: true,
  status: true,
  images: true,
  thumbnailIndex: true,
  kondisi: true,
  createdAt: true,
  isMarketplaceVisible: true,
  transactions: {
    where: { isReturned: false },
    orderBy: { transactionDate: "desc" },
    take: 1,
    select: { status: true },
  },
} satisfies Prisma.AuctionItemSelect;

type CatalogItemRow = Prisma.AuctionItemGetPayload<{ select: typeof catalogItemSelect }>;

export type CatalogItemSummary = {
  id: number;
  sku: string;
  branchName: string;
  title: string;
  /** Judul yang sudah dirapikan untuk tampilan */
  displayTitle: string;
  /** Maksimal 2 spesifikasi kunci, mis. ["128GB", "BH 84%"] */
  specs: string[];
  publicStatus: PublicStatus;
  category: string;
  price: number;
  status: Status;
  images: string[];
  thumbnailIndex: number | null;
  kondisi: Kondisi;
  createdAt: string;
};

/** Filter dari URL (kategori, kondisi, harga, cabang, kata kunci) tanpa aturan status. */
export function buildCatalogFilterWhere(params: CatalogParams): Prisma.AuctionItemWhereInput {
  const where: Prisma.AuctionItemWhereInput = {
    branchName: {
      contains: "Pasuruan",
      mode: "insensitive",
    },
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

const ACTIVE_DP_TRANSACTION: Prisma.SalesTransactionWhereInput = {
  isReturned: false,
  status: TransactionStatus.DP,
};

/** Grup atas: Tersedia + Dibooking (status Dipesan, atau Terjual dengan DP aktif). */
const ACTIVE_STATUS_WHERE: Prisma.AuctionItemWhereInput = {
  OR: [
    { status: { in: [Status.Tersedia, Status.Dipesan] } },
    { status: Status.Terjual, transactions: { some: ACTIVE_DP_TRANSACTION } },
  ],
};

/** Grup bawah: Terjual lunas dalam SOLD_VISIBLE_DAYS hari terakhir. */
function buildSoldStatusWhere(now = new Date()): Prisma.AuctionItemWhereInput {
  const cutoff = new Date(now.getTime() - SOLD_VISIBLE_DAYS * 24 * 60 * 60 * 1000);
  return {
    status: Status.Terjual,
    transactions: {
      some: { isReturned: false, transactionDate: { gte: cutoff } },
      none: ACTIVE_DP_TRANSACTION,
    },
  };
}

/** Kompatibilitas: where untuk barang yang bisa dibeli/dibooking. */
export function buildCatalogWhere(params: CatalogParams): Prisma.AuctionItemWhereInput {
  return { AND: [buildCatalogFilterWhere(params), ACTIVE_STATUS_WHERE] };
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

export function serializeItems(items: CatalogItemRow[]): CatalogItemSummary[] {
  return items.map((item) => ({
    id: item.id,
    sku: item.sku,
    branchName: item.branchName,
    title: item.title,
    displayTitle: formatProductTitle(item.title),
    specs: extractKeySpecs({ title: item.title, description: item.description }),
    publicStatus: derivePublicStatus(item.status, item.transactions[0]?.status ?? null),
    category: item.category,
    price: Number(item.price),
    status: item.status,
    images: item.images || [],
    thumbnailIndex: item.thumbnailIndex ?? 0,
    kondisi: item.kondisi,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
  }));
}

/**
 * Mengambil satu halaman katalog: barang tersedia/dibooking lebih dulu,
 * lalu barang terjual di urutan bawah. `skip` dihitung lintas kedua grup.
 */
export async function fetchCatalogPage(params: CatalogParams, skip = 0, take = 20) {
  const filter = buildCatalogFilterWhere(params);
  const orderBy = buildCatalogOrderBy(params.sort);
  const activeWhere: Prisma.AuctionItemWhereInput = { AND: [filter, ACTIVE_STATUS_WHERE] };
  const soldWhere: Prisma.AuctionItemWhereInput = { AND: [filter, buildSoldStatusWhere()] };

  const [activeTotal, soldTotal, activeItems] = await Promise.all([
    prisma.auctionItem.count({ where: activeWhere }),
    prisma.auctionItem.count({ where: soldWhere }),
    prisma.auctionItem.findMany({
      where: activeWhere,
      select: catalogItemSelect,
      orderBy,
      skip,
      take,
    }),
  ]);

  const rows: CatalogItemRow[] = [...activeItems];
  const remaining = take - rows.length;

  if (remaining > 0 && soldTotal > 0) {
    const soldItems = await prisma.auctionItem.findMany({
      where: soldWhere,
      select: catalogItemSelect,
      orderBy,
      skip: Math.max(0, skip - activeTotal),
      take: remaining,
    });
    rows.push(...soldItems);
  }

  const total = activeTotal + soldTotal;

  return {
    items: serializeItems(rows),
    total,
    hasMore: skip + rows.length < total,
  };
}

export async function fetchCatalogData(params: CatalogParams, pageSize = 20) {
  return fetchCatalogPage(params, 0, pageSize);
}
