/**
 * Logika murni penentuan tahap DP dan jatuh tempo berbasis kalender WIB (Asia/Jakarta).
 * Tidak bergantung pada Date.now() langsung (menerima 'now' opsional agar mudah diuji).
 */

export type DpStage = "H_MINUS_1" | "H0" | "OVERDUE";

export interface DpStageInfo {
  stage: DpStage | null;
  daysDiff: number; // dpDueDateWIB - todayWIB
  overdueDays: number; // jika < 0, nilai positif keterlambatan
  label: string;
  badgeColor: "yellow" | "orange" | "red" | "gray";
}

/**
 * Menghasilkan string tanggal YYYY-MM-DD di zona waktu Asia/Jakarta (WIB).
 */
export function getWibDateString(date: Date = new Date()): string {
  // Format en-CA menghasilkan YYYY-MM-DD secara konsisten
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Mengonversi string YYYY-MM-DD menjadi UTC timestamp tengah malam
 * untuk kalkulasi selisih hari kalender murni.
 */
function parseDateStringToDays(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  // UTC Date representation of midnight for date arithmetic
  const utcDate = Date.UTC(year, month - 1, day);
  return Math.floor(utcDate / (24 * 60 * 60 * 1000));
}

/**
 * Menghitung jatuh tempo kalender WIB transaksi DP (+3 hari kalender).
 */
export function calcDpDueDate(transactionDate: Date): Date {
  const txWibStr = getWibDateString(transactionDate);
  const [y, m, d] = txWibStr.split("-").map(Number);
  // Tambah 3 hari kalender di WIB (zona WIB adalah UTC+7)
  // Menghasilkan Date object pada pukul 23:59:59.999 WIB
  const dueUtc = new Date(Date.UTC(y, m - 1, d + 3, 16, 59, 59, 999));
  return dueUtc;
}

/**
 * Menghitung selisih hari kalender kalender WIB antara dueDate dan hari ini.
 * selisih = dueDateWIB - todayWIB
 */
export function calcDaysDiffWIB(dueDate: Date, now: Date = new Date()): number {
  const dueWibStr = getWibDateString(dueDate);
  const nowWibStr = getWibDateString(now);

  const dueDays = parseDateStringToDays(dueWibStr);
  const nowDays = parseDateStringToDays(nowWibStr);

  return dueDays - nowDays;
}

/**
 * Menentukan tahap pengingat transaksi DP.
 */
export function calcDpStage(dueDate: Date, now: Date = new Date()): DpStageInfo {
  const diff = calcDaysDiffWIB(dueDate, now);

  if (diff === 1) {
    return {
      stage: "H_MINUS_1",
      daysDiff: 1,
      overdueDays: 0,
      label: "Besok jatuh tempo",
      badgeColor: "yellow",
    };
  }

  if (diff === 0) {
    return {
      stage: "H0",
      daysDiff: 0,
      overdueDays: 0,
      label: "Jatuh tempo hari ini",
      badgeColor: "orange",
    };
  }

  if (diff < 0) {
    const overdueDays = Math.abs(diff);
    return {
      stage: "OVERDUE",
      daysDiff: diff,
      overdueDays,
      label: `Lewat ${overdueDays} hari`,
      badgeColor: "red",
    };
  }

  // diff >= 2: Belum waktunya dihubungi
  return {
    stage: null,
    daysDiff: diff,
    overdueDays: 0,
    label: `${diff} hari lagi`,
    badgeColor: "gray",
  };
}

const STAGE_ORDER: Record<DpStage, number> = {
  H_MINUS_1: 1,
  H0: 2,
  OVERDUE: 3,
};

/**
 * Memeriksa apakah sebuah transaksi DP perlu dihubungi (masuk daftar utama).
 * Bila false, transaksi masuk ke daftar sekunder 'Menunggu pembeli'.
 */
export function needsContact(params: {
  stage: DpStage | null;
  lastContactStage?: string | null;
  lastContactedAt?: Date | null;
  now?: Date;
}): boolean {
  const { stage, lastContactStage, lastContactedAt, now = new Date() } = params;

  // Jika belum masuk tahap pengingat (diff >= 2), tidak perlu dihubungi
  if (!stage) return false;

  // 1. Belum pernah dihubungi sama sekali
  if (!lastContactStage || !lastContactedAt) {
    return true;
  }

  const currentOrder = STAGE_ORDER[stage];
  const lastOrder = STAGE_ORDER[lastContactStage as DpStage] || 0;

  // 2. Tahap sekarang lebih tinggi dari tahap terakhir dihubungi (H-1 < H0 < OVERDUE)
  if (currentOrder > lastOrder) {
    return true;
  }

  // 3. Pada tahap OVERDUE: hubungi ulang 1 kali per hari kalender WIB
  if (stage === "OVERDUE") {
    const todayWib = getWibDateString(now);
    const lastContactWib = getWibDateString(lastContactedAt);

    // Jika dihubungi pada hari kalender sebelum hari ini, ingatkan lagi hari ini
    if (lastContactWib < todayWib) {
      return true;
    }
  }

  // Sudah dihubungi pada tahap/hari yang sama -> masuk 'Menunggu pembeli'
  return false;
}
