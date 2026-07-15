import { PrismaClient, Status, Kondisi } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xewbjlbyieuhkjwsvrsu.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseKey) {
  throw new Error("Supabase key is missing in environment variables.");
}
const supabase = createClient(supabaseUrl, supabaseKey);

const IMAGE_PATH = "C:\\Users\\joels\\.gemini\\antigravity-ide\\brain\\aa45c7cb-1355-464b-8417-0a82aed45628\\media__1784108373645.jpg";

async function main() {
  console.log("=== MEMULAI SEEDING 50 ITEM SPREI BONITA ===");

  try {
    // 1. Membaca gambar lokal dari artifacts
    if (!fs.existsSync(IMAGE_PATH)) {
      throw new Error(`File gambar tidak ditemukan di path: ${IMAGE_PATH}`);
    }
    const fileBuffer = fs.readFileSync(IMAGE_PATH);
    const fileName = `seeding-bonita-${Date.now()}.jpg`;

    console.log(`Mengunggah gambar ${fileName} ke Supabase Storage...`);

    // 2. Upload gambar ke Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("auction-images")
      .upload(fileName, fileBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Gagal mengunggah ke storage: ${uploadError.message}`);
    }

    // 3. Ambil URL publik
    const { data: publicUrlData } = supabase.storage
      .from("auction-images")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`Gambar berhasil diunggah! URL: ${publicUrl}`);

    // 4. Input 50 item ke database
    console.log("\nMemasukkan 50 item Sprei Bonita ke PostgreSQL...");
    let insertedCount = 0;

    for (let i = 1; i <= 50; i++) {
      const sku = `BONITA-${String(i).padStart(3, "0")}-${Date.now().toString().slice(-4)}`;
      const title = `Sprei Bonita Disperse Jafier King B2 #${i}`;

      await prisma.auctionItem.create({
        data: {
          sku,
          title,
          category: "Lain-lain",
          description: "Sprei merk Bonita motif Jafier ukuran King B2 (180x200). Bahan halus disperse, dijamin tidak luntur.",
          defects: "Tidak ada defect (Barang Baru Segel)",
          price: 135000.00, // Rp 135.000
          status: Status.Tersedia,
          images: [publicUrl],
          whatsappNumber: "6285123456789",
          kondisi: Kondisi.Baru,
          branchName: "Pasuruan - Sangar",
          isMarketplaceVisible: true,
          hasWarranty: false,
        }
      });
      insertedCount++;
    }

    console.log(`\nSukses! Berhasil memasukkan ${insertedCount} item Sprei Bonita ke database.`);
  } catch (error: any) {
    console.error("Gagal melakukan seeding:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
