# Rencana Perbaikan Fitur Retur — MBG Internal Portal

Dokumen ini menjabarkan perubahan yang diperlukan untuk dua hal: pencatatan alasan retur yang terstruktur, dan pembatasan masa retur 3 hari dengan jalur persetujuan SUPERADMIN.

---

## 0. Klarifikasi aturan waktu

Aturan yang dimaksud diasumsikan sebagai berikut:

| Jarak dari tanggal transaksi | Siapa yang bisa memproses |
|---|---|
| 0–3 hari (≤ 72 jam) | ADMIN / kasir, langsung selesai |
| Lebih dari 3 hari | Wajib persetujuan SUPERADMIN |

Kalau yang dimaksud sebenarnya kebalikannya (retur baru boleh diajukan *setelah* melewati 3 hari), angka pembatasnya tetap sama, hanya arah perbandingannya yang dibalik di satu tempat — lihat catatan di bagian 3.

**Keputusan yang sudah ditetapkan:**

- **Basis perhitungan: selisih tanggal kalender**, bukan 72 jam penuh. Artinya transaksi tanggal 10 dan pengajuan retur tanggal 13 dianggap "3 hari" meski jam pastinya kurang dari 72 jam. Ini lebih mudah dipahami kasir di lapangan meski sedikit lebih longgar untuk pembeli. Lihat bagian 3 untuk implementasinya.
- **Batas atas**: masih terbuka — belum ditetapkan batas keras. Disarankan tetap ada (misal 30 hari) supaya laporan bulanan yang sudah ditutup tidak berubah setelah dikunci; lihat bagian 8.

---

## 1. Perubahan skema Prisma

### 1.1 Enum baru

```prisma
enum ReturnReason {
  TIDAK_SESUAI_DESKRIPSI   // kondisi/spesifikasi beda dari katalog
  RUSAK_SAAT_DITERIMA      // cacat yang tidak terdeteksi saat serah terima
  KELENGKAPAN_KURANG       // charger, box, dus, kunci, dll tidak lengkap
  SALAH_INPUT_KASIR        // kesalahan administratif, bukan keluhan pembeli
  BERUBAH_PIKIRAN          // pembeli batal, barang tidak bermasalah
  LAINNYA                  // wajib mengisi penjelasan tambahan
}

enum ReturnCondition {
  LAYAK_JUAL_ULANG
  PERLU_PERBAIKAN
  RUSAK_TOTAL
}

enum ReturnStatus {
  MENUNGGU_PERSETUJUAN
  DISETUJUI
  DITOLAK
}

enum TransactionStatus {
  SELESAI
  DIRETUR
}
```

### 1.2 Model `SalesReturn`

```prisma
model SalesReturn {
  id                 String   @id @default(cuid())

  salesTransactionId String
  salesTransaction   SalesTransaction @relation(fields: [salesTransactionId], references: [id])
  auctionItemId      String
  auctionItem        AuctionItem      @relation(fields: [auctionItemId], references: [id])

  // --- Alasan ---
  reason             ReturnReason
  reasonNote         String?          // penjelasan tambahan, wajib untuk LAINNYA
  condition          ReturnCondition

  // --- Uang ---
  refundAmount       Decimal          @db.Decimal(14, 2)
  refundMethod       String           // tunai / transfer / tukar barang

  // --- Waktu & persetujuan ---
  daysSincePurchase  Int              // dibekukan saat pengajuan, bukan dihitung ulang
  requiresApproval   Boolean          @default(false)
  status             ReturnStatus     @default(DISETUJUI)
  approvalNote       String?          // alasan SUPERADMIN menyetujui/menolak
  approvedById       String?
  approvedBy         User?            @relation("ReturnApprover", fields: [approvedById], references: [id])
  approvedAt         DateTime?

  // --- Jejak ---
  processedById      String
  processedBy        User             @relation("ReturnProcessor", fields: [processedById], references: [id])
  asal_cabang        String
  createdAt          DateTime         @default(now())

  @@index([status, asal_cabang])
  @@index([salesTransactionId])
}
```

