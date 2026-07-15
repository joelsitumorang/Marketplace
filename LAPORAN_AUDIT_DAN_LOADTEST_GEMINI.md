# LAPORAN AUDIT & LOAD TESTING BANDWIDTH
## SISTEM MARKETPLACE LELANG PT MBG

Dokumen ini berisi hasil pengujian beban (*load testing*) dan audit codebase untuk memandu kecerdasan buatan (Gemini AI) dalam melakukan refaktorisasi dan optimasi bandwidth pada proyek ini.

---

## 1. LATAR BELAKANG & PERMASALAHAN
* **Masalah Vercel:** Akun Vercel mengalami suspend karena penggunaan **Fast Origin Transfer (bandwidth outbound)** melampaui limit gratis (free tier).
* **Masalah Supabase:** Penggunaan **Egress Database** melampaui batas wajar secara instan.
* **Hasil Singkat Audit:** Ditemukan bahwa file gambar di-upload dan disimpan sebagai **string Base64** langsung ke kolom PostgreSQL, dan seluruh data ini ditarik berulang-ulang tanpa batas (tanpa select kolom spesifik dan tanpa paginasi).

---

## 2. HASIL REAL LOAD TESTING BENCHMARK
Skrip pengujian beban otomatis (`scripts/load-test.js`) telah dijalankan pada staging environment (`https://marketplace-mbg-sangar.vercel.app/lelang`) untuk mensimulasikan trafik riil dan mengukur data transfer (HTML + API `/api/items?limit=20`):

### Profil A: Sequential Hit Test (Simulasi 1 Pengguna Refresh Berulang)
* **Spesifikasi:** 100 requests berurutan dengan delay 200ms.
* **Sukses:** 100/100 (100% OK)
* **Durasi Total:** 312,68 detik
* **Total Bandwidth Terpakai:** **2,14 GB**
* **Rata-rata Data per Page Load:** **21,94 MB**

### Profil B: Concurrent Burst Test (Simulasi Trafik Padat Kasir/Pembeli Bersamaan)
* **Spesifikasi:** 30 virtual users menembak website secara bersamaan.
* **Sukses:** 30/30 (100% OK)
* **Durasi Total:** 61,91 detik
* **Total Bandwidth Terpakai:** **658,1 MB**
* **Rata-rata Data per Page Load:** **21,94 MB**

> **Kesimpulan Pengujian:** Setiap kali ada user membuka katalog produk (memuat 20 barang pertama), perangkat mereka harus mengunduh **21,94 MB** data JSON. Hal ini terjadi karena base64 gambar berukuran raksasa disalurkan langsung di dalam respon API.

---

## 3. DAFTAR TEMUAN UTAMA (Dari Dampak Terbesar ke Terkecil)

### Temuan #1: Gambar Disimpan dalam Format Base64 di Database PostgreSQL (Dampak: Kritis)
* **File & Baris:** 
  * `src/app/mbg-internal-portal/items/new/page.tsx` (baris 76-108, 172-200)
  * `src/app/mbg-internal-portal/items/ItemsTableClient.tsx` (baris 511-538)
  * `src/app/api/items/route.ts` (baris 35, 65-66)
  * `src/app/api/admin/gudang/lifecycle/route.ts` (baris 184-219)
* **Deskripsi:** Gambar hasil kompresi diubah menjadi string data Base64 panjang menggunakan `FileReader.readAsDataURL` di sisi klien. String ini dikirim dalam format JSON ke server dan disimpan ke kolom `images` (`String[]`) tabel database.
* **Akibat:** Egress Supabase membengkak, Vercel Fast Origin Transfer meledak, CDN image optimization Vercel tidak bisa digunakan, dan browser tidak bisa melakukan caching gambar secara lokal karena gambar tertanam di JSON.

### Temuan #2: Query Listing Tanpa Batas Record (Paginasi) (Dampak: Tinggi)
* **File & Baris:**
  * `src/app/mbg-internal-portal/items/page.tsx` (baris 9-11): Memanggil `prisma.auctionItem.findMany()` untuk seluruh data barang saat memuat tabel admin.
  * `src/app/api/admin/gudang/lifecycle/route.ts` (baris 39-43): Memanggil `prisma.pawnContract.findMany()` tanpa paginasi untuk setiap tab lifecycle gudang (Stok Aktif, Perpanjang, dll).
  * `src/app/api/admin/gudang/route.ts` (baris 51-60): `prisma.physicalItem.findMany()` menarik seluruh riwayat stok gudang fisik.
