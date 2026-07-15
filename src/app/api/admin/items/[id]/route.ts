import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { Status } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/items/[id]
 * Retrieves the complete detail of an item, used to pre-fill the edit form.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tidak terautentikasi." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, message: "ID item tidak valid." },
        { status: 400 }
      );
    }

    const item = await prisma.auctionItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(item)),
    });
  } catch (error: any) {
    console.error("Failed to fetch item detail:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/items/[id]
 * Securely updates all editable product fields. Requires SUPERADMIN.
 * Prevents mutating unrelated status/marketplace visibility.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tidak terautentikasi." },
        { status: 401 }
      );
    }

    if (session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Hanya Superadmin yang dapat mengedit barang secara penuh." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, message: "ID item tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate SKU
    if (!body.sku || !body.sku.trim()) {
      return NextResponse.json(
        { success: false, message: "SKU wajib diisi." },
        { status: 400 }
      );
    }

    const trimmedSku = body.sku.trim();

    // Verify product exists
    const dbItem = await prisma.auctionItem.findUnique({ where: { id: itemId } });
    if (!dbItem) {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }

    // Prepare update data securely (only mutating form fields, not status, visibility, etc.)
    const updateData: any = {
      sku: trimmedSku,
      title: body.title?.trim(),
      category: body.category,
      kondisi: body.kondisi,
      price: Number(body.price),
      hargaMasuk: body.hargaMasuk !== undefined && body.hargaMasuk !== null ? Number(body.hargaMasuk) : null,
      whatsappNumber: body.whatsappNumber?.trim(),
      youtubeUrl: body.youtubeUrl?.trim() || null,
      hasWarranty: !!body.hasWarranty,
      description: body.description?.trim(),
      defects: body.defects?.trim() || null,
      images: body.images || [],
      nomorInduk: body.nomorInduk?.trim() || null,
    };

    const updatedItem = await prisma.auctionItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Revalidate paths
    revalidatePath("/");
    revalidatePath(`/katalog/${itemId}`);

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(updatedItem)),
    });
  } catch (error: any) {
    console.error("Failed to fully update item:", error);

    if (error.code === "P2002" && error.meta?.target?.includes("sku")) {
      return NextResponse.json(
        { success: false, message: "Waduh, SKU sudah terdaftar di sistem! Silakan gunakan SKU lain." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/items/[id]
 * Updates specific fields (e.g. visibility toggle or status transitions).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tidak terautentikasi." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, message: "ID item tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const dbItem = await prisma.auctionItem.findUnique({ where: { id: itemId } });
    if (!dbItem) {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }

    // 1. Handle special status RETUR trigger (only sold items can be returned, requires SUPERADMIN)
    if (body.status === "RETUR") {
      if (session.role !== "SUPERADMIN") {
        return NextResponse.json(
          { success: false, message: "Akses ditolak. Hanya Superadmin yang dapat memproses retur barang." },
          { status: 403 }
        );
      }

      if (dbItem.status !== "Terjual") {
        return NextResponse.json(
          { success: false, message: "Hanya barang dengan status TERJUAL yang dapat diretur." },
          { status: 400 }
        );
      }

      const returnReasonText = body.returnReason?.trim() || "Tidak ada alasan";

      console.log(`[STATUS_LOG] Item id ${itemId} status transitioning from Terjual to RETUR`);

      // Update item to RETUR status first to track status change, and save the return reason
      await prisma.auctionItem.update({
        where: { id: itemId },
        data: {
          status: "RETUR",
          returnReason: returnReasonText,
        },
      });

      // Instead of deleting the SalesTransaction records to deduct revenue,
      // flag them as returned and store the return reason
      const updateTxResult = await prisma.salesTransaction.updateMany({
        where: { itemId },
        data: {
          isReturned: true,
          returnReason: returnReasonText,
        },
      });
      console.log(`[REVENUE_LOG] Flagged sales transactions as returned for item id ${itemId}. Count: ${updateTxResult.count}`);

      // Log: transitioning to Tersedia
      console.log(`[STATUS_LOG] Item id ${itemId} status transitioning from RETUR to Tersedia`);

      // Immediately flag to Tersedia again for re-listing
      const updatedItem = await prisma.auctionItem.update({
        where: { id: itemId },
        data: { status: "Tersedia" },
      });

      // Write Audit Log for return
      await logActivity({
        adminEmail: session.email,
        eventType: "Barang Retur",
        productSku: dbItem.sku,
        productName: dbItem.title,
        description: `Barang diretur oleh ${session.email}. Alasan: ${returnReasonText}`,
      });

      // Purge public catalog cache
      revalidatePath("/");
      revalidatePath(`/katalog/${itemId}`);

      return NextResponse.json({
        success: true,
        message: "Barang berhasil diretur dan tersedia kembali.",
        data: JSON.parse(JSON.stringify(updatedItem)),
      });
    }

    // Determine if this is a visibility-only toggle or a field edit
    const isVisibilityToggleOnly =
      Object.keys(body).length === 1 && "isMarketplaceVisible" in body;

    // Field edits require SUPERADMIN
    if (!isVisibilityToggleOnly && session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Hanya Superadmin yang dapat mengedit barang." },
        { status: 403 }
      );
    }

    // Build the update data object safely
    const updateData: any = {};

    if ("title" in body && typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim();
    }
    if ("price" in body && !isNaN(Number(body.price))) {
      updateData.price = Number(body.price);
    }
    if ("status" in body && ["Tersedia", "Dipesan", "Terjual", "RETUR"].includes(body.status)) {
      updateData.status = body.status;
    }
    if ("isMarketplaceVisible" in body && typeof body.isMarketplaceVisible === "boolean") {
      updateData.isMarketplaceVisible = body.isMarketplaceVisible;
    }
    if ("hasWarranty" in body && typeof body.hasWarranty === "boolean") {
      updateData.hasWarranty = body.hasWarranty;
    }
    if ("hargaMasuk" in body) {
      updateData.hargaMasuk = body.hargaMasuk !== null && body.hargaMasuk !== undefined ? Number(body.hargaMasuk) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang diperbarui." },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.auctionItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Write audit logs for status changes if updated
    if (updateData.status && updateData.status !== dbItem.status) {
      if (updateData.status === "Terjual") {
        await logActivity({
          adminEmail: session.email,
          eventType: "Barang Terjual",
          productSku: updatedItem.sku,
          productName: updatedItem.title,
          description: `Status barang diubah secara manual menjadi Terjual oleh ${session.email}.`,
        });
      } else if (updateData.status === "Dipesan") {
        await logActivity({
          adminEmail: session.email,
          eventType: "Barang Dipersiapkan / Dipesan",
          productSku: updatedItem.sku,
          productName: updatedItem.title,
          description: `Status barang diubah menjadi Dipesan (Dipersiapkan) oleh ${session.email}.`,
        });
      }
    }

    // Purge public catalog cache
    revalidatePath("/");
    revalidatePath(`/katalog/${itemId}`);

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(updatedItem)),
    });
  } catch (error: any) {
    console.error("Failed to update item:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/items/[id]
 * Deletes an item. Requires SUPERADMIN role.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tidak terautentikasi." },
        { status: 401 }
      );
    }

    if (session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak. Hanya Superadmin yang dapat menghapus barang." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, message: "ID item tidak valid." },
        { status: 400 }
      );
    }

    await prisma.auctionItem.delete({
      where: { id: itemId },
    });

    // Purge public catalog cache
    revalidatePath("/");
    revalidatePath(`/katalog/${itemId}`);

    return NextResponse.json({ success: true, message: "Barang berhasil dihapus." });
  } catch (error: any) {
    console.error("Failed to delete item:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
