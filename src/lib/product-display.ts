/**
 * Helper tampilan kartu produk katalog publik.
 * Semua fungsi murni (tanpa I/O) dan hanya untuk tampilan: data asli di database tidak diubah.
 */

// ─── Status O2O ──────────────────────────────────────────────────────────────

export type PublicStatus = "tersedia" | "dibooking" | "terjual";

/**
 * Menentukan status publik barang.
 * Catatan: kasir menandai barang DP sebagai `Terjual` dengan transaksi berstatus `DP`,
 * sehingga transaksi terakhir ikut menentukan apakah barang masih "dibooking".
 */
export function derivePublicStatus(
  itemStatus: string,
  latestTransactionStatus?: string | null
): PublicStatus {
  if (itemStatus === "Dipesan") return "dibooking";
  if (itemStatus === "Terjual") {
    return latestTransactionStatus === "DP" ? "dibooking" : "terjual";
  }
  return "tersedia";
}

// ─── Judul ───────────────────────────────────────────────────────────────────

const CANONICAL_WORDS: Record<string, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  imac: "iMac",
  macbook: "MacBook",
  airpods: "AirPods",
  ibox: "iBox",
  hp: "HP",
  tv: "TV",
  led: "LED",
  lcd: "LCD",
  ac: "AC",
  pc: "PC",
  gb: "GB",
  tb: "TB",
  ram: "RAM",
  rom: "ROM",
  ssd: "SSD",
  hdd: "HDD",
  usb: "USB",
  nfc: "NFC",
  "4g": "4G",
  "5g": "5G",
  i3: "i3",
  i5: "i5",
  i7: "i7",
  i9: "i9",
  asus: "ASUS",
  msi: "MSI",
  jbl: "JBL",
  lg: "LG",
};

const LOWERCASE_CONNECTORS = new Set(["dan", "atau", "untuk", "dengan", "di", "ke"]);

const COLOR_WORDS: Record<string, string> = {
  black: "Black",
  white: "White",
  blue: "Blue",
  red: "Red",
  green: "Green",
  gold: "Gold",
  silver: "Silver",
  purple: "Purple",
  pink: "Pink",
  gray: "Gray",
  grey: "Grey",
  graphite: "Graphite",
  midnight: "Midnight",
  starlight: "Starlight",
  hitam: "Hitam",
  putih: "Putih",
  merah: "Merah",
  biru: "Biru",
  hijau: "Hijau",
  emas: "Emas",
  ungu: "Ungu",
};

const PHONE_CONTEXT = /\b(iphone|ipad|hp|samsung|oppo|vivo|xiaomi|redmi|realme|infinix|poco|tecno|android|tablet)\b/i;
// Merek seperti Samsung/HP juga membuat TV & laptop
const NON_PHONE_CONTEXT = /\b(tv|led|lcd|monitor|laptop|notebook|kulkas|mesin|ac|speaker|printer)\b/i;
const VEHICLE_CONTEXT = /\b(sepeda|motor|scooter|skuter|bike|listrik)\b/i;
const BARE_STORAGE = new Set(["32", "64", "128", "256", "512"]);
const VALID_ROM = new Set([16, 32, 64, 128, 256, 512, 1024]);

function isPhoneTitle(text: string): boolean {
  return PHONE_CONTEXT.test(text) && !NON_PHONE_CONTEXT.test(text);
}

function titleCaseWord(word: string): string {
  return word
    .split("-")
    .map((part, idx) =>
      part.length === 0
        ? part
        : idx === 0
          ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          : part.toLowerCase()
    )
    .join("-");
}

function normalizeToken(token: string, index: number): string {
  const lower = token.toLowerCase();

  if (CANONICAL_WORDS[lower]) return CANONICAL_WORDS[lower];
  if (COLOR_WORDS[lower]) return COLOR_WORDS[lower];
  if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) return lower;

  // Token berangka (kode model seperti A57, D65, 13c, 4/64GB) → huruf kapital
  if (/\d/.test(token)) return token.toUpperCase();

  // Hanya huruf (boleh pakai strip)
  if (/^[a-z-]+$/i.test(token)) {
    const isAllUpper = token === token.toUpperCase();
    const isAllLower = token === token.toLowerCase();
    // Singkatan 2 huruf kapital (XR, SE) dipertahankan
    if (isAllUpper && token.length <= 2) return token;
    // Kapitalisasi campuran yang disengaja (mis. "MacBook") dipertahankan
    if (!isAllUpper && !isAllLower) return token;
    return titleCaseWord(token);
  }

  return token;
}

/**
 * Merapikan judul untuk tampilan, mis.:
 * - "[BEKAS] IPHONE 12 128 IBOX" → "iPhone 12 128GB iBox"
 * - "Iphone 14 blue 128 GB"      → "iPhone 14 128GB – Blue"
 */
