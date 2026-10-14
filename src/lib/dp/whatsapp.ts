import { DpStage } from "./stage";

export interface PhoneNormalizationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Normalisasi nomor WhatsApp Indonesia.
 * Aturan:
 * - Hapus karakter non-digit.
 * - 08... -> 628...
 * - 8...  -> 628...
 * - 62... / +62... -> 62...
 * - Valid jika panjang 10-15 digit setelah dinormalisasi.
 */
export function normalizePhone(rawPhone?: string | null): PhoneNormalizationResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { isValid: false, normalized: "", error: "Nomor belum diisi" };
  }

  // Hapus semua karakter non-digit
  let digits = rawPhone.replace(/\D/g, "");

  if (!digits) {
    return { isValid: false, normalized: "", error: "Nomor tidak valid" };
  }

  // Konversi format awalan
  if (digits.startsWith("08")) {
    digits = "62" + digits.slice(1);
  } else if (digits.startsWith("8")) {
    digits = "62" + digits;
  } else if (digits.startsWith("62")) {
    // Sudah benar 62...
  }

  // Validasi panjang (standar nomor seluler Indonesia 10 - 15 digit dengan kode negara 62)
  if (digits.length < 10 || digits.length > 15) {
    return {
      isValid: false,
      normalized: digits,
      error: `Panjang nomor tidak valid (${digits.length} digit, harus 10-15 digit)`,
    };
  }

  return { isValid: true, normalized: digits };
}

/**
 * Format angka ke format Rupiah standar aplikasi (mis. 1.500.000).
 */
export function formatRupiahNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal dalam zona waktu WIB (mis. 15 Okt 2026).
 */
export function formatWibDateDisplay(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export interface DpMessageData {
  buyerName?: string | null;
  branchName: string;
  itemName: string;
  dpAmount: number;
  remainingAmount: number;
  dueDate: Date;
}

/**
 * Membuat pesan pengingat WhatsApp sesuai tahap DP (H-1, H0, OVERDUE).
 * Sesuai template pada Bagian 5.7 brief.
 */
export function buildDpMessage(stage: DpStage, data: DpMessageData): string {
  const sapaanKak = data.buyerName?.trim() ? ` kak ${data.buyerName.trim()}` : " kak";
  const namaCabang = data.branchName.replace(/^MBG\s+Cabang\s+/i, "").replace(/^MBG\s+/i, "");
  const dpFormatted = formatRupiahNumber(data.dpAmount);
  const kurangFormatted = formatRupiahNumber(data.remainingAmount);
  const tanggalFormatted = formatWibDateDisplay(data.dueDate);

  if (stage === "H_MINUS_1") {
    return `Halo${sapaanKak}, kami dari MBG ${namaCabang}. Mengingatkan DP untuk ${data.itemName} (Rp ${dpFormatted}); sisa pembayaran Rp ${kurangFormatted}, jatuh tempo besok (${tanggalFormatted}). Mohon konfirmasi ya kak, terima kasih.`;
  }

  if (stage === "H0") {
    return `Halo${sapaanKak}, kami dari MBG ${namaCabang}. Mengingatkan DP untuk ${data.itemName} (Rp ${dpFormatted}); sisa pembayaran Rp ${kurangFormatted}, jatuh tempo hari ini (${tanggalFormatted}). Mohon konfirmasi ya kak, terima kasih.`;
  }

  // OVERDUE
  return `Halo${sapaanKak}, kami dari MBG ${namaCabang}. DP untuk ${data.itemName} (Rp ${dpFormatted}) sudah melewati batas pelunasan (${tanggalFormatted}); sisa Rp ${kurangFormatted}. Mohon konfirmasi apakah akan dilunasi ya kak, terima kasih.`;
}

/**
 * Membuat tautan wa.me dengan pesan ter-encode.
 */
export function buildWaLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
