import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80";

async function main() {
  console.log("=== MEMULAI PEMBERSIHAN DATA BASE64 LAMA ===");

  try {
    // 1. Bersihkan tabel AuctionItem
    console.log("\nMemproses tabel AuctionItem...");
    const auctionItems = await prisma.auctionItem.findMany({
      select: {
        id: true,
        images: true,
        variantImageUrl: true,
        sku: true,
      }
    });

    let auctionUpdatedCount = 0;
    for (const item of auctionItems) {
      let needsUpdate = false;
      const updatedImages = item.images.map((img) => {
        if (img.startsWith("data:image/")) {
          needsUpdate = true;
          return PLACEHOLDER_IMAGE;
        }
        return img;
      });

      let updatedVariantUrl = item.variantImageUrl;
      if (item.variantImageUrl && item.variantImageUrl.startsWith("data:image/")) {
        needsUpdate = true;
        updatedVariantUrl = PLACEHOLDER_IMAGE;
      }

      if (needsUpdate) {
        await prisma.auctionItem.update({
          where: { id: item.id },
          data: {
            images: updatedImages,
            variantImageUrl: updatedVariantUrl,
          }
        });
        auctionUpdatedCount++;
        console.log(`- Updated AuctionItem ID ${item.id} (SKU: ${item.sku})`);
      }
    }
    console.log(`Selesai memproses AuctionItem. Total diupdate: ${auctionUpdatedCount}`);

    // 2. Bersihkan tabel PhysicalItem
    console.log("\nMemproses tabel PhysicalItem...");
    const physicalItems = await prisma.physicalItem.findMany({
      select: {
        id: true,
        images: true,
        itemName: true,
      }
    });

    let physicalUpdatedCount = 0;
    for (const item of physicalItems) {
      let needsUpdate = false;
      const updatedImages = item.images.map((img) => {
        if (img.startsWith("data:image/")) {
          needsUpdate = true;
          return PLACEHOLDER_IMAGE;
        }
        return img;
      });

      if (needsUpdate) {
        await prisma.physicalItem.update({
          where: { id: item.id },
          data: {
            images: updatedImages,
          }
        });
        physicalUpdatedCount++;
        console.log(`- Updated PhysicalItem ID ${item.id} (Nama: ${item.itemName})`);
      }
    }
    console.log(`Selesai memproses PhysicalItem. Total diupdate: ${physicalUpdatedCount}`);

    console.log("\n=== PEMBERSIHAN SELESAI ===");
    console.log("Seluruh gambar base64 lama telah berhasil digantikan dengan link placeholder URL.");
  } catch (error) {
    console.error("Gagal membersihkan data base64:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