**Catatan penting:** `daysSincePurchase` disimpan sebagai angka pada saat pengajuan dibuat. Kalau dihitung ulang saat SUPERADMIN membuka daftar persetujuan, angkanya akan terus bertambah dan riwayatnya jadi membingungkan.

### 1.3 Perubahan pada model lama

```prisma
model SalesTransaction {
  // ... field yang sudah ada
  status   TransactionStatus @default(SELESAI)
  returns  SalesReturn[]
}
```

`SalesTransaction` **tidak pernah dihapus atau diubah nominalnya**. Retur hanya menambah baris baru dan mengubah `status`. Ini yang menjaga rekonsiliasi kas harian tetap bisa ditelusuri.

**Lingkup versi ini: retur penuh satu transaksi.** Retur sebagian (satu item dari transaksi berisi beberapa barang) ditunda dulu — skema di atas cukup untuk itu tanpa perubahan struktural, tapi UI dan validasi pada dokumen ini mengasumsikan satu retur = satu transaksi penuh. Saat retur sebagian digarap nanti, `auctionItemId` yang sudah ada di `SalesReturn` memang sudah per-item, sehingga perluasan ke arah situ kemungkinan besar hanya menyentuh form dan validasi nominal, bukan skema database.

Enum `Role` dan status `AuctionItem` yang sudah ada tidak perlu berubah — status `RETUR` tetap dipakai, tapi kini hanya sebagai kondisi sementara sampai retur disetujui.

---

## 2. Alur pengajuan retur

```
Kasir buka detail transaksi
  └─ klik "Proses Retur"
       └─ Form: alasan (dropdown) + penjelasan + kondisi barang + nominal refund
            └─ Server hitung selisih waktu dari SalesTransaction.createdAt
                 ├─ ≤ 72 jam  → status DISETUJUI, efek langsung berlaku
                 └─ > 72 jam  → status MENUNGGU_PERSETUJUAN
                                  ├─ barang dikunci (tidak bisa dijual ulang)
                                  ├─ refund BELUM dicatat sebagai pengurang pendapatan
                                  └─ muncul di antrean SUPERADMIN
                                       ├─ DISETUJUI → efek berlaku
                                       └─ DITOLAK   → barang & transaksi kembali normal
```

### Efek saat retur berstatus DISETUJUI

1. `SalesTransaction.status` → `DIRETUR`
2. `AuctionItem.status` ditentukan oleh `condition`:
   - `LAYAK_JUAL_ULANG` → `Tersedia`, `isMarketplaceVisible` kembali aktif
   - `PERLU_PERBAIKAN` → `RETUR`, tetap tersembunyi dari katalog publik, muncul di modul Gudang
   - `RUSAK_TOTAL` → status write-off, keluar permanen dari katalog
3. Baris `AuditLog` dibuat
4. Laporan periode berjalan ikut menyesuaikan

---

## 3. Validasi sisi server

Semua pengecekan **wajib** dilakukan di server action / route handler. Validasi di sisi klien hanya untuk kenyamanan, bukan penegakan aturan.

```ts
const BATAS_HARI_BEBAS = 3;          // hari
const BATAS_HARI_KERAS = 30;         // tolak sepenuhnya di atas ini

// Selisih tanggal KALENDER, bukan 72 jam penuh.
// Normalisasi ke tengah malam supaya jam transaksi tidak memengaruhi hasil.
function selisihHariKalender(dariTanggal: Date, keTanggal: Date): number {
  const awal = new Date(dariTanggal.getFullYear(), dariTanggal.getMonth(), dariTanggal.getDate());
  const akhir = new Date(keTanggal.getFullYear(), keTanggal.getMonth(), keTanggal.getDate());
  return Math.round((akhir.getTime() - awal.getTime()) / 864e5);
}

const hariSejakBeli = selisihHariKalender(transaksi.createdAt, new Date());

// Kalau aturannya dibalik (retur baru boleh SETELAH 3 hari),
// cukup ubah baris di bawah menjadi: hariSejakBeli < BATAS_HARI_BEBAS
const perluPersetujuan = hariSejakBeli > BATAS_HARI_BEBAS;

if (hariSejakBeli > BATAS_HARI_KERAS) {
  throw new Error("Transaksi melewati batas maksimal retur (30 hari).");
}
if (perluPersetujuan) {
  // Dibuat sebagai pengajuan. SUPERADMIN boleh menyetujui pengajuan
  // miliknya sendiri (lihat validasi di bawah) — tidak ada pemisahan tugas.
  status = "MENUNGGU_PERSETUJUAN";
}
```

