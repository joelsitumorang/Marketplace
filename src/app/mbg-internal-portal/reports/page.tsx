export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import ReportClient from "./ReportClient";

import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

function parseWibStartOfDay(dateStr: string): Date {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
  date.setUTCHours(date.getUTCHours() - 7);
  return date;
}

function parseWibEndOfDay(dateStr: string): Date {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const date = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  date.setUTCHours(date.getUTCHours() - 7);
  return date;
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/mbg-internal-portal/login");
  }

  const resolvedParams = await searchParams;
  const startDate = resolvedParams.start;
  const endDate = resolvedParams.end;
  const branchFilter = resolvedParams.branch;

  const isSuperAdmin = session.role === "SUPERADMIN";

  let dateFilter = {};
  const hasDateFilter = startDate && endDate && startDate !== "null" && endDate !== "null";
  if (hasDateFilter) {
    dateFilter = {
      transactionDate: {
        gte: parseWibStartOfDay(startDate),
        lte: parseWibEndOfDay(endDate),
      }
    };
  }

  // Enforce branch security lock: Superadmin can query any/all branches, regular admins are locked
  let branchNameFilter = undefined;
  if (!isSuperAdmin) {
    branchNameFilter = session.asal_cabang;
  } else if (branchFilter && branchFilter !== "all") {
    branchNameFilter = branchFilter;
  }

  const where = {
    branchName: {
      contains: "Pasuruan",
      mode: "insensitive" as const,
    },
    ...dateFilter
  };

  // Parallelize database queries to significantly reduce latency
  const [transactions, branchGroup] = await Promise.all([
    prisma.salesTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        item: { select: { title: true, category: true, hargaMasuk: true } }
      }
    }),
    isSuperAdmin ? prisma.salesTransaction.groupBy({
      by: ["branchName"],
    }) : Promise.resolve(null)
  ]);

  // Get list of branches
  let branchList: string[] = [];
  if (isSuperAdmin && branchGroup) {
    branchList = branchGroup.map(b => b.branchName);
  } else {
    branchList = [session.asal_cabang];
  }

  const currentBranch = isSuperAdmin ? (branchFilter || "all") : session.asal_cabang;

  // Serialize objects to avoid Client Component errors with Decimal and Date
  const serializedTransactions = JSON.parse(JSON.stringify(transactions));

  return (
    <ReportClient 
      initialTransactions={serializedTransactions} 
      branchList={branchList} 
      currentBranch={currentBranch}
      currentStart={startDate || ""}
      currentEnd={endDate || ""}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
