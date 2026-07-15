# DOKUMENTASI TEKNIS & ARSITEKTUR CODEBASE: MBG LELANG
**Tanggal Pembaruan:** 15 Juli 2026

Dokumen ini menyajikan gambaran arsitektur, skema database, alur logika bisnis, strategi caching, dan data flow pengunggahan gambar aktual berdasarkan penelusuran kode sumber (*codebase*) proyek **MBG Lelang** (Marketplace Lelang & Sistem Manajemen Internal O2O milik **PT Makmur Bersama Gadai** untuk Cabang Pasuruan - Sangar).

---

## 1. OVERVIEW & TECH STACK

**MBG Lelang** adalah sistem katalog publik berbasis web dan portal administrasi internal terintegrasi untuk melacak siklus hidup barang gadai (*pawn lifecycle*) dari status aktif, perpanjangan, karantina gudang, etalase lelang publik, penjualan via POS Kasir, hingga retur penjualan.

### A. Library & Framework Dependencies
Berdasarkan berkas [package.json](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/package.json):
* **Framework Utama:** Next.js `^15.3.3` (App Router)
* **Pustaka UI:** React `^19.1.0` & React DOM `^19.1.0`
* **ORM:** Prisma `^6.9.0` (Client `@prisma/client` `^6.9.0`)
* **Autentikasi & Enkripsi:** `jose` `^6.2.3` (custom JWT middleware) & `bcryptjs` `^3.0.3` (enkripsi password admin)
* **SDK Supabase:** `@supabase/supabase-js` `^2.108.1` & `@supabase/ssr` `^0.12.0`
* **Utilitas Gambar:** `browser-image-compression` `^2.0.2` (kompresi sisi klien sebelum diunggah)
* **Barcode & QR Scanner:** `html5-qrcode` `^2.3.8` (POS kasir scanner) & `qrcode.react` `^4.2.0` (generator QR/barcode label)
* **Visualisasi & Analitik:** `recharts` `^3.8.1`
* **Laporan & Ekspor Data:** `exceljs` `^4.4.0`
* **Styling (CSS):** Tailwind CSS `^4.1.0` (menggunakan `@tailwindcss/postcss` `^4.1.0` & `postcss` `^8.5.0`)
* **Development Helper:** `tsx` `^4.19.0`, `typescript` `^5.8.3`

### B. Environment Variables yang Dipakai
Variabel lingkungan dikonfigurasi melalui berkas `.env` dan `.env.local` untuk deployment Vercel:
* `DATABASE_URL`: Connection string transaksi PostgreSQL dengan pgbouncer pooler (`port: 6543`).
* `DIRECT_URL`: Connection string sesi PostgreSQL langsung untuk migrasi skema Prisma (`port: 5432`).
* `ADMIN_PASSWORD`: Sandi default untuk autentikasi inisial panel portal admin.
* `NEXT_PUBLIC_BASE_PATH`: Jalur dasar URL Next.js (dikonfigurasi sebagai `/lelang`).
* `NEXT_PUBLIC_SUPABASE_URL`: Endpoint URL proyek Supabase (saat ini mengarah ke `https://xewbjlbyieuhkjwsvrsu.supabase.co`).
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Kunci publik anonim Supabase API.
* `SUPABASE_SERVICE_ROLE_KEY`: Kunci rahasia tingkat tinggi (*bypass RLS*) yang digunakan oleh server Next.js di Vercel untuk mengunggah gambar ke Supabase Storage.
* `JWT_SECRET`: String pengacak tanda tangan token JWT admin untuk cookie sesi (`mbg_session`).

---

## 2. DATABASE SCHEMA (Prisma)

Skema database lengkap dari file [schema.prisma](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/prisma/schema.prisma):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  password     String
  nama_lengkap String   @map("nama_lengkap")
  asal_cabang  String   @map("asal_cabang")
  role         Role     @default(ADMIN)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}

