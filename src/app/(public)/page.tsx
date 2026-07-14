import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import CatalogView from "./CatalogView";

export const revalidate = 30;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PublicHomePage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const branchFilter = resolvedParams.branch as string | undefined;
  const category = resolvedParams.category as string | undefined;
  const searchQuery = resolvedParams.q as string | undefined;

  const where: any = {
    branchName: {
      contains: "Pasuruan",
      mode: "insensitive" as const,
    },
    status: Status.Tersedia,
    isMarketplaceVisible: true,
  };

  if (category && category !== "Semua Kategori") {
    where.category = category;
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const items = await prisma.auctionItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const categories = await prisma.auctionItem.groupBy({
      by: ["category"],
      where: {
        branchName: {
          contains: "Pasuruan",
          mode: "insensitive" as const,
        },
        status: Status.Tersedia,
        isMarketplaceVisible: true,
      },
    });

    const branches = await prisma.auctionItem.groupBy({
      by: ["branchName"],
      where: {
        isMarketplaceVisible: true,
      },
    });

    // Serialize items to prevent "Only plain objects can be passed to Client Components" error
    const serializedItems = JSON.parse(JSON.stringify(items));

    return (
      <div className="w-full pb-20">
        <CatalogView 
          items={serializedItems}
          categories={categories}
          branches={branches}
          branchFilter={branchFilter}
          initialCategory={category || "Semua Kategori"}
          initialSearchQuery={searchQuery || ""}
        />
      </div>
    );
  } catch (error) {
    console.error("Database connection error in PublicHomePage:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-red-50 text-red-800 border border-red-200 rounded-3xl p-8 max-w-md shadow-md">
          <h2 className="text-xl font-extrabold mb-3">Gagal Menghubungkan ke Database</h2>
          <p className="text-sm mb-4 leading-relaxed text-red-700">
            Terjadi masalah saat menghubungkan ke database. Silakan pastikan variabel lingkungan <strong>DATABASE_URL</strong> dan <strong>DIRECT_URL</strong> sudah dikonfigurasi dengan benar di Vercel Dashboard.
          </p>
          <div className="text-xs text-red-600/70 border-t border-red-100 pt-4 text-left">
            <strong>Catatan:</strong> Jika Anda baru saja membuat proyek di Vercel, pastikan Anda telah memasukkan nilai database connection string dari Supabase/PostgreSQL.
          </div>
        </div>
      </div>
    );
  }
}
