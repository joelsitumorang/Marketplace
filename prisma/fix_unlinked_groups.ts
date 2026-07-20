import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== RUNNING DATABASE CORRECTION FOR UNLINKED GROUPS ===");

  try {
    // 1. Delete duplicate typo item '20529-3' (ID 1215)
    console.log("Checking if duplicate item '20529-3' (ID 1215) exists...");
    const dupItem = await prisma.auctionItem.findUnique({
      where: { id: 1215 }
    });

    if (dupItem && dupItem.sku === "20529-3") {
      console.log(`Deleting duplicate typo item '20529-3' (ID: 1215, status: ${dupItem.status})...`);
      await prisma.auctionItem.delete({
        where: { id: 1215 }
      });
      console.log("Successfully deleted duplicate item.");
    } else {
      console.log("Duplicate item '20529-3' (ID 1215) not found or already deleted.");
    }

    // 2. Link group 21529 (Parent: ID 1212)
    console.log("Linking child items for group 21529 to parent ID 1212...");
    const group21529Children = [1213, 1214, 1226];
    for (const childId of group21529Children) {
      await prisma.auctionItem.update({
        where: { id: childId },
        data: {
          parentId: 1212,
          nomorInduk: "21529"
        }
      });
    }
    console.log("Successfully linked group 21529 children.");

    // 3. Link group 20852 (Parent: ID 1208)
    console.log("Linking child items for group 20852 to parent ID 1208...");
    const group20852Children = [1209, 1210];
    for (const childId of group20852Children) {
      await prisma.auctionItem.update({
        where: { id: childId },
        data: {
          parentId: 1208,
          nomorInduk: "20852"
        }
      });
    }
    console.log("Successfully linked group 20852 children.");

    console.log("=== DATABASE CORRECTION COMPLETED ===");
  } catch (error) {
    console.error("Error during database correction:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
