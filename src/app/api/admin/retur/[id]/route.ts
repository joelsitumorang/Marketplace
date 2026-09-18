import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { Status } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized. Superadmin only." }, { status: 401 });
    }

    const { id } = await props.params;

    const body = await req.json();
    const { action, approvalNote } = body;

    if (!approvalNote || approvalNote.trim().length === 0) {
      return NextResponse.json({ success: false, message: "Catatan persetujuan harus diisi" }, { status: 400 });
    }

    if (action !== "DISETUJUI" && action !== "DITOLAK") {
      return NextResponse.json({ success: false, message: "Aksi tidak valid" }, { status: 400 });
    }

    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id },
      include: {
        salesTransaction: true,
        auctionItem: true,
      },
    });

    if (!salesReturn) {
      return NextResponse.json({ success: false, message: "Data retur tidak ditemukan" }, { status: 404 });
    }

    if (salesReturn.status !== "MENUNGGU_PERSETUJUAN") {
      return NextResponse.json({ success: false, message: "Retur ini tidak dalam status menunggu persetujuan" }, { status: 400 });
    }

    let updatedReturn;

    if (action === "DISETUJUI") {
      updatedReturn = await prisma.$transaction(async (tx) => {
        const retur = await tx.salesReturn.update({
          where: { id },
          data: {
            status: "DISETUJUI",
            approvedById: session.id,
            approvedAt: new Date(),
            approvalNote,
          },
        });

        const finalReasonNote = salesReturn.reasonNote || salesReturn.reason;

        await tx.salesTransaction.update({
          where: { id: salesReturn.salesTransactionId },
          data: {
            isReturned: true,
            returnReason: finalReasonNote,
          },
        });

        let itemStatus: Status = "RETUR";
        let isVisible = false;

        if (salesReturn.condition === "LAYAK_JUAL_ULANG") {
          itemStatus = "Tersedia";
          isVisible = true;
        }

        await tx.auctionItem.update({
          where: { id: salesReturn.auctionItemId },
          data: {
            status: itemStatus,
            isMarketplaceVisible: isVisible,
            returnReason: finalReasonNote,
          },
        });

        return retur;
      });

      await logActivity(
        session.id,
        "Retur Disetujui SUPERADMIN",
        `Retur SKU ${salesReturn.salesTransaction.sku} disetujui`
      );

      revalidatePath("/");
      revalidatePath(`/katalog/${salesReturn.auctionItemId}`);
    } else {
      updatedReturn = await prisma.salesReturn.update({
        where: { id },
        data: {
          status: "DITOLAK",
          approvedById: session.id,
          approvedAt: new Date(),
          approvalNote,
        },
      });

      await logActivity(
        session.id,
        "Retur Ditolak",
        `Retur SKU ${salesReturn.salesTransaction.sku} ditolak oleh SUPERADMIN`
      );
    }

    return NextResponse.json({ success: true, data: updatedReturn });
  } catch (error) {
    console.error("PATCH Return Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
