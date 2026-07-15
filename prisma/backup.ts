import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai backup data dari database Supabase...");

  try {
    const users = await prisma.user.findMany();
    const auctionItems = await prisma.auctionItem.findMany();
    const salesTransactions = await prisma.salesTransaction.findMany();
    const physicalItems = await prisma.physicalItem.findMany();
    const pawnContracts = await prisma.pawnContract.findMany();
    const auditLogs = await prisma.auditLog.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      auctionItems,
      salesTransactions,
      physicalItems,
      pawnContracts,
      auditLogs,
    };

    const filePath = path.join(process.cwd(), "backup_data.json");
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

    console.log("\n=== BACKUP SELESAI VIA PRISMA ===");
    console.log(`File backup berhasil disimpan di: ${filePath}`);
    console.log(`\nDetail jumlah record yang berhasil di-backup:`);
    console.log(`- Users: ${users.length} records`);
    console.log(`- Auction Items (Katalog): ${auctionItems.length} records`);
    console.log(`- Sales Transactions: ${salesTransactions.length} records`);
    console.log(`- Physical Items (Gudang): ${physicalItems.length} records`);
    console.log(`- Pawn Contracts (Gadai): ${pawnContracts.length} records`);
    console.log(`- Audit Logs: ${auditLogs.length} records`);
  } catch (error) {
    console.error("Gagal melakukan backup database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