/// Represents a used item listed for sale in the pawnshop catalog.
/// Items are viewable online but can only be purchased physically at the store.
model AuctionItem {
  id                   Int                @id @default(autoincrement())
  sku                  String             @unique
  branchName           String             @map("branch_name")
  title                String
  category             String
  description          String
  defects              String?
  price                Decimal            @db.Decimal(12, 2)
  status               Status             @default(Tersedia)
  images               String[]
  whatsappNumber       String             @map("whatsapp_number")
  createdAt            DateTime           @default(now()) @map("created_at")
  youtubeUrl           String?            @map("youtube_url")
  kondisi              Kondisi
  physicalItemId       String?            @map("physical_item_id")
  isMarketplaceVisible Boolean            @default(true) @map("is_marketplace_visible")
  hasWarranty          Boolean            @default(false) @map("has_warranty")
  nomorInduk           String?            @map("nomor_induk")
  parentId             Int?               @map("parent_id")
  parent               AuctionItem?       @relation("ItemVariants", fields: [parentId], references: [id], onDelete: Cascade)
  children             AuctionItem[]      @relation("ItemVariants")
  variantImageUrl      String?            @map("variant_image_url")
  hargaJual            Decimal?           @map("harga_jual") @db.Decimal(12, 2)
  physicalItem         PhysicalItem?      @relation(fields: [physicalItemId], references: [id])
  transactions         SalesTransaction[]
  returnReason         String?            @map("return_reason")

  @@index([status])
  @@index([branchName])
  @@index([category])
  @@index([nomorInduk])
  @@index([sku(ops: raw("gin_trgm_ops"))], map: "idx_auction_items_sku_trgm", type: Gin)
  @@map("auction_items")
}

/// Records completed sales transactions logged by cashiers at the physical store.
model SalesTransaction {
  id              Int         @id @default(autoincrement())
  itemId          Int         @map("item_id")
  sku             String
  soldPrice       Decimal     @map("sold_price") @db.Decimal(12, 2)
  branchName      String      @map("branch_name")
  cashierName     String      @map("cashier_name")
  transactionDate DateTime    @default(now()) @map("transaction_date")
  item            AuctionItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  isReturned      Boolean     @default(false) @map("is_returned")
  returnReason    String?     @map("return_reason")

  @@index([transactionDate])
  @@index([branchName])
  @@index([branchName, transactionDate])
  @@map("sales_transactions")
}

/// Represents a physical item stored in the warehouse with immutable physical properties.
/// Each physical item can have multiple sequential pawn contracts over its lifetime.
model PhysicalItem {
  id           String         @id @default(uuid())
  itemName     String         @map("item_name")
  category     String
  serialNumber String?        @map("serial_number")
  branchName   String         @map("branch_name")
  currentRack  String         @map("current_rack")
  description  String?
  images       String[]
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")
  auctionItems AuctionItem[]
  contracts    PawnContract[]

  @@index([branchName])
  @@index([category])
  @@map("physical_items")
}

/// Records each pawn contract cycle for a physical item.
/// Each renewal/extension generates a new unique code, creating a traceable lineage.
model PawnContract {
  id             String       @id @default(uuid())
  uniqueCode     String       @unique @map("unique_code")
  status         PawnStatus   @default(AKTIF)
  customerName   String       @map("customer_name")
  customerPhone  String?      @map("customer_phone")
  appraisalValue Decimal      @map("appraisal_value") @db.Decimal(12, 2)
  physicalItemId String       @map("physical_item_id")
  notes          String?
  startDate      DateTime     @default(now()) @map("start_date")
  endDate        DateTime?    @map("end_date")
  createdAt      DateTime     @default(now()) @map("created_at")
  previousSku    String?      @map("previous_sku")
  extensionCount Int          @default(0) @map("extension_count")
  extensionFee   Decimal?     @map("extension_fee") @db.Decimal(12, 2)
  sellingPrice   Decimal?     @map("selling_price") @db.Decimal(12, 2)
  buyerName      String?      @map("buyer_name")
  paymentMethod  String?      @map("payment_method")
  soldAt         DateTime?    @map("sold_at")
  physicalItem   PhysicalItem @relation(fields: [physicalItemId], references: [id])

  @@index([physicalItemId])
  @@index([status])
  @@index([customerName(ops: raw("gin_trgm_ops"))], map: "idx_pawn_contracts_customer_name_trgm", type: Gin)
  @@index([status], map: "idx_pawn_contracts_status")
  @@index([uniqueCode], map: "idx_pawn_contracts_unique_code")
  @@map("pawn_contracts")
}