* **Deskripsi:** Tidak ada batasan `take` / `skip` pada query database di panel admin.
* **Akibat:** Scan database berukuran penuh mengirimkan seluruh metadata beserta base64 gambar berulang kali ke server Next.js.

### Temuan #3: Missing Column Projection (Select Column) pada Query Catalog (Dampak: Tinggi)
* **File & Baris:**
  * `src/app/api/items/route.ts` (baris 154-159): `prisma.auctionItem.findMany()`
* **Deskripsi:** Query pagination untuk katalog depan (mengambil 20 item) tidak menyaring kolom yang ditarik. Kolom panjang seperti `description`, `defects`, dan seluruh array gambar base64 ditarik sekaligus, padahal halaman katalog depan hanya membutuhkan informasi ringkas (judul, harga, cabang, kategori, dan gambar utama).
* **Akibat:** Payload JSON yang dikirimkan berukuran 22MB hanya untuk 20 item katalog.

### Temuan #4: Query API Kasir Scan POS Membawa Data Gambar Base64 (Dampak: Sedang)
* **File & Baris:**
  * `src/app/api/kasir/scan/route.ts` (baris 14-16)
  * `src/app/mbg-internal-portal/kasir/KasirPOSClient.tsx`
* **Deskripsi:** Kasir POS memanggil API scan untuk memvalidasi SKU. API mengembalikan seluruh baris data item (termasuk kolom images). Padahal, frontend POS kasir tidak menampilkan gambar sama sekali.
* **Akibat:** Transfer data yang tidak perlu setiap kasir menscan barang.

### Temuan #5: Query Seluruh Transaksi Penjualan pada Analitik Dashboard (Dampak: Sedang)
* **File & Baris:**
  * `src/app/api/admin/analytics/route.ts` (baris 86-107)
* **Deskripsi:** Menarik seluruh data transaksi penjualan untuk dihitung trend grafik harian secara real-time di Next.js serverless function apabila filter tanggal kosong.
* **Akibat:** Supabase Egress tinggi seiring bertambahnya data transaksi harian.

---

## 4. PANDUAN REFAKTORISASI UNTUK GEMINI AI
Berikut adalah langkah-langkah terperinci untuk memperbaiki masalah ini secara permanen:

### Langkah 1: Implementasi Supabase Storage untuk Gambar
1. Buat bucket publik baru di Supabase bernama `auction-images`.
2. Ganti logika di `new/page.tsx` dan `ItemsTableClient.tsx` agar mengunggah file biner gambar hasil kompresi langsung ke Supabase Storage menggunakan SDK `@supabase/supabase-js`.
3. Simpan URL publik hasil upload (format `https://...`) ke dalam kolom `images` di database (bukan string base64).

### Langkah 2: Batasi Kolom yang Ditarik (Select Projection)
1. Di `/api/items` (GET) katalog depan, ubah kueri `findMany` dengan menambahkan blok `select` untuk hanya menarik kolom yang diperlukan oleh listing card:
   ```typescript
   select: {
     id: true,
     sku: true,
     title: true,
     price: true,
     category: true,
     branchName: true,
     kondisi: true,
     status: true,
     images: true, // simpan URL gambar pertama saja di masa depan, atau filter di backend
     isMarketplaceVisible: true
   }
   ```
2. Pastikan data detail barang lengkap (seperti `description` dan `defects`) hanya di-query saat memuat detail spesifik barang saja (`findUnique` berdasarkan ID).

### Langkah 3: Terapkan Paginasi pada API Admin & Gudang
1. Tambahkan parameter query `limit` dan `page`/`skip` pada kueri listing admin barang (`/mbg-internal-portal/items`) dan siklus gudang (`/api/admin/gudang/lifecycle`).
2. Implementasikan pagination UI di admin dashboard agar memuat data per halaman (misalnya 20 data per halaman).

### Langkah 4: Optimalkan Endpoint Kasir Scan
1. Batasi data yang dikembalikan oleh `/api/kasir/scan` menggunakan select projection:
   ```typescript
   select: {
     id: true,
     sku: true,
     title: true,
     price: true,
     branchName: true,
     status: true
   }
   ```
   (Keluarkan kolom `images`, `description`, dan `defects` dari API ini).
