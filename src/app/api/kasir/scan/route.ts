import { Status } from '@prisma/client';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");

  if (!sku) {
    return NextResponse.json({ success: false, message: "SKU is required" }, { status: 400 });
  }

  try {
    const item = await prisma.auctionItem.findUnique({
      where: { sku },
      select: {
        id: true,
        sku: true,
        title: true,
        price: true,
        branchName: true,
        status: true,
      }
    });

    if (!item) {
      return NextResponse.json({ success: false, message: "Barang tidak ditemukan di katalog." }, { status: 404 });
    }

    if (item.status === Status.Terjual) {
      return NextResponse.json({ success: false, message: `Barang dengan SKU ${sku} sudah berstatus TERJUAL.` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
