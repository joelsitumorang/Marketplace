import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("=== MEMULAI PEMBERSIHAN DATA GUDANG ONLY ===");

  // Step 1: Backup Gudang and Gadai data
  try {
    const physicalItems = await prisma.physicalItem.findMany();
    const pawnContracts = await prisma.pawnContract.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      physicalItems,
      pawnContracts,
    };

    const filePath = path.join(process.cwd(), "backup_gudang_only.json");
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");
    console.log(`Backup data gudang disimpan di: ${filePath}`);
    console.log(`- Physical Items: ${physicalItems.length} records`);
    console.log(`- Pawn Contracts: ${pawnContracts.length} records`);
  } catch (err) {
    console.error("Gagal membuat backup sebelum pembersihan:", err);
    process.exit(1);
  }

  // Step 2: Clear relation in AuctionItem
  try {
    console.log("Memutuskan relasi physicalItem pada AuctionItem...");
    const updateRes = await prisma.auctionItem.updateMany({
      where: {
        physicalItemId: {
          not: null,
        },
      },
      data: {
        physicalItemId: null,
      },
    });
    console.log(`Berhasil memutuskan relasi pada ${updateRes.count} AuctionItem.`);

    // Step 3: Delete PawnContract
    console.log("Menghapus semua data PawnContract...");
    const deletePawnRes = await prisma.pawnContract.deleteMany();
    console.log(`Berhasil menghapus ${deletePawnRes.count} data PawnContract.`);

    // Step 4: Delete PhysicalItem
    console.log("Menghapus semua data PhysicalItem...");
    const deletePhysicalRes = await prisma.physicalItem.deleteMany();
    console.log(`Berhasil menghapus ${deletePhysicalRes.count} data PhysicalItem.`);

    console.log("=== PEMBERSIHAN DATA GUDANG SELESAI ===");
  } catch (err) {
    console.error("Gagal melakukan pembersihan data gudang:", err);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
