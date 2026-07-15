import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { PawnStatus } from "@prisma/client";
import { checkAndTransitionExpiredContracts } from "@/lib/gudang";

export async function GET(request: Request) {
  // Session check
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("mbg_session")?.value;
  const session = await decrypt(sessionCookie);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // Auto-transition expired active contracts to PROSES_LELANG
  await checkAndTransitionExpiredContracts();

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = parseInt(searchParams.get("skip") || "0");

  try {
    let whereClause: any = {};

    if (tab === "STOK_AKTIF") {
      whereClause = { status: PawnStatus.AKTIF };
    } else if (tab === "PERPANJANG") {
      whereClause = { status: PawnStatus.PERPANJANG };
    } else if (tab === "PROSES_LELANG") {
      whereClause = { status: PawnStatus.PROSES_LELANG };
    } else if (tab === "ETALASE_LELANG") {
      whereClause = { status: PawnStatus.LELANG };
    } else if (tab === "ARSIP") {
      whereClause = { status: { in: [PawnStatus.TERJUAL, PawnStatus.TEBUS] } };
    }

    const [contracts, total] = await Promise.all([
      prisma.pawnContract.findMany({
        where: whereClause,
        include: { physicalItem: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pawnContract.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({ success: true, data: contracts, total });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("mbg_session")?.value;
  const session = await decrypt(sessionCookie);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "CREATE_NEW") {
      const { itemName, category, serialNumber, description, uniqueCode, customerName, customerPhone, appraisalValue, pawnEnteredAt, dueDate } = body;
      
      const branchName = "Cabang Pasuruan - Sangar"; // Enforced default
      const currentRack = ""; // Deprecated

      const startDate = pawnEnteredAt ? new Date(pawnEnteredAt) : new Date();
      const endDate = dueDate ? new Date(dueDate) : new Date(startDate);
      if (!dueDate) {
        if (category === "ELEKTRONIK") endDate.setMonth(endDate.getMonth() + 1);
        else if (category === "GERABAHAN") endDate.setMonth(endDate.getMonth() + 4);
        else if (category === "KENDARAAN") endDate.setMonth(endDate.getMonth() + 2);
        else endDate.setMonth(endDate.getMonth() + 1);
      }

      const result = await prisma.$transaction(async (tx) => {
        const physicalItem = await tx.physicalItem.create({
          data: { itemName, category, serialNumber, branchName, currentRack, description }
        });

        const contract = await tx.pawnContract.create({
          data: {
            uniqueCode,
            customerName,
            customerPhone: customerPhone || null,
            appraisalValue: parseFloat(appraisalValue),
            physicalItemId: physicalItem.id,
            status: PawnStatus.AKTIF,
            startDate,
            endDate,
            previousSku: null,
            extensionCount: 0,
          }
        });
        return contract;
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "PERPANJANG") {
      const { contractId, newUniqueCode, extensionDate, extensionFee } = body;
      
      const oldContract = await prisma.pawnContract.findUnique({ where: { id: contractId }, include: { physicalItem: true } });
      if (!oldContract) throw new Error("Contract not found");

      const startDate = extensionDate ? new Date(extensionDate) : new Date();
      const endDate = new Date(startDate);
      if (oldContract.physicalItem.category === "ELEKTRONIK") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (oldContract.physicalItem.category === "GERABAHAN") {
        endDate.setMonth(endDate.getMonth() + 4);
      } else if (oldContract.physicalItem.category === "KENDARAAN") {
        endDate.setMonth(endDate.getMonth() + 2);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.pawnContract.update({
          where: { id: contractId },
          data: { status: PawnStatus.PERPANJANG }
        });

        const newContract = await tx.pawnContract.create({
          data: {
            uniqueCode: newUniqueCode,
            customerName: oldContract.customerName,
            appraisalValue: oldContract.appraisalValue,
            physicalItemId: oldContract.physicalItemId,
            status: PawnStatus.AKTIF,
            startDate,
            endDate,
            previousSku: oldContract.uniqueCode,
            extensionCount: oldContract.extensionCount + 1,
            extensionFee: extensionFee ? parseFloat(extensionFee) : null
          }
        });
        return newContract;
      });
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("mbg_session")?.value;
  const session = await decrypt(sessionCookie);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contractId, action, sellingPrice, notes, buyerName, paymentMethod, images } = body;

    if (action === "TEBUS") {
      const result = await prisma.pawnContract.update({
        where: { id: contractId },
        data: { status: PawnStatus.TEBUS }
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "POST_KATALOG") {
      const result = await prisma.$transaction(async (tx) => {
        // Update PawnContract
        const contract = await tx.pawnContract.update({
          where: { id: contractId },
          data: { 
            status: PawnStatus.LELANG,
            sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
            notes: notes
          },
          include: { physicalItem: true }
        });

        // If images are provided and is an array, update physicalItem.images
        let finalImages = contract.physicalItem.images;
        if (images && Array.isArray(images)) {
          await tx.physicalItem.update({
            where: { id: contract.physicalItemId },
            data: { images: images }
          });
          finalImages = images;
        }

        // Upsert AuctionItem to sync with public catalog
        const auctionItem = await tx.auctionItem.upsert({
          where: { sku: contract.uniqueCode },
          update: {
            price: contract.sellingPrice || 0,
            defects: notes,
            status: "Tersedia",
            isMarketplaceVisible: true,
            images: finalImages && finalImages.length > 0 ? finalImages : ["https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80"]
          },
          create: {
            sku: contract.uniqueCode,
            title: contract.physicalItem.itemName,
            category: contract.physicalItem.category,
            branchName: contract.physicalItem.branchName,
            description: contract.physicalItem.description || "Barang gadai lelang",
            defects: notes,
            price: contract.sellingPrice || 0,
            status: "Tersedia",
            images: finalImages && finalImages.length > 0 ? finalImages : ["https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80"],
            whatsappNumber: "081234567890",
            kondisi: "Bekas",
            physicalItemId: contract.physicalItemId,
            isMarketplaceVisible: true
          }
        });
        
        return { contract, auctionItem };
      });

      // Purge public catalog cache
      revalidatePath("/");
      revalidatePath(`/katalog/${result.auctionItem.id}`);

      return NextResponse.json({ success: true, data: result.contract });
    }

    if (action === "TERJUAL") {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update PawnContract
        const contract = await tx.pawnContract.update({
          where: { id: contractId },
          data: { 
            status: PawnStatus.TERJUAL,
            soldAt: new Date(),
            buyerName: buyerName || null,
            paymentMethod: paymentMethod || null
          },
          include: { physicalItem: true }
        });

        // 2. Find and update AuctionItem
        const auctionItem = await tx.auctionItem.findUnique({
          where: { sku: contract.uniqueCode }
        });

        if (auctionItem) {
          await tx.auctionItem.update({
            where: { id: auctionItem.id },
            data: { status: "Terjual", isMarketplaceVisible: false }
          });

          // 3. Create SalesTransaction
          await tx.salesTransaction.create({
            data: {
              itemId: auctionItem.id,
              sku: auctionItem.sku,
              soldPrice: contract.sellingPrice || auctionItem.price,
              branchName: contract.physicalItem.branchName,
              cashierName: session.email || "Kasir MBG",
              transactionDate: new Date()
            }
          });
        }
        
        return { contract, auctionItem };
      });

      // Purge public catalog cache
      revalidatePath("/");
      if (result.auctionItem) {
        revalidatePath(`/katalog/${result.auctionItem.id}`);
      }

      return NextResponse.json({ success: true, data: result.contract });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