### Daftar validasi yang perlu ada

- `reasonNote` wajib diisi (minimal 10 karakter) jika `reason` = `LAINNYA` atau `TIDAK_SESUAI_DESKRIPSI`
- `refundAmount` tidak boleh melebihi nilai transaksi asli
- Transaksi yang sudah berstatus `DIRETUR` tidak bisa diretur lagi
- Tidak boleh ada dua pengajuan `MENUNGGU_PERSETUJUAN` untuk transaksi yang sama
- ADMIN hanya bisa mengajukan retur untuk transaksi dari `asal_cabang` miliknya
- **SUPERADMIN boleh menyetujui pengajuan yang ia buat sendiri** — tidak ada pemisahan tugas antara pengaju dan penyetuju. Ini sesuai dengan kondisi cabang kecil yang sering hanya punya satu SUPERADMIN. Konsekuensinya: baris `AuditLog` untuk kasus ini jadi satu-satunya jejak kontrol, jadi pastikan `approvalNote` tetap wajib diisi meski penyetujunya adalah pengaju sendiri.
- Refund **dibayarkan langsung dari laci kasir** saat retur diproses — tidak ada proses pencairan terpisah. `refundMethod` untuk kasus tunai dicatat sebagai pengurang setoran kas hari itu, bukan sebagai transaksi kas keluar yang berdiri sendiri. Ini berarti laporan rekonsiliasi kas harian (bukan hanya laporan penjualan) juga perlu menampilkan retur sebagai baris pengurang.

---

## 4. Antarmuka

### 4.1 Form retur — `/mbg-internal-portal/kasir/[transaksiId]/retur`

Komponen klien. Isi form:

| Field | Tipe | Keterangan |
|---|---|---|
| Alasan retur | `select` | 6 pilihan dari enum `ReturnReason` |
| Penjelasan tambahan | `textarea` | Wajib untuk `LAINNYA` dan `TIDAK_SESUAI_DESKRIPSI`, opsional lainnya |
| Kondisi barang saat kembali | `radio` | 3 pilihan dari `ReturnCondition` |
| Nominal refund | `number` | Default = harga jual, bisa dikurangi (potongan/biaya) |
| Metode refund | `select` | Tunai / transfer / tukar barang |

**Banner informasi di atas form**, dirender berdasarkan umur transaksi:

- ≤ 3 hari → *"Transaksi berumur N hari. Retur dapat diproses langsung."* (hijau)
- \> 3 hari → *"Transaksi berumur N hari, melewati batas 3 hari. Pengajuan akan dikirim ke SUPERADMIN untuk persetujuan."* (kuning)
- \> 30 hari → form dinonaktifkan dengan penjelasan (merah)

Tombol submit ikut menyesuaikan label: **"Proses Retur"** vs **"Ajukan Persetujuan Retur"**. Ini penting supaya kasir tidak mengira retur sudah selesai padahal masih mengantre.

### 4.2 Halaman retur — `/mbg-internal-portal/retur`

Server Component dengan tabel berisi kolom: tanggal, SKU, alasan, kondisi, nominal, status, pemroses, cabang. Filter: status, rentang tanggal, alasan, cabang.

Untuk SUPERADMIN, tampilkan **tab "Menunggu Persetujuan"** dengan badge jumlah. Di tiap baris ada aksi Setujui / Tolak yang membuka dialog berisi ringkasan transaksi, alasan dari kasir, dan field `approvalNote`.