enum Kondisi {
  Baru
  Bekas
}

enum Role {
  SUPERADMIN
  ADMIN
}

enum PawnStatus {
  AKTIF
  PERPANJANG
  LUNAS
  TEBUS
  PROSES_LELANG
  LELANG
  TERJUAL
}

enum Status {
  Tersedia
  Dipesan
  Terjual
  RETUR
}

model AuditLog {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now()) @map("created_at")
  adminEmail  String   @map("admin_email")
  eventType   String   @map("event_type")
  productSku  String   @map("product_sku")
  productName String   @map("product_name")
  description String

  @@index([createdAt])
  @@index([adminEmail])
  @@index([eventType])
  @@map("audit_logs")
}
```

### Catatan Pemetaan Database
* Skema Prisma menggunakan anotasi `@map()` dan `@@map()` untuk menjaga kepatuhan penamaan tabel dan kolom PostgreSQL dengan standar `snake_case` (misalnya: `created_at`, `branch_name`, `unique_code`), sedangkan representasi properti di sisi TypeScript (Prisma Client) menggunakan standar `camelCase` (misalnya: `createdAt`, `branchName`, `uniqueCode`).

---

## 3. STRUKTUR FOLDER & ROUTING

Proyek menggunakan arsitektur **Next.js App Router** dengan rincian perutean (*routing*) di dalam folder `src/app`:

* **`/(public)` (Public-Facing Pages):**
  * Halaman utama katalog lelang cabang Pasuruan. Menggunakan SSR statis dengan revalidasi.
  * Halaman detail dari satu barang lelang. Menampilkan visual slider gambar, spesifikasi kondisi, serta opsi perbandingan varian.
* **`/admin` (Admin Redirection & Legacy):**
  * Mengarahkan admin ke halaman dashboard internal, serta perutean ekspor laporan lunas.
* **`/mbg-internal-portal` (Admin-Only Web App Pages):**
  * Halaman Login untuk Admin.
  * Dashboard utama yang memuat statistik harian penjualan, tren grafik pendapatan harian, performa kasir, dan daftar transaksi terbaru.
  * Tab Manajemen Siklus Hidup Barang Gudang (Stok Aktif, Perpanjangan Gadai, Karantina Gudang, dan Penyiapan Lelang).
  * Panel kontrol daftar barang katalog, penyiapan varian, pengeditan, serta penghapusan barang.
  * Form penambahan item lelang baru.
  * Antarmuka Kasir POS untuk scanning SKU dan pembayaran transaksi lunas.
  * Ekspor dan rekapitulasi data penjualan ke format Excel (`ExcelJS`).
  * Log riwayat aktivitas admin.
* **`/api` (Internal API Routes / Handlers):**
  * Endpoint publik untuk memuat data katalog lelang (`take`/`skip` dan filter cabang).
  * Kueri POS Kasir untuk melacak SKU saat kasir memindai barcode.
  * Penanganan proses checkout transaksi kasir.
  * Log masuk (*sign-in*) administrasi.
  * `/api/admin/...` (Protected API Admin):
    * Penghitungan analitik chart harian dashboard.
    * CRUD barang katalog admin.
    * CRUD data gudang fisik dan lifecycle gadai.
    * `/api/admin/upload/route.ts`: Handler upload gambar ke Supabase Storage.

### Keamanan Middleware
Next.js global middleware terpasang di [src/middleware.ts](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/middleware.ts) dengan konfigurasi matcher:
```typescript
export const config = {
  matcher: ['/mbg-internal-portal/:path*', '/api/admin/:path*', '/admin/:path*'],
};
```
* **Kepatuhan Kinerja:** Middleware ini dibatasi secara ketat hanya berjalan pada route internal `/mbg-internal-portal`, `/api/admin`, dan `/admin`. Hal ini membebaskan aset statis (seperti gambar CSS/JS) dan halaman katalog publik dari beban eksekusi decrypt JWT token, menjamin *Time to First Byte* (TTFB) katalog tetap instan.

---

## 4. ALUR PENYIMPANAN GAMBAR (DATA FLOW VERIFIED)

Setiap jalur penyimpanan gambar dalam codebase telah diperiksa satu per satu untuk memastikan kepatuhan penyimpanan URL Supabase Storage (tidak ada Base64 biner yang disimpan langsung di database):

### A. Form Tambah Barang Baru
* **Status:** **Upload ke Supabase Storage & Simpan URL publik.**
* **File & Baris Bukti:** [new/page.tsx:L76-L108](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/app/mbg-internal-portal/items/new/page.tsx#L76-L108) (untuk varian) dan [new/page.tsx:L170-L215](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/app/mbg-internal-portal/items/new/page.tsx#L170-L215) (untuk barang utama).
* **Alur:** Klien browser mengompresi gambar menggunakan `browser-image-compression`, lalu mengirimkan berkas biner ke `/api/admin/upload` via `FormData`. Respon JSON yang sukses mengembalikan URL publik Supabase Storage untuk kemudian dikirim dan disimpan ke PostgreSQL.

### B. Form Edit Barang Admin
* **Status:** **Upload ke Supabase Storage & Simpan URL publik.**
* **File & Baris Bukti:** [ItemsTableClient.tsx:L511-L555](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/app/mbg-internal-portal/items/ItemsTableClient.tsx#L511-L555).
* **Alur:** Menggunakan metode kompresi lokal yang sama, file biner diunggah ke endpoint serverless `/api/admin/upload`. URL string publik yang dikembalikan disimpan ke dalam array `images` barang bersangkutan.

### C. Gudang & Lifecycle (Siapkan Lelang)
* **Status:** **Manual Input URL / Auto-fill (Tidak ada upload gambar).**
* **File & Baris Bukti:** [UnifiedGudangClient.tsx:L669-L678](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/app/mbg-internal-portal/gudang/UnifiedGudangClient.tsx#L669-L678).
* **Alur:** Pada modal *Siapkan Lelang*, bidang input gambar adalah bidang input teks standar URL (`auctionImages`). Secara default, ini diisi otomatis menggunakan gambar barang fisik yang sudah ada di database (`row.physicalItem?.images[0]`). Admin juga dapat menempelkan tautan URL gambar eksternal secara manual. Tidak ada proses konversi base64 di frontend modal ini.

### D. File Serverless Upload Handler
* **File & Baris Bukti:** [route.ts:L45-L65](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/app/api/admin/upload/route.ts#L45-L65).
* **Cache-Control Header yang Digunakan:** **`cacheControl: "3600"`** (gambar dicache pada CDN Supabase/klien selama 1 jam).
* **Keamanan:** Memeriksa cookie sesi `mbg_session` milik user (harus ber-role `ADMIN` atau `SUPERADMIN`), lalu mengunggah file biner menggunakan client SDK `@supabase/supabase-js` dengan otorisasi `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5. STRATEGI CACHING & DATA FETCHING PER HALAMAN

