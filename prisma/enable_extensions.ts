import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Mengaktifkan ekstensi pg_trgm di Supabase...");
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
  console.log("Ekstensi pg_trgm berhasil diaktifkan!");
}

main()
  .catch((err) => {
    console.error("Gagal mengaktifkan ekstensi:", err);
  })
  .finally(() => prisma.$disconnect());
