import { Status } from '@prisma/client';
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CatalogDetailClient from "./CatalogDetailClient";

export const revalidate = 30;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DetailPage({ params }: Props) {
  const { id } = await params;

  const selectFields = {
    id: true,
    sku: true,
    branchName: true,
    title: true,
    category: true,
    description: true,
    defects: true,
    kondisi: true,
    price: true,
    status: true,
    images: true,
    whatsappNumber: true,
    youtubeUrl: true,
    createdAt: true,
    isMarketplaceVisible: true,
    nomorInduk: true,
    variantImageUrl: true,
    viewCount: true,
    thumbnailIndex: true,
  };

  const item = await prisma.auctionItem.findUnique({
    where: { id: parseInt(id) },
    select: selectFields,
  });

  if (!item || !item.isMarketplaceVisible) {
    notFound();
  }

  // Increment view_count (fire & forget, catch errors to not crash render)
  prisma.auctionItem.update({
    where: { id: item.id },
    data: { viewCount: { increment: 1 } },
  }).catch((e) => console.error("Failed to update view count", e));

  // Fetch all active variants sharing the same nomorInduk
  const variants = item.nomorInduk ? await prisma.auctionItem.findMany({
    where: {
      nomorInduk: item.nomorInduk,
      status: Status.Tersedia,
      isMarketplaceVisible: true,
    },
    select: selectFields,
    orderBy: { id: "asc" },
  }) : [];

  // Make sure the main selected item itself is included in the variants list if it's active but might not have returned
  const allVariants = [...variants];
  if (!variants.some(v => v.id === item.id)) {
    allVariants.unshift(item);
  }

  // Serialize Decimals for Client Component
  const serializedItem = {
    ...item,
    price: Number(item.price),
  };

  const serializedVariants = allVariants.map(v => ({
    ...v,
    price: Number(v.price),
  }));

  return (
    <CatalogDetailClient 
      initialItem={serializedItem} 
      variants={serializedVariants} 
    />
  );
}
