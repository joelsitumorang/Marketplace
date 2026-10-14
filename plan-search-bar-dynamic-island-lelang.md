# 📋 Rencana Pengerjaan: Search Bar "Dynamic Island", Sort, Filter, dan Kategori Berikon di `/lelang`

Dokumen ini disusun berdasarkan brief `C:\Users\hp\Downloads\brief-search-bar-dynamic-island-lelang.md` serta hasil audit mendalam terhadap basis kode katalog publik MBG (`/lelang`).

---

## 1. Temuan Audit (Langkah 0)

| Komponen Audit | Temuan di Basis Kode Saat Ini | Dampak / Keputusan Implementasi |
|---|---|---|
| **Next.js & Routing** | Next.js `15.3.3` (App Router), React `19.1.0`. `next.config.ts` mendefinisikan `basePath: '/lelang'`. Halaman root `/` di folder `src/app/(public)` diakses di browser sebagai `/lelang`, dan `/katalog/[id]` sebagai `/lelang/katalog/[id]`. | Pada Next.js 15, `searchParams` di Server Component berbentuk `Promise<SearchParams>`. Perlu di-`await` sebelum parsing. Navigasi client otomatis memperhitungkan `basePath`. |
| **Data Fetching & Visibilitas** | Dilakukan langsung di Server Component `src/app/(public)/page.tsx` menggunakan Prisma. Aturan visibilitas aktif: `branchName: { contains: "Pasuruan", mode: "insensitive" }`, `status: Status.Tersedia`, `isMarketplaceVisible: true`. | Aturan visibilitas dasar ini **wajib dipertahankan 100%**. Search, sort, dan filter baru hanya menyaring di atas aturan visibilitas ini. |
| **Model DB (`AuctionItem`)** | Nama kolom: `title` (bukan `name`), `sku`, `category`, `kondisi` (enum: `Baru`, `Bekas`), `price` (Decimal), `branchName`, `status`, `images` (array URL), `thumbnailIndex`, `createdAt`, `isMarketplaceVisible`. | Query `select` (proyeksi) diperketat: hanya ambil `id, title, sku, category, kondisi, price, branchName, status, images, thumbnailIndex, createdAt`. Jangan ambil deskripsi panjang / video URL untuk listing grid. |
| **Kondisi Fitur Saat Ini** | Sudah ada input `SearchBar` sederhana (hanya memfilter `title` & `sku` secara kasar) dan tab kategori horizontal. **Belum ada** sort, filter sheet (kondisi, harga, cabang), pill Dynamic Island, dan chip kategori berikon. | Komponen lama `SearchBar.tsx` digantikan sepenuhnya oleh sistem `SearchIsland`. |
| **Daftar Kategori & Cabang** | Kategori di tab saat ini memakai daftar hardcode: `["Elektronik", "Gerabahan", "Kendaraan", "Alat Tukang", "Pakaian", "Alat Rumah Tangga"]`. Cabang di database lelang publik terfilter hanya untuk **Pasuruan** (`branchName: contains "Pasuruan"`). | Sesuai aturan Bagian 8.3: karena katalog saat ini single-branch (hanya Pasuruan), **filter Cabang disembunyikan**. Kategori "Gerabahan" dipertahankan apa adanya dengan fallback icon `Package` sampai ada konfirmasi nama baru. |
| **Font & Layout Header** | Font situs: `Inter` via `next/font/google` (`--font-sans`). Tidak ada fixed navbar di atas katalog publik; halaman dimulai langsung dari banner hero gradien biru (`pt-14 pb-20`). | Posisi `sticky` pill aman di `top: 16px` (atau `calc(16px + env(safe-area-inset-top))`). Nilai `--stick` disesuaikan dengan posisi awal pill terhadap dokumen. |
| **Aturan Keras (Constraints)** | 0 budget (tanpa API/SDK eksternal), tanpa blur/glassmorphism berat di elemen baru, flat/minimalis, mobile-first touch target 44×44px, teks Bahasa Indonesia, semua state pencarian/filter tersimpan di URL. | Dipatuhi penuh. Desain Dynamic Island menggunakan warna flat `#111111`, border `#2A2A2C`, aksen hijau `#32D74B`, dan `IntersectionObserver` ringan untuk state menciut. |

---

## 2. Struktur Modul & Berkas Baru

Sesuai rekomendasi brief Bagian 12 dan konvensi proyek:

