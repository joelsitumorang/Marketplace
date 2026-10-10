/**
 * Helper terpusat untuk memformat pesan share produk (WhatsApp / Media Sosial)
 */

export const formatRupiah = (n: number): string =>
  "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

export interface ShareItemInput {
  name: string;
  price?: number | null;
}

/**
 * Membuat teks share produk yang siap dibagikan ke WhatsApp atau Clipboard.
 * Format:
 * Cek barang ini di MBG: <Nama>
 * Harga: *Rp <Nominal>*
 * <URL>
 */
export function buildShareText(item: ShareItemInput, url: string): string {
  // Tanda * di nama akan merusak format tebal WhatsApp, jadi kita bersihkan
  const nama = (item.name || "").replace(/\*/g, "").trim();
  const baris = [`Cek barang ini di MBG: ${nama}`];

  if (item.price && Number(item.price) > 0) {
    baris.push(`Harga: *${formatRupiah(Number(item.price))}*`);
  }

  baris.push(url); // Link selalu diletakkan di baris terakhir agar rich preview WhatsApp bekerja optimal
  return baris.join("\n");
}
