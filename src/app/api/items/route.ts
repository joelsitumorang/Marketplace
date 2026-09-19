import { Status } from '@prisma/client';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required SKU
    if (!body.sku || !body.sku.trim()) {
      return NextResponse.json(
        { success: false, message: "SKU wajib diisi." },
        { status: 400 }
      );
    }

    const trimmedSku = body.sku.trim();

    // Create parent and child variants atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create parent item
      const parentItem = await tx.auctionItem.create({
        data: {
          sku: trimmedSku,
          branchName: body.branchName,
          title: body.title,
          category: body.category,
          description: body.description,
          defects: body.defects || null,
          kondisi: body.kondisi,
          price: body.price,
          hargaMasuk: body.hargaMasuk !== undefined && body.hargaMasuk !== null ? Number(body.hargaMasuk) : null,
          status: Status.Tersedia,
          images: body.images || [],
          whatsappNumber: body.whatsappNumber,
          youtubeUrl: body.youtubeUrl || null,
          physicalItemId: body.physicalItemId || null,
          isMarketplaceVisible: false,
          hasWarranty: body.hasWarranty !== undefined ? body.hasWarranty : false,
          nomorInduk: trimmedSku,
          parentId: null,
          thumbnailIndex: body.thumbnailIndex !== undefined ? body.thumbnailIndex : 0,
        }
      });

      // Create variant children if any
      const createdVariants = [];
      if (body.variants && Array.isArray(body.variants)) {
        for (let idx = 0; idx < body.variants.length; idx++) {
          const v = body.variants[idx];
          const variantSku = `${trimmedSku}-${idx + 1}`;

          const childItem = await tx.auctionItem.create({
            data: {
              sku: variantSku,
              branchName: body.branchName,
              title: v.title,
              category: body.category,
              description: body.description,
              defects: body.defects || null,
              kondisi: body.kondisi,
              price: v.price,
              hargaJual: v.price,
              hargaMasuk: v.hargaMasuk !== undefined && v.hargaMasuk !== null ? Number(v.hargaMasuk) : (body.hargaMasuk !== undefined && body.hargaMasuk !== null ? Number(body.hargaMasuk) : null),
              status: Status.Tersedia,
              images: [v.imageUrl],
              variantImageUrl: v.imageUrl,
              whatsappNumber: body.whatsappNumber,
              youtubeUrl: body.youtubeUrl || null,
              physicalItemId: body.physicalItemId || null,
              isMarketplaceVisible: false,
              hasWarranty: body.hasWarranty !== undefined ? body.hasWarranty : false,
              nomorInduk: trimmedSku,
              parentId: parentItem.id,
              thumbnailIndex: 0,
            }
          });
          createdVariants.push(childItem);
        }
      }

      return { parentItem, variants: createdVariants };
    });

    const session = await getSession();
    const adminEmail = session?.email || "system@mbg.co.id";
    await logActivity({
      adminEmail,
      eventType: "Barang Masuk",
      productSku: result.parentItem.sku,
      productName: result.parentItem.title,
      description: `Menambahkan barang baru dengan SKU ${result.parentItem.sku}${result.variants.length > 0 ? ` serta ${result.variants.length} sub-barang (varian)` : ''}.`,
    });

    return NextResponse.json({ success: true, data: result.parentItem, variants: result.variants });
  } catch (error: any) {
    console.error("Failed to create item:", error);

    // Handle Prisma unique constraint violation on SKU
    if (error.code === "P2002" && error.meta?.target?.includes("sku")) {
      return NextResponse.json(
        { success: false, message: "Waduh, SKU sudah terdaftar di sistem! Silakan gunakan SKU lain." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");
    const category = searchParams.get("category");
    const searchQuery = searchParams.get("q");
    const nomorInduk = searchParams.get("nomorInduk");

    const selectFields = {
      id: true,
      sku: true,
      branchName: true,
      title: true,
      category: true,
      price: true,
      status: true,
      images: true,
      whatsappNumber: true,
      kondisi: true,
      isMarketplaceVisible: true,
      hasWarranty: true,
      nomorInduk: true,
      variantImageUrl: true,
      youtubeUrl: true,
      description: true,
      defects: true,
      hargaJual: true,
      hargaMasuk: true,
    };

    if (nomorInduk) {
      const items = await prisma.auctionItem.findMany({
        where: {
          nomorInduk,
          status: Status.Tersedia,
          isMarketplaceVisible: true,
        },
        select: selectFields,
        orderBy: { id: "asc" },
      });
      return NextResponse.json({
        success: true,
        data: JSON.parse(JSON.stringify(items)),
      });
    }

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

    const items = await prisma.auctionItem.findMany({
      where,
      select: selectFields,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.auctionItem.count({ where });

    // Serialize to prevent any Decimal parsing issues
    const serializedItems = JSON.parse(JSON.stringify(items));

    return NextResponse.json({
      success: true,
      data: serializedItems,
      hasMore: skip + items.length < total,
    });
  } catch (error: any) {
    console.error("Failed to fetch items:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
