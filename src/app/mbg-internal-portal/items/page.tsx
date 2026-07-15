export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import ItemsTableClient from "./ItemsTableClient";

export default async function AdminItemsPage() {
  const items = await prisma.auctionItem.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sku: true,
      title: true,
      branchName: true,
      price: true,
      status: true,
      isMarketplaceVisible: true,
    }
  });

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

      <ItemsTableClient items={serializedItems} />
    </div>
  );
}
