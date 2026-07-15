import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const backupPath = path.join(process.cwd(), "backup_data.json");
  if (!fs.existsSync(backupPath)) {
    console.error(`File backup tidak ditemukan di: ${backupPath}`);
    process.exit(1);
  }

  console.log("Membaca data backup...");
  const rawData = fs.readFileSync(backupPath, "utf-8");
  const data = JSON.parse(rawData);

  console.log("Menghubungkan ke database Supabase baru...");

  try {
    // 1. Bersihkan database terlebih dahulu untuk menghindari bentrok / duplicate primary key
    console.log("Membersihkan database lama (menghapus data yang ada)...");
    await prisma.auditLog.deleteMany({});
    await prisma.salesTransaction.deleteMany({});
    await prisma.auctionItem.deleteMany({});
    await prisma.pawnContract.deleteMany({});
    await prisma.physicalItem.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Restore Users
    console.log(`Mengimpor Users (${data.users.length} records)...`);
    for (const u of data.users) {
      await prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          password: u.password,
          nama_lengkap: u.nama_lengkap,
          asal_cabang: u.asal_cabang,
          role: u.role,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

    // 3. Restore Physical Items
    console.log(`Mengimpor Physical Items (${data.physicalItems.length} records)...`);
    for (const pi of data.physicalItems) {
      await prisma.physicalItem.create({
        data: {
          id: pi.id,
          itemName: pi.itemName,
          category: pi.category,
          serialNumber: pi.serialNumber,
          branchName: pi.branchName,
          currentRack: pi.currentRack,
          description: pi.description,
          images: pi.images,
          createdAt: new Date(pi.createdAt),
          updatedAt: new Date(pi.updatedAt),
        },
      });
    }

    // 4. Restore Pawn Contracts
    console.log(`Mengimpor Pawn Contracts (${data.pawnContracts.length} records)...`);
    for (const pc of data.pawnContracts) {
      await prisma.pawnContract.create({
        data: {
          id: pc.id,
          uniqueCode: pc.uniqueCode,
          status: pc.status,
          customerName: pc.customerName,
          customerPhone: pc.customerPhone,
          appraisalValue: pc.appraisalValue,
          physicalItemId: pc.physicalItemId,
          notes: pc.notes,
          startDate: new Date(pc.startDate),
          endDate: pc.endDate ? new Date(pc.endDate) : null,
          createdAt: new Date(pc.createdAt),
          previousSku: pc.previousSku,
          extensionCount: pc.extensionCount,
          extensionFee: pc.extensionFee,
          sellingPrice: pc.sellingPrice,
          buyerName: pc.buyerName,
          paymentMethod: pc.paymentMethod,
          soldAt: pc.soldAt ? new Date(pc.soldAt) : null,
        },
      });
    }

    // 5. Restore Auction Items (Penting: Varian parent-child self relation)
    // Jalankan 2 phase: pertama masukkan parent (parentId === null), lalu masukkan child (parentId !== null)
    const parents = data.auctionItems.filter((ai: any) => ai.parentId === null);
    const children = data.auctionItems.filter((ai: any) => ai.parentId !== null);

    console.log(`Mengimpor Auction Items Parent (${parents.length} records)...`);
    for (const ai of parents) {
      await prisma.auctionItem.create({
        data: {
          id: ai.id,
          sku: ai.sku,
          branchName: ai.branchName,
          title: ai.title,
          category: ai.category,
          description: ai.description,
          defects: ai.defects,
          price: ai.price,
          status: ai.status,
          images: ai.images,
          whatsappNumber: ai.whatsappNumber,
          createdAt: new Date(ai.createdAt),
          youtubeUrl: ai.youtubeUrl,
          kondisi: ai.kondisi,
          physicalItemId: ai.physicalItemId,
          isMarketplaceVisible: ai.isMarketplaceVisible,
          hasWarranty: ai.hasWarranty,
          nomorInduk: ai.nomorInduk,
          parentId: null,
          variantImageUrl: ai.variantImageUrl,
          hargaJual: ai.hargaJual,
          returnReason: ai.returnReason,
        },
      });
    }

    console.log(`Mengimpor Auction Items Varian/Children (${children.length} records)...`);
    for (const ai of children) {
      await prisma.auctionItem.create({
        data: {
          id: ai.id,
          sku: ai.sku,
          branchName: ai.branchName,
          title: ai.title,
          category: ai.category,
          description: ai.description,
          defects: ai.defects,
          price: ai.price,
          status: ai.status,
          images: ai.images,
          whatsappNumber: ai.whatsappNumber,
          createdAt: new Date(ai.createdAt),
          youtubeUrl: ai.youtubeUrl,
          kondisi: ai.kondisi,
          physicalItemId: ai.physicalItemId,
          isMarketplaceVisible: ai.isMarketplaceVisible,
          hasWarranty: ai.hasWarranty,
          nomorInduk: ai.nomorInduk,
          parentId: ai.parentId,
          variantImageUrl: ai.variantImageUrl,
          hargaJual: ai.hargaJual,
          returnReason: ai.returnReason,
        },
      });
    }

    // 6. Restore Sales Transactions
    console.log(`Mengimpor Sales Transactions (${data.salesTransactions.length} records)...`);
    for (const st of data.salesTransactions) {
      await prisma.salesTransaction.create({
        data: {
          id: st.id,
          itemId: st.itemId,
          sku: st.sku,
          soldPrice: st.soldPrice,
          branchName: st.branchName,
          cashierName: st.cashierName,
          transactionDate: new Date(st.transactionDate),
          isReturned: st.isReturned,
          returnReason: st.returnReason,
        },
      });
    }

    // 7. Restore Audit Logs
    console.log(`Mengimpor Audit Logs (${data.auditLogs.length} records)...`);
    for (const al of data.auditLogs) {
      await prisma.auditLog.create({
        data: {
          id: al.id,
          createdAt: new Date(al.createdAt),
          adminEmail: al.adminEmail,
          eventType: al.eventType,
          productSku: al.productSku,
          productName: al.productName,
          description: al.description,
        },
      });
    }

    // 8. Sinkronisasi auto-increment sequences di PostgreSQL Supabase
    console.log("Menyelaraskan PostgreSQL sequence generator...");
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('auction_items', 'id'), coalesce(max(id), 1)) FROM auction_items;`
    );
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('sales_transactions', 'id'), coalesce(max(id), 1)) FROM sales_transactions;`
    );
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('audit_logs', 'id'), coalesce(max(id), 1)) FROM audit_logs;`
    );

    console.log("\n=== RESTORE SELESAI VIA PRISMA ===");
    console.log("Database Supabase baru Anda kini terisi penuh dengan data lama.");
  } catch (error) {
    console.error("Gagal melakukan restore database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