```
src/
├── app/
│   └── (public)/
│       ├── page.tsx                     # Server Component utama: await searchParams, fetch data via query.ts
│       ├── _lib/
│       │   ├── params.ts                # Kontrak URL: validasi whitelist, parsing, & serialisasi searchParams
│       │   └── query.ts                 # Server query: buildWhere, buildOrderBy, fetchCatalogData, suggestItems
│       ├── CatalogView.tsx              # Presentational Client View (refactored): menyatukan Island, Chips, Grid
│       └── island.css                   # Keyframes & scroll-driven animation CSS (Bagian 7.2)
├── components/
│   └── lelang/
│       ├── SearchIsland.tsx             # Client Component: Pill Dynamic Island (State A, B, C, D) + IO sentinel
│       ├── CategoryChips.tsx            # Baris chip horizontal kategori berikon Lucide
│       ├── ResultBar.tsx                # Sort chip, chip filter aktif dengan X, counter barang, & tombol reset
│       ├── FilterSheet.tsx              # Bottom sheet (lazy load via next/dynamic): kondisi & rentang harga
│       └── GridSkeleton.tsx             # Skeleton loading minimalis saat Suspense fallback
```

---

## 3. Rencana Tahapan Eksekusi (Fase Pengerjaan)

### 🚀 FASE 1: Core Search Island, Sort, Kategori Berikon & Animasi Menciut (Commit 1)
*Fokus: Memberikan nilai terbesar dengan footprint kode terkecil tanpa risiko regresi.*

1. **Kontrak Parameter & Query Server (`_lib/params.ts` & `_lib/query.ts`):**
   - Mendefinisikan whitelist parameter URL:
     - `q`: string maks 60 karakter, pembersihan spasi ganda.
     - `sort`: `terbaru` (default), `harga_asc`, `harga_desc`.
     - `category`: string kategori yang cocok.
     - `kondisi`: `baru` | `bekas`.
     - `harga`: preset `lt500k` | `500k-2m` | `2m-5m` | `5m-10m` | `gt10m`.
     - `cursor`: token pagination keyset / page.
   - Fungsi `buildWhere()`:
     - Menggabungkan aturan dasar visibilitas (`Pasuruan`, `Tersedia`, `isMarketplaceVisible: true`).
     - Tokenisasi `q` dipisah spasi: setiap token wajib cocok (AND) pada salah satu kolom (`title`, `sku`, `category`) dengan `contains` + `mode: 'insensitive'`.
     - Filter kondisi (`Baru` / `Bekas`) dan range harga numerik sesuai preset.
   - Fungsi `buildOrderBy()`:
     - `terbaru` -> `[{ createdAt: "desc" }, { id: "desc" }]`
     - `harga_asc` -> `[{ price: "asc" }, { id: "asc" }]`
     - `harga_desc` -> `[{ price: "desc" }, { id: "desc" }]`
   - Projection `select` hemat payload (hanya kolom yang diperlukan untuk rendering kartu).
   - Eksekusi `Promise.all([findMany, count])` secara paralel di server.

2. **Komponen `SearchIsland.tsx` (State A, B, C):**
   - **State A (Idle):** Pill hitam `#111111`, tinggi 56px, radius 28px, ikon cari putih/abu, placeholder `"Cari iPhone, laptop, atau SKU…"`, tombol filter bulat 44px di kanan.
   - **State B (Fokus/Expanded):**
     - Membuka overlay ekspansi di tempat.
     - Input `<input type="search">` aktif dengan font 16px (mencegah auto-zoom iOS Safari).
     - Tombol hapus teks `(X)` jika ada karakter, dan tombol teks hijau `"Batal"` (`#32D74B`, min touch target 44px).
     - Scrim latar belakang gelap transparan `rgba(17,17,17, 0.5)` tanpa blur.
     - Trik iOS Focus: input tetap ter-mount (disembunyikan dengan `visibility: hidden`) dan `inputRef.current.focus()` dipanggil sinkron pada handler tap.
   - **State C (Hasil Pencarian):**
     - Pill menampilkan kata kunci aktif dengan teks putih.
     - Badge filter hijau di tombol filter jika ada filter aktif.

3. **Komponen Pendukung:**
   - **`CategoryChips.tsx`:** Chip horizontal scrollable (`overflow-x: auto`), tinggi 44px, radius 22px, ikon 16px Lucide (`LayoutGrid`, `Smartphone`, `Bike`, `Wrench`, `Shirt`, `Home`, fallback `Package`). Chip aktif tersorot hitam `#111`.
   - **`ResultBar.tsx`:** Chip sort dropdown `[Terbaru ▾]` (opsi: Terbaru, Termurah, Termahal) + teks hitungan `**N barang** untuk "kata kunci"` + tombol teks `"Reset filter"`.
   - **`GridSkeleton.tsx`:** Kotak abu `#E4E4DE` berukuran sama dengan kartu, animasi pulse halus tanpa shimmer berat.
   - **Empty State:** Menggunakan ikon `Package` / `SearchX` ramah jika hasil kosong + tombol Reset Filter.

