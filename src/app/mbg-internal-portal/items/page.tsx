export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import ItemsTableClient from "./ItemsTableClient";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminItemsPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const currentPage = Math.max(1, Number(resolvedParams.page || "1"));
  const limit = Math.max(1, Number(resolvedParams.limit || "10"));
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";

  const skip = (currentPage - 1) * limit;

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, totalCount] = await prisma.$transaction([
    prisma.auctionItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        sku: true,
        title: true,
        branchName: true,
        price: true,
        status: true,
        isMarketplaceVisible: true,
      }
    }),
    prisma.auctionItem.count({ where })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  // Serialize Decimal to number for client component
  const serializedItems = items.map((item) => ({
    id: item.id,
    sku: item.sku,
    title: item.title,
    branchName: item.branchName,
    price: Number(item.price),
    status: item.status,
    isMarketplaceVisible: item.isMarketplaceVisible,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 w-full mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Manajemen Barang</h1>
        <Link 
          href="/mbg-internal-portal/items/new" 
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm whitespace-nowrap active:scale-95 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Tambah Barang
        </Link>
      </div>

      <ItemsTableClient 
        items={serializedItems}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        initialSearchQuery={q}
      />
    </div>
  );
}
