"use server";

import { prisma } from "@/lib/prisma";
import { Status, Prisma } from "@prisma/client";
import { CatalogParams } from "./params";
import { fetchCatalogPage } from "./query";
import { formatProductTitle } from "@/lib/product-display";

export async function loadMoreCatalogItems(params: CatalogParams, skip: number, take = 20) {
  return fetchCatalogPage(params, skip, take);
}

export async function suggestItems(q: string) {
  const cleanQ = (q || "").trim();
  if (cleanQ.length < 2) return [];

  const rawTokens = cleanQ.split(/\s+/).filter(Boolean).slice(0, 3);
  const where: Prisma.AuctionItemWhereInput = {
    branchName: {
      contains: "Pasuruan",
      mode: "insensitive",
    },
    status: Status.Tersedia,
    isMarketplaceVisible: true,
    AND: rawTokens.map((t) => ({
      OR: [
        { title: { contains: t, mode: "insensitive" } },
        { sku: { contains: t, mode: "insensitive" } },
      ],
    })),
  };

  const suggestions = await prisma.auctionItem.findMany({
    where,
    select: {
      id: true,
      sku: true,
      title: true,
      price: true,
      category: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return suggestions.map((s) => ({
    id: s.id,
    sku: s.sku,
    title: formatProductTitle(s.title),
    price: Number(s.price),
    category: s.category,
  }));
}