4. **Animasi Menciut (State D) via CSS Scroll-Driven (`island.css`):**
   - Menggunakan `@keyframes island-shrink` dan `animation-timeline: scroll(root)` standar modern.
   - Shrink linear dari lebar 100% (max 640px) ke **112px di tengah** saat discroll melewati sentinel.
   - Teks memudar di 44px pertama, menyisakan ikon cari + tombol filter.
   - **Fallback A11y & Browser Lama:** Sentinel 1px + `IntersectionObserver` ringan untuk menyetel `data-collapsed="true|false"` pada wrapper pill:
     - Saat menciut: ikon cari menjadi `<button aria-label="Cari">` 44×44px yang dapat langsung membuka State B tanpa perlu scroll ke atas.
     - Mengikuti aturan `prefers-reduced-motion: reduce`.

---

### 🎨 FASE 2: Filter Bottom Sheet & Penanganan Filter Lanjutan (Commit 2)
*Fokus: Interaktivitas penyaringan barang.*

1. **Komponen `FilterSheet.tsx` (Lazy Loaded via `next/dynamic`):**
   - Bottom sheet minimalis dengan background `#FFFFFF`, rounded-t-2xl, tanpa efek glassmorphism.
   - Pilihan segmented Kondisi: `Semua | Baru | Bekas`.
   - Pilihan preset Rentang Harga: `< 500rb`, `500rb–2jt`, `2–5 jt`, `5–10 jt`, `> 10 jt`.
   - Bagian Cabang disembunyikan otomatis (karena data aktif hanya 1 cabang Pasuruan).
   - Sticky footer: Tombol teks "Reset" & Tombol hitam "Terapkan" (lebar penuh, tinggi 48px).
   - Focus trap, Esc to close, backdrop dismiss.
2. **Sinkronisasi Filter Aktif ke `ResultBar`:**
   - Menampilkan chip filter aktif dengan tombol silang `(X)` untuk menghapus filter satu per satu.
   - Tombol "Reset filter" untuk membersihkan seluruh filter sekaligus dalam 1 klik.
   - Badge angka filter di tombol filter pill Dynamic Island.

---

### ⚡ FASE 3: Saran Pencarian & Riwayat Pencarian Terakhir (Commit 3)
*Fokus: Kecepatan dan kenyamanan pembeli yang sering kembali.*

1. **Riwayat Pencarian Terakhir:**
   - Disimpan di `localStorage` (maksimal 5 kata kunci unik terbaru).
   - Tampil di dalam island saat state Fokus (sebelum mengetik).
   - Dilengkapi tombol hapus riwayat. Aman dari kegagalan mode private (`try/catch`).
2. **Saran Barang Instan (Server Action `suggestItems`):**
   - Minimal 2 karakter, debounce 250ms, `take: 5`.
   - Mengambil hanya `{ id, title, price }`.
   - Bagian nama yang cocok dicetak tebal putih, sisanya abu-abu.
   - Mengetuk saran langsung mengarah ke halaman detail barang `/lelang/katalog/[id]`.
3. **Penyempurnaan Token Numerik:**
   - Evaluasi pencarian SKU atau tipe angka khusus agar akurat.

---

## 4. Checklist Pengujian & Kriteria Penerimaan

- [ ] **Validasi Search:** Pencarian case-insensitive, tahan spasi ganda, toleran terhadap karakter khusus (`%`, `_`, `'`).
- [ ] **Integrasi URL:** Semua state (`q`, `sort`, `category`, `kondisi`, `harga`) sinkron di URL sehingga link bisa dibagikan langsung via WhatsApp.
- [ ] **Mobile Touch Target:** Seluruh tombol dan chip memenuhi standar ergonomis minimal 44×44px.
- [ ] **Input iOS Safe:** Ukuran font input 16px agar tidak memicu auto-zoom di browser iOS Safari.
- [ ] **Performa:** Zero dependency baru (memanfaatkan `lucide-react` dan Tailwind CSS v4 yang sudah ada), tanpa layout shift (CLS ≤ 0.05).
- [ ] **Kompatibilitas:** Uji kompilasi `npm run build` dan `npx eslint` bebas error.

---

## 5. Pertanyaan Terbuka / Keputusan Desain Awal

1. **Filter Cabang:** Karena katalog lelang saat ini terikat pada cabang Pasuruan, filter cabang dinonaktifkan/disembunyikan sesuai arahan Bagian 8.3.
2. **Kategori "Gerabahan":** Tetap ditampilkan dengan label asli dan ikon fallback `Package` sampai ada instruksi perubahan nama resmi dari pengelola lelang.
3. **Pagination:** Menggunakan tombol *"Muat Lebih Banyak"* yang stabil untuk koneksi mobile retail.
