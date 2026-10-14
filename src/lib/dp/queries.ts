import { prisma } from "@/lib/prisma";
import {
  calcDpDueDate,
  calcDpStage,
  needsContact,
  DpStage,
} from "./stage";
import {
  normalizePhone,
  buildDpMessage,
  buildWaLink,
  formatWibDateDisplay,
} from "./whatsapp";

export interface DpItemDTO {
  id: number;
  sku: string;
  soldPrice: number;
  branchName: string;
  transactionDate: string; // ISO string
  dpDeadline: string | null;
  dueDate: string;
  dueDateFormatted: string;
  daysDiff: number;
  stage: DpStage;
  stageLabel: string;
  stageColor: "yellow" | "orange" | "red" | "gray";
  itemName: string;
  buyerName: string | null;
  buyerPhone: string | null;
  phoneNormalized: string;
  isPhoneValid: boolean;
  phoneError?: string;
  dpAmount: number;
  remainingAmount: number;
  lastContactedAt: string | null;
  lastContactStage: string | null;
  contactCount: number;
  waMessage: string;
  waLink: string | null;
}

export interface DpQueryResult {
  perluDihubungi: DpItemDTO[];
  menungguPembeli: DpItemDTO[];
  totalNeedingContact: number;
}

function getBranchFilter(userRole: string, userBranch?: string | null, targetBranch?: string | null) {
  if (userRole === "ADMIN") {
    if (!userBranch) return undefined;
    const clean = userBranch.replace(/^MBG\s+Cabang\s+/i, "").replace(/^MBG\s+/i, "").trim();
    return { contains: clean, mode: "insensitive" as const };
  }

  if (targetBranch && targetBranch !== "SEMUA") {
    const clean = targetBranch.replace(/^MBG\s+Cabang\s+/i, "").replace(/^MBG\s+/i, "").trim();
    return { contains: clean, mode: "insensitive" as const };
  }

  return undefined;
}

/**
 * Mengambil daftar transaksi DP yang perlu dihubungi dan yang menunggu pembeli.
 * Dihitung pada read-time berbasis kalender WIB.
 */
export async function getDpNeedingContact(
  userRole: string,
  userBranch?: string | null,
  targetBranch?: string | null,
  now: Date = new Date()
): Promise<DpQueryResult> {
  const branchFilter = getBranchFilter(userRole, userBranch, targetBranch);

  const transactions = await prisma.salesTransaction.findMany({
    where: {
      status: "DP",
      ...(branchFilter ? { branchName: branchFilter } : {}),
    },
    select: {
      id: true,
      sku: true,
      soldPrice: true,
      branchName: true,
      transactionDate: true,
      dpDeadline: true,
      amountCash: true,
      amountTransfer: true,
      buyerName: true,
      buyerPhone: true,
      lastContactedAt: true,
      lastContactStage: true,
      contactCount: true,
      item: {
        select: {
          title: true,
        },
      },
      installments: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: {
      transactionDate: "desc",
    },
    take: 100, // Batas aman query
  });

  const perluDihubungi: DpItemDTO[] = [];
  const menungguPembeli: DpItemDTO[] = [];

  for (const tx of transactions) {
    const totalInstallments = tx.installments.reduce(
      (sum, inst) => sum + Number(inst.amount),
      0
    );
    const initialPayment = Number(tx.amountCash || 0) + Number(tx.amountTransfer || 0);
    const dpAmount = totalInstallments > 0 ? totalInstallments : initialPayment;
    const soldPrice = Number(tx.soldPrice);
    const remainingAmount = Math.max(0, soldPrice - dpAmount);

    const dueDate = tx.dpDeadline ? new Date(tx.dpDeadline) : calcDpDueDate(new Date(tx.transactionDate));
    const stageInfo = calcDpStage(dueDate, now);

    // Bila belum masuk rentang pengingat (diff >= 2), jangan tampilkan di daftar pengingat
    if (!stageInfo.stage) {
      continue;
    }

    const phoneResult = normalizePhone(tx.buyerPhone);
    const waMessage = buildDpMessage(stageInfo.stage, {
      buyerName: tx.buyerName,
      branchName: tx.branchName,
      itemName: tx.item.title,
      dpAmount,
      remainingAmount,
      dueDate,
    });
    const waLink = phoneResult.isValid
      ? buildWaLink(phoneResult.normalized, waMessage)
      : null;

    const dto: DpItemDTO = {
      id: tx.id,
      sku: tx.sku,
      soldPrice,
      branchName: tx.branchName,
      transactionDate: new Date(tx.transactionDate).toISOString(),
      dpDeadline: tx.dpDeadline ? new Date(tx.dpDeadline).toISOString() : null,
      dueDate: dueDate.toISOString(),
      dueDateFormatted: formatWibDateDisplay(dueDate),
      daysDiff: stageInfo.daysDiff,
      stage: stageInfo.stage,
      stageLabel: stageInfo.label,
      stageColor: stageInfo.badgeColor,
      itemName: tx.item.title,
      buyerName: tx.buyerName,
      buyerPhone: tx.buyerPhone,
      phoneNormalized: phoneResult.normalized,
      isPhoneValid: phoneResult.isValid,
      phoneError: phoneResult.error,
      dpAmount,
      remainingAmount,
      lastContactedAt: tx.lastContactedAt ? new Date(tx.lastContactedAt).toISOString() : null,
      lastContactStage: tx.lastContactStage,
      contactCount: tx.contactCount || 0,
      waMessage,
      waLink,
    };

    const isNeeding = needsContact({
      stage: stageInfo.stage,
      lastContactStage: tx.lastContactStage,
      lastContactedAt: tx.lastContactedAt ? new Date(tx.lastContactedAt) : null,
      now,
    });

    if (isNeeding) {
      perluDihubungi.push(dto);
    } else {
      menungguPembeli.push(dto);
    }
  }

  // Urutan perluDihubungi: OVERDUE (paling lama lewat dulu) -> H0 -> H-1
  const stageOrderPriority: Record<DpStage, number> = {
    OVERDUE: 1,
    H0: 2,
    H_MINUS_1: 3,
  };

  perluDihubungi.sort((a, b) => {
    if (stageOrderPriority[a.stage] !== stageOrderPriority[b.stage]) {
      return stageOrderPriority[a.stage] - stageOrderPriority[b.stage];
    }
    // Jika sama-sama OVERDUE, urutkan dari keterlambatan terbesar (daysDiff terkecil)
    return a.daysDiff - b.daysDiff;
  });

  return {
    perluDihubungi,
    menungguPembeli,
    totalNeedingContact: perluDihubungi.length,
  };
}

/**
 * Query ringan untuk menghitung jumlah DP yang perlu dihubungi (untuk badge Suspense).
 */
export async function countDpNeedingContact(
  userRole: string,
  userBranch?: string | null,
  targetBranch?: string | null
): Promise<number> {
  const result = await getDpNeedingContact(userRole, userBranch, targetBranch);
  return result.totalNeedingContact;
}
