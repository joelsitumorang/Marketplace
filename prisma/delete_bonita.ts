import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xewbjlbyieuhkjwsvrsu.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey!);

async function main() {
  console.log("=== MEMULAI PEMBERSIHAN ITEM DUMMY BONITA ===");

  try {
    // 1. Temukan semua item dengan SKU awalan BONITA-
    const items = await prisma.auctionItem.findMany({
      where: {
        sku: {
          startsWith: "BONITA-",
        },
      },
      select: {
        id: true,
        sku: true,
        images: true,
      },
    });

    console.log(`Ditemukan ${items.length} item dummy.`);

    if (items.length === 0) {
      console.log("Tidak ada item dummy untuk dihapus.");
      return;
    }

    // 2. Kumpulkan file gambar unik yang diunggah ke Supabase Storage
    const filesToDelete: string[] = [];
    items.forEach((item) => {
      item.images.forEach((imgUrl) => {
        if (imgUrl.includes("/auction-images/seeding-bonita-")) {
          const fileName = imgUrl.split("/auction-images/").pop();
          if (fileName && !filesToDelete.includes(fileName)) {
            filesToDelete.push(fileName);
          }
        }
      });
    });

    // 3. Hapus file dari Supabase Storage
    if (filesToDelete.length > 0) {
      console.log(`Menghapus ${filesToDelete.length} file gambar dari Supabase Storage...`);
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from("auction-images")
        .remove(filesToDelete);

      if (deleteError) {
        console.error(`Gagal menghapus file dari Storage: ${deleteError.message}`);
      } else {
        console.log("File gambar berhasil dihapus dari Supabase Storage.");
      }
    }

    // 4. Hapus record dari database PostgreSQL
    console.log("Menghapus record dari database PostgreSQL...");
    const deleteResult = await prisma.auctionItem.deleteMany({
      where: {
        sku: {
          startsWith: "BONITA-",
        },
      },
    });

    console.log(`Sukses! Berhasil menghapus ${deleteResult.count} record item dari database.`);
  } catch (error) {
    console.error("Gagal melakukan pembersihan:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
