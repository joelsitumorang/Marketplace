import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import CatalogView from "./CatalogView";
import { parseCatalogParams } from "./_lib/params";
import { fetchCatalogData } from "./_lib/query";

export const revalidate = 30;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PublicHomePage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const catalogParams = parseCatalogParams(resolvedSearchParams);

  try {
    const [catalogResult, categoryGroups, branchGroups] = await Promise.all([
      fetchCatalogData(catalogParams, 20),
      prisma.auctionItem.groupBy({
        by: ["category"],
        where: {
          branchName: {
            contains: "Pasuruan",
            mode: "insensitive",
          },
          status: Status.Tersedia,
          isMarketplaceVisible: true,
        },
      }),
      prisma.auctionItem.groupBy({
        by: ["branchName"],
        where: {
          status: Status.Tersedia,
          isMarketplaceVisible: true,
        },
      }),
    ]);

    const categories = categoryGroups.map((c) => c.category).filter(Boolean);
    const branches = branchGroups.map((b) => b.branchName).filter(Boolean);

    return (
      <div className="w-full pb-20">
        <CatalogView
          initialItems={catalogResult.items}
          totalCount={catalogResult.total}
          initialHasMore={catalogResult.hasMore}
          params={catalogParams}
          categories={categories}
          branches={branches}
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
            Terjadi masalah saat menghubungkan ke database. Silakan pastikan variabel lingkungan <strong>DATABASE_URL</strong> dan <strong>DIRECT_URL</strong> sudah dikonfigurasi dengan benar.
          </p>
        </div>
      </div>
    );
  }
}
