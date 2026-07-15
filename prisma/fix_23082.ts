import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== PENYELARASAN DATA SKU 23082 ===");

  try {
    // Hubungkan 23082-2, 23082-3, dan 23082-4 ke parent 23082 (ID: 1199)
    console.log("Mengupdate parentId & nomorInduk untuk 23082-2...");
    await prisma.auctionItem.update({
      where: { id: 1201 },
      data: {
        parentId: 1199,
        nomorInduk: "23082",
      },
    });

    console.log("Mengupdate parentId & nomorInduk untuk 23082-3...");
    await prisma.auctionItem.update({
      where: { id: 1202 },
      data: {
        parentId: 1199,
        nomorInduk: "23082",
      },
    });

    console.log("Mengupdate parentId & nomorInduk untuk 23082-4...");
    await prisma.auctionItem.update({
      where: { id: 1203 },
      data: {
        parentId: 1199,
        nomorInduk: "23082",
      },
    });

    console.log("=== PENYELARASAN SELESAI ===");
  } catch (error) {
    console.error("Gagal melakukan penyelarasan data 23082:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