export function formatProductTitle(raw: string): string {
  if (!raw) return "";

  let text = raw
    .replace(/^\s*[[(](baru|bekas)[\])]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Satukan angka dengan satuan: "128 GB" → "128GB", "4/64 gb" → "4/64GB"
  text = text.replace(/\b(\d+(?:\/\d+)?)\s*(gb|tb)\b/gi, (_, num: string, unit: string) => `${num}${unit.toUpperCase()}`);

  // Standarkan pemisah " - " menjadi en dash
  text = text.replace(/\s+[-–—]\s+/g, " – ");

  const isPhone = isPhoneTitle(text);
  const hasExplicitStorage = /\d(GB|TB)\b/.test(text);

  const tokens = text.split(" ").map((token, idx) => {
    if (token === "–") return token;
    if (isPhone && !hasExplicitStorage && BARE_STORAGE.has(token) && idx > 0) {
      return `${token}GB`;
    }
    return normalizeToken(token, idx);
  });

  // Format "Merek Model Storage – Warna": pindahkan satu kata warna ke akhir
  const hasSeparator = tokens.includes("–");
  const colorIndexes = tokens
    .map((t, idx) => (Object.values(COLOR_WORDS).includes(t) ? idx : -1))
    .filter((idx) => idx > 0);

  if (!hasSeparator && colorIndexes.length === 1 && colorIndexes[0] < tokens.length - 1) {
    const [color] = tokens.splice(colorIndexes[0], 1);
    return `${tokens.join(" ")} – ${color}`;
  }

  return tokens.join(" ");
}

// ─── Spesifikasi kunci ───────────────────────────────────────────────────────

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ");
}

function extractStorage(text: string, isPhone: boolean, title: string): string | null {
  // RAM/ROM berpasangan: "4/64", "8/256GB" (ROM harus kapasitas wajar agar tanggal "12/2023" tidak ikut)
  const pair = text.match(/\b(\d{1,2})\s*\/\s*(\d{2,4})\s*(gb)?\b/i);
  if (pair && isPhone) {
    const ram = Number(pair[1]);
    const rom = Number(pair[2]);
    if (ram >= 1 && ram <= 24 && VALID_ROM.has(rom)) return `${ram}/${rom}GB`;
  }

  // Ambil kapasitas terbesar yang bukan RAM
  let best: { value: number; label: string } | null = null;
  const regex = /(ram\s*)?\b(\d{1,4})\s*(gb|tb)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) continue; // diawali "RAM"
    const num = Number(match[2]);
    const unit = match[3].toUpperCase();
    const value = unit === "TB" ? num * 1024 : num;
    if (!best || value > best.value) best = { value, label: `${num}${unit}` };
  }
  if (best) return best.label;

  // HP tanpa satuan: "IPHONE 12 128 IBOX"
  if (isPhone) {
    const bare = title.match(/\s(32|64|128|256|512)(?=\s|$)/);
    if (bare) return `${bare[1]}GB`;
  }

  return null;
}

function extractBatteryHealth(text: string): string | null {
  const m =
    text.match(/\b(?:bh|battery\s*health|baterai|batre|battery)\s*[:=]?\s*(\d{2,3})\s*%/i) ??
    text.match(/\b(\d{2,3})\s*%\s*(?:bh|battery)\b/i);
  if (!m) return null;
  const value = Number(m[1]);
  return value >= 50 && value <= 100 ? `BH ${value}%` : null;
}

function extractScreen(text: string): string | null {
  const m = text.match(/\b(\d{2}(?:[.,]\d)?)\s*(?:inch|inci|")/i);
  if (!m) return null;
  const size = Number(m[1].replace(",", "."));
  return size >= 10 && size <= 100 ? `${m[1].replace(",", ".")}"` : null;
}

function extractProcessor(text: string): string | null {
  const intel = text.match(/\bcore\s*(i[3579])\b/i) ?? text.match(/\b(i[3579])[-\s]\d{3,5}/i);
  if (intel) return `Core ${intel[1].toLowerCase()}`;
  const ryzen = text.match(/\bryzen\s*([3579])\b/i);
  if (ryzen) return `Ryzen ${ryzen[1]}`;
  const apple = text.match(/\b(m[1-4])(\s*(pro|max))?\s*chip\b/i) ?? text.match(/\bchip\s*(m[1-4])\b/i);
  if (apple) return apple[1].toUpperCase();
  return null;
}

function extractVoltage(text: string): string | null {
  const volt = text.match(/\b(\d{2})\s*v\b/i);
  if (!volt) return null;
  const ah = text.match(/\b(\d{1,2})\s*ah\b/i);
  return ah ? `${volt[1]}V ${ah[1]}Ah` : `${volt[1]}V`;
}

function extractRegion(text: string): string | null {
  if (/\bibox\b/i.test(text)) return "iBox";
  if (/\binter(nasional)?\b/i.test(text)) return "Inter";
  return null;
}

function extractCompleteness(text: string): string | null {
  if (/\bfull\s*set\b|\bfullset\b/i.test(text)) return "Fullset";
  if (/\bunit\s*only\b|\bbatangan\b/i.test(text)) return "Unit saja";
  return null;
}

/**
 * Mengambil maksimal `limit` spesifikasi kunci dari judul dan deskripsi.
 * Urutan prioritas: storage, battery health, layar, prosesor, voltase, region, kelengkapan.
 */
export function extractKeySpecs(
  input: { title: string; description?: string | null },
  limit = 2
): string[] {
  const title = input.title || "";
  const description = input.description ? stripHtml(input.description) : "";
  const combined = `${title}\n${description}`;
  const isPhone = isPhoneTitle(title);
  const isVehicle = VEHICLE_CONTEXT.test(title);

  const candidates = [
    extractStorage(combined, isPhone, title),
    isPhone ? extractBatteryHealth(combined) : null,
    extractScreen(combined),
    extractProcessor(combined),
    isVehicle ? extractVoltage(combined) : null,
    isPhone ? extractRegion(combined) : null,
    extractCompleteness(combined),
  ];

  const specs: string[] = [];
  for (const spec of candidates) {
    if (spec && !specs.includes(spec)) specs.push(spec);
    if (specs.length >= limit) break;
  }
  return specs;
}
