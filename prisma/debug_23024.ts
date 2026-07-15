import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DEBUG SKU 23024 ===");
  const items = await prisma.auctionItem.findMany({
    where: {
      OR: [
        { nomorInduk: "23024" },
        { sku: { contains: "23024" } }
      ]
    },
    select: {
      id: true,
      sku: true,
      parentId: true,
      nomorInduk: true,
      status: true,
      title: true,
    }
  });

  console.log(JSON.stringify(items, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