### 4.3 Sidebar

Tambah entri **Retur** di `AdminSidebar.tsx` di bawah Semua Barang. Untuk SUPERADMIN, tampilkan indikator angka bila ada pengajuan menunggu.

### 4.4 Dashboard

Tambahkan kartu **"Retur bulan ini"** (jumlah transaksi + total nilai) dan, khusus SUPERADMIN, notifikasi pengajuan tertunda.

---

## 5. Dampak pada laporan

Halaman Laporan dan Dashboard perlu memisahkan tiga angka:

- **Penjualan kotor** — seluruh `SalesTransaction` pada periode
- **Total retur** — `SUM(refundAmount)` dari `SalesReturn` berstatus `DISETUJUI`
- **Pendapatan bersih** — selisih keduanya

Pengajuan berstatus `MENUNGGU_PERSETUJUAN` **tidak** dihitung sebagai pengurang, tapi sebaiknya ditampilkan sebagai catatan kaki ("Rp X menunggu persetujuan") supaya angka tidak mengagetkan saat nanti disetujui.

Laporan performa kasir juga perlu menampilkan kolom retur. Kasir dengan tingkat retur `TIDAK_SESUAI_DESKRIPSI` yang tinggi menandakan masalah pada proses input barang, bukan pada penjualannya.

Satu keputusan akuntansi yang perlu ditetapkan: kalau transaksi Januari diretur pada Februari, apakah pengurangan masuk ke laporan Januari atau Februari? Standar praktik: **masuk ke periode retur terjadi (Februari)**, supaya laporan yang sudah ditutup tidak berubah. Ini sekaligus alasan adanya batas keras 30 hari.

---

## 6. Audit trail

Tambahkan `eventType` pada `AuditLog`:

- `RETURN_REQUESTED` — pengajuan dibuat, simpan alasan dan nominal
- `RETURN_AUTO_APPROVED` — retur dalam 3 hari, langsung berlaku
- `RETURN_APPROVED` — disetujui SUPERADMIN, catat `approvedById` dan `approvalNote`
- `RETURN_REJECTED` — ditolak, catat alasan penolakan

Retur adalah jalur paling rawan penyelewengan di POS berbasis kas — transaksi dibatalkan, uang diambil, barang dikembalikan ke rak. Kelengkapan log di sini nilainya lebih tinggi daripada di modul lain.

---

## 7. Urutan implementasi

| Tahap | Pekerjaan | Perkiraan |
|---|---|---|
| 1 | Migrasi Prisma: enum, model `SalesReturn`, field `status` pada `SalesTransaction` | ~1 jam |
| 2 | Server action `createReturn` lengkap dengan validasi waktu dan efek ke `AuctionItem` | ~3 jam |
| 3 | Form retur + banner umur transaksi | ~3 jam |
| 4 | Halaman daftar retur + filter | ~2 jam |
| 5 | Antrean & dialog persetujuan SUPERADMIN | ~3 jam |
| 6 | Penyesuaian laporan dan dashboard | ~2 jam |
| 7 | Entri AuditLog + sidebar | ~1 jam |

Tahap 1–3 sudah cukup untuk dipakai sehari-hari; tahap 5 bisa menyusul selama sementara itu retur di atas 3 hari diblokir sepenuhnya.

---

## 8. Status keputusan

Sudah ditetapkan:

- ✅ Basis waktu: **selisih tanggal kalender**
- ✅ SUPERADMIN **boleh** menyetujui pengajuannya sendiri
- ✅ Refund tunai **langsung dari laci kasir**, tanpa proses pencairan terpisah
- ✅ Retur sebagian **ditunda** — versi ini hanya menangani retur penuh satu transaksi
- ✅ Batas keras: **30 hari** sejak tanggal transaksi. Retur di atas 30 hari ditolak sepenuhnya oleh sistem, tanpa jalur pengecualian.

Masih terbuka:

*(Tidak ada — semua keputusan sudah ditetapkan.)*
