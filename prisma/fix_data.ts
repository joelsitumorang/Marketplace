import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== MEMULAI PENYELARASAN DATA SKU 23024 & 23082 ===");

  try {
    // 1. Hubungkan 23024-3 (ID: 1221) ke parent 23024 (ID: 1196)
    console.log("Menghubungkan 23024-3 ke parent ID 1196...");
    await prisma.auctionItem.update({
      where: { id: 1221 },
      data: {
        parentId: 1196,
        nomorInduk: "23024",
      },
    });
    console.log("Sukses memperbarui 23024-3.");

    // 2. Koreksi nomorInduk 23082 (ID: 1199) menjadi "23082"
    console.log("Memperbarui nomorInduk parent 23082...");
    await prisma.auctionItem.update({
      where: { id: 1199 },
      data: {
        nomorInduk: "23082",
      },
    });
    console.log("Sukses memperbarui parent 23082.");

    // 3. Koreksi nomorInduk child 23082-1 (ID: 1200) menjadi "23082"
    console.log("Memperbarui nomorInduk child 23082-1...");
    await prisma.auctionItem.update({
      where: { id: 1200 },
      data: {
        nomorInduk: "23082",
      },
    });
    console.log("Sukses memperbarui child 23082-1.");

    console.log("=== PENYELARASAN DATA SELESAI ===");
  } catch (error) {
    console.error("Gagal melakukan penyelarasan data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
