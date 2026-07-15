import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DEBUG SKU 23082 ===");
  const items = await prisma.auctionItem.findMany({
    where: {
      OR: [
        { nomorInduk: "23082" },
        { sku: { contains: "23082" } }
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
