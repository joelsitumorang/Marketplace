import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — List all PhysicalItem records with latest contract status, or fetch single by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const item = await prisma.physicalItem.findUnique({
        where: { id },
        include: {
          contracts: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!item) {
        return NextResponse.json(
          { success: false, message: "Barang fisik tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: JSON.parse(JSON.stringify(item)) });
    }

    const branch = searchParams.get("branch");
    const rack = searchParams.get("rack");
    const status = searchParams.get("status"); // filter by latest contract status
    const search = searchParams.get("q");

    const where: any = {};

    if (branch) {
      where.branchName = { contains: branch, mode: "insensitive" };
    }
    if (rack) {
      where.currentRack = { contains: rack, mode: "insensitive" };
    }
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { contracts: { some: { uniqueCode: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    const items = await prisma.physicalItem.findMany({
      where,
      include: {
        contracts: {
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { auctionItems: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // If filtering by status, post-filter by latest contract status
    let filtered = items;
    if (status) {
      filtered = items.filter((item) => {
        const latest = item.contracts[0];
        return latest && latest.status === status;
      });
    }

    const serialized = JSON.parse(JSON.stringify(filtered));

    return NextResponse.json({ success: true, data: serialized });
  } catch (error: any) {
    console.error("Failed to fetch physical items:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST — Create a new PhysicalItem with an initial PawnContract
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { itemName, category, serialNumber, branchName, currentRack, description, images, uniqueCode, customerName, appraisalValue, notes } = body;

    if (!itemName || !category || !branchName || !currentRack || !uniqueCode || !customerName || appraisalValue == null) {
      return NextResponse.json(
        { success: false, message: "Field wajib: itemName, category, branchName, currentRack, uniqueCode, customerName, appraisalValue." },
        { status: 400 }
      );
    }

    // Check for duplicate unique code
    const existing = await prisma.pawnContract.findUnique({ where: { uniqueCode } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kode unik "${uniqueCode}" sudah terdaftar di sistem!` },
        { status: 409 }
      );
    }

    const result = await prisma.physicalItem.create({
      data: {
        itemName,
        category,
        serialNumber: serialNumber || null,
        branchName,
        currentRack,
        description: description || null,
        images: images || [],
        contracts: {
          create: {
            uniqueCode,
            customerName,
            appraisalValue: parseFloat(appraisalValue),
            notes: notes || null,
            status: "AKTIF",
          },
        },
      },
      include: {
        contracts: true,
      },
    });

    const serialized = JSON.parse(JSON.stringify(result));
    return NextResponse.json({ success: true, data: serialized });
  } catch (error: any) {
    console.error("Failed to create physical item:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