Strategi perolehan data dan caching pada halaman web publik dianalisis langsung dari berkas halaman aktual:

### A. Halaman Katalog Utama (`src/app/(public)/page.tsx`)
* **Strategi Caching:** **Incremental Static Regeneration (ISR)** dengan durasi revalidasi **30 detik**.
* **File & Baris Bukti:** [page.tsx:L5](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/app/%28public%29/page.tsx#L5) -> `export const revalidate = 30;`.
* **Detail Caching:** Halaman ini dirender sebagai halaman statis saat kompilasi build, dan diperbarui di latar belakang maksimal setiap 30 detik apabila ada permintaan masuk.

### B. Halaman Detail Barang (`src/app/(public)/katalog/[id]/page.tsx`)
* **Strategi Caching:** **Incremental Static Regeneration (ISR)** dengan durasi revalidasi **30 detik**.
* **File & Baris Bukti:** [page.tsx:L6](file:///d:/Yongki/PT%20MBG/Marketplace/mbg-lelang/src/app/%28public%29/katalog/%5Bid%5D/page.tsx#L6) -> `export const revalidate = 30;`.

*Catatan: Saat kasir menyelesaikan transaksi checkout di POS, sistem memanggil `revalidatePath("/")` dan `revalidatePath("/katalog/[id]")` secara paksa untuk langsung menghapus cache barang terjual tersebut dari memori Next.js.*

---

## 6. STATUS QUERY DATABASE (SELECT PROJECTION & PAGINATION)

Kueri pemuatan data menggunakan ORM Prisma dioptimalkan dengan pembatasan kolom (*select projection*) dan paginasi (*limit-offset*):

1. **`/api/items` (GET - Katalog Publik):**
   * **Select Projection:** **Ya** (Menggunakan objek `selectFields` untuk membatasi kolom yang ditarik, meskipun tetap menyertakan `description` & `defects` karena dibutuhkan oleh detail modal client).
   * **Paginasi:** **Ya** (Menggunakan parameter `take: limit` dan `skip` berdasarkan kueri URL).
2. **`/api/admin/gudang` (GET - Daftar Gudang Fisik):**
   * **Select Projection:** Tidak ada (Menarik seluruh field model `PhysicalItem` dan menyertakan relasi `contracts` serta counts).
   * **Paginasi:** **Ya** (Menerapkan `take: limit` dan `skip` dari parameter kueri URL).
3. **`/api/admin/gudang/lifecycle` (GET - Lifecycle Gudang):**
   * **Select Projection:** Tidak ada (Menarik seluruh field model `PawnContract` beserta relasi `physicalItem`).
   * **Paginasi:** **Ya** (Membatasi beban kueri dengan paginasi default 50 item per halaman lewat `take: limit` dan `skip`).
4. **`/api/admin/logs` (GET - Audit Log):**
   * **Select Projection:** Tidak ada (Menarik seluruh properti audit log karena tidak memiliki field besar).
   * **Paginasi:** **Ya** (Menerapkan `take: limit` dan `skip`).
5. **`/api/kasir/scan` (GET - Scan Barcode Kasir):**
   * **Select Projection:** **Ya** (Hanya memuat field dasar: `id`, `sku`, `title`, `price`, `branchName`, dan `status`. Mengeluarkan field besar `images`, `description`, dan `defects`).
   * **Paginasi:** Tidak relevan (Hanya memuat kueri detail tunggal berdasarkan `sku`).
6. **`/api/admin/analytics` (GET - Analitik Chart):**
   * **Select Projection:** **Ya** (Menarik relasi `item` dengan batasan select `id`, `parentId`, `title`, `category`, dan `nomorInduk`).
   * **Paginasi:** Tidak ada (Kueri data penjualan mencakup penarikan seluruh data dalam rentang filter tanggal guna kalkulasi tren chart harian).

---

## 7. BUSINESS LOGIC UTAMA

### A. Alur POS Kasir (Checkout Transaksi)
1. Kasir memindai barcode SKU barang melalui kamera atau mengetik SKU secara manual.
2. Endpoint `/api/kasir/scan` memvalidasi keberadaan barang, memastikan barang tidak berstatus `Terjual` atau `RETUR`.
3. Barang masuk ke antrean keranjang kasir. Kasir mengirimkan data checkout ke `/api/kasir/checkout`.
4. Transaksi database (`prisma.$transaction`) berjalan secara atomik:
   * Membaca ulang status barang terakhir.
   * Mengubah status barang `AuctionItem` menjadi `Terjual`.
   * Menambahkan baris transaksi baru di tabel `SalesTransaction` (menyimpan nama kasir, harga deal terjual, cabang, dan relasi item).
5. Mengirim entri aktivitas log audit (`logActivity`).
6. Memanggil `revalidatePath` untuk menghapus cache katalog publik dan detail barang agar barang terjual hilang dari etalase seketika.

### B. Alur Retur Barang (Hanya oleh Superadmin)
1. Pada tabel manajemen barang admin, Superadmin memicu tombol retur pada barang berstatus `Terjual`.
2. Request dikirim ke `/api/admin/items/[id]` (PATCH/PUT) dengan payload `status: "RETUR"`.
3. Server memverifikasi status inisial barang (harus `Terjual`).
4. Server mengubah status barang `AuctionItem` menjadi `"RETUR"` dan menyimpan alasan retur pada kolom `returnReason`.
5. Server memperbarui seluruh `SalesTransaction` milik barang tersebut dengan menandai `isReturned: true` dan menyisipkan `returnReason` (ini secara otomatis memotong pendapatan di analytics/laporan tanpa menghapus sejarah data transaksi).
6. Status barang `AuctionItem` langsung diubah kembali menjadi `"Tersedia"` agar dapat dijual kembali pada etalase katalog lelang.
7. Menulis audit log retur barang dan menghapus cache katalog Next.js.

### C. Siklus Hidup Kontrak Gadai (Pawn Lifecycle)
* **Pendaftaran Kontrak Baru (Aktif):**
  * Gudang menginput metadata barang dan data nasabah.
  * Membuat data `PhysicalItem` (status default `currentRack: "Receiving"`).
  * Membuat data `PawnContract` dengan status `AKTIF` dan `extensionCount: 0`.
  * Tanggal jatuh tempo (`endDate`) dihitung otomatis berdasarkan jenis kategori barang (Elektronik = 1 bulan, Kendaran = 2 bulan, Gerabahan = 4 bulan) jika admin tidak menginput tanggal secara manual.
* **Perpanjangan Kontrak (Perpanjang):**
  * Admin gudang memperpanjang kontrak gadai yang hampir jatuh tempo.
  * Kontrak lama diperbarui statusnya menjadi `PERPANJANG`.
  * Membuat baris kontrak `PawnContract` baru dengan status `AKTIF`, nilai `extensionCount` bertambah 1, `previousSku` mereferensikan nomor seri unik kontrak lama, serta mengenakan biaya perpanjangan (`extensionFee`).
* **Tebus Kontrak:**
  * Kontrak gadai diperbarui statusnya menjadi `TEBUS` (menandakan nasabah telah melunasi pinjaman dan mengambil kembali barangnya).
* **Penyiapan Lelang (Forfeiture & Post Katalog):**
  * Barang yang tidak ditebus/diperpanjang melewati jatuh tempo diubah status kontraknya menjadi `LELANG`.
  * Kueri membuat record `AuctionItem` baru di katalog publik dengan data fisik yang diwarisi dari `PhysicalItem`, status katalog diatur ke `Tersedia`, dan harga disesuaikan dengan nilai appraisal lelang.

---

## 8. KOMPONEN UI PENTING (CLIENT COMPONENTS)

Proyek ini dibangun dengan antarmuka yang dinamis menggunakan *Client Components* Next.js di folder portal internal:

1. **`UnifiedGudangClient.tsx` (Dashboard Gudang & Lifecycle):**
   * Mengelola seluruh interaksi tab siklus gadai.
   * Mengatur modal perpanjangan kontrak, detail riwayat pinjaman nasabah, dan form posting etalase lelang.
   * Menangani antarmuka navigasi halaman (*pagination control*) tabel gadai.
2. **`ItemsTableClient.tsx` (Tabel Manajemen Barang Admin):**
   * Renders daftar barang yang terdaftar di etalase lelang.
   * Menyediakan formulir pengeditan penuh (*Full Edit Form*), upload gambar, toggle visibilitas, dan penghapusan barang.
   * Menampung antarmuka aksi retur barang bagi Superadmin.
3. **`KasirPOSClient.tsx` (Kasir Point of Sales):**
   * Mengintegrasikan modul kamera untuk mendeteksi barcode/QR Code via `html5-qrcode`.
   * Mengelola keranjang belanja kasir, kalkulasi total diskon/harga deal, dan mencetak nota bukti transaksi.
4. **`CatalogView.tsx` (Katalog Depan):**
   * Menampilkan etalase grid produk untuk calon pembeli.
   * Menyediakan filter kategori dinamis, pencarian teks, dan modal detail gambar slider.

---

## 9. RIWAYAT PERBAIKAN TERAKHIR

### A. Optimasi Bandwidth dan Egress (Juli 2026)
* **Masalah Awal:** Pengiriman payload base64 gambar berukuran besar di dalam JSON `/api/items` menyedot kuota bandwidth Vercel hingga 21,94 MB sekali muat halaman (menghabiskan 2,14 GB hanya dalam 100 kunjungan).
* **Solusi Perbaikan:** 
  * Seluruh file base64 digantikan dengan link URL publik Supabase Storage.
  * Kueri database dilengkapi dengan *select column projection* untuk memotong pemuatan data besar yang tidak diperlukan.
  * Endpoint admin dan lifecyle gudang dipasang paginasi limit-offset di sisi database.
* **Hasil Akhir:** Ukuran muatan halaman katalog turun **99.7%** menjadi hanya **108 KB** (total data 1.000 hit hanya menghabiskan 106 MB bandwidth).

### B. Status 28 Record Lama yang Digantikan Placeholder
* **Status Saat Ini:** Selama pembersihan database awal, **28 record historis** di tabel `AuctionItem` yang menyimpan string gambar base64 panjang telah dibersihkan secara massal menggunakan skrip migrasi dan digantikan dengan URL gambar placeholder default:
  `https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=800&q=80`
* **Tindak Lanjut:** Data lama ini aman dan tidak lagi membebani sistem. Apabila admin ingin memulihkan foto asli barang-barang tersebut, admin dapat membuka menu portal edit barang (`ItemsTableClient`) untuk mengunggah ulang foto baru. Sistem akan secara otomatis mengompresi dan menyimpannya ke Supabase Storage secara sukses.

### C. Perbaikan Kelengkapan Dashboard (Bug Incomplete Group)
* **Masalah:** Statistik kelengkapan transaksi lelang di dashboard melaporkan keliru `BELUM LENGKAP` akibat pengelompokan berbasis string `nomorInduk` yang rawan salah input data.
* **Solusi Perbaikan:** Mengubah logika kueri dashboard analitik (`/api/admin/analytics`) agar mengelompokkan kelengkapan transaksi berdasarkan **`parentId` (ID kunci asing unik PostgreSQL)** secara *parent-inclusive* (menyertakan barang induk dan seluruh anak varian). Data input kelompok lain tidak akan lagi saling mencemari statistik.

---

## 10. ISU/TODO YANG DIKETAHUI BELUM SELESAI

Meskipun sistem saat ini berjalan dengan optimal, terdapat beberapa item *backlog* yang direkomendasikan untuk pengembangan berkelanjutan:

1. **Paginasi Database untuk Tabel Admin Barang:**
   * Halaman `/mbg-internal-portal/items` saat ini memuat seluruh data katalog barang dari database di server, kemudian baru dibagi menjadi beberapa halaman menggunakan *local slice pagination* di sisi klien browser (`ItemsTableClient`). 
   * *Rekomendasi:* Migrasikan tabel admin ini ke sistem server-side pagination dengan `limit` dan `skip` agar database query lebih efisien saat data barang mencapai ribuan item.
2. **Keterbatasan Ekspor Laporan Excel:**
   * Proses ekspor laporan Excel (`exceljs`) pada menu laporan admin menarik data transaksi secara penuh tanpa batas limit. Ini bisa menyebabkan *timeout* atau penggunaan memori tinggi pada serverless function Vercel jika data transaksi tahunan sangat masif.
   * *Rekomendasi:* Terapkan filter rentang tanggal wajib (*mandatory date-range filter*) sebelum ekspor Excel diizinkan berjalan.
3. **Pembersihan File Sampah di Supabase Storage:**
   * Saat admin menghapus barang lelang atau mengedit gambar lama dengan gambar baru, berkas gambar lama yang tersimpan di bucket Supabase Storage tidak dihapus secara otomatis (hanya record URL-nya yang hilang dari database PostgreSQL).
   * *Rekomendasi:* Buat *trigger* atau *hook* API untuk menghapus file di storage menggunakan `supabase.storage.from().remove()` saat barang lelang dihapus.
