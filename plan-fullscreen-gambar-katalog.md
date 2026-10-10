# 🔍 Plan: Fitur Full-Screen Lightbox Gambar Produk Katalog

## 1. Latar Belakang Masalah
* Sebagian besar foto detail barang lelang/gadget difoto dengan rasio **4:3**.
* Pada halaman detail katalog (`/lelang/katalog/[id]`), foto saat ini dibatasi oleh container `aspect-[4/3]` dengan CSS `object-cover`.
* Pengunjung sering kali tidak dapat melihat detail kondisi fisik barang (seperti lecet, dent, port, kelengkapan, dll.) karena gambar tidak bisa diklik untuk dibuka dalam ukuran penuh (*full screen*) dan bagian tepi foto bisa terpotong di layar tertentu.

---

## 2. Target yang Ingin Dicapai
1. **Bisa Dibuka Penuh (Full Screen):** Pengunjung dapat mengetuk/klik gambar utama atau menekan tombol *Expand* untuk membuka foto dalam mode layar penuh berlatar hitam pekat (`bg-black/95`).
2. **Tanpa Terpotong (Object-Contain):** Foto ditampilkan 100% utuh sesuai aspek rasio aslinya (4:3, 16:9, portrait) tanpa ada bagian tepi yang terpotong.
3. **Navigasi Multi-Foto:** Pengguna tetap bisa menggeser (*swipe*) atau menekan tombol navigasi berikutnya/sebelumnya saat berada dalam mode layar penuh.
4. **Indikator & Kontrol Jelas:**
   - Nomor slide (contoh: `2 / 5`).
   - Tombol tutup (`✕`) yang besar dan ramah sentuhan jempol di HP.
   - Tombol navigasi panah kiri & kanan.
   - Dukungan tombol keyboard (`Esc`, panah kiri/kanan).
5. **Sinkronisasi Slider:** Indeks foto yang aktif di slider utama dan di mode layar penuh selalu tersinkronisasi secara dua arah.

---

## 3. Rencana Arsitektur & Implementasi

### A. Komponen Modal Lightbox (`ImageLightbox.tsx`)
Membuat komponen terdedikasi atau terintegrasi di `src/app/(public)/katalog/[id]/ImageSlider.tsx`:
* **State Management:**
  - `isLightboxOpen`: boolean (status buka/tutup).
  - `activeLightboxIndex`: number (posisi foto yang sedang dilihat).
* **Fitur & Interaksi:**
  - `object-contain` pada elemen gambar modal agar proporsi 4:3 tampil utuh.
  - Event listener `keydown` untuk tombol `Escape`, `ArrowLeft`, `ArrowRight`.
  - Body scroll-lock (`document.body.style.overflow = 'hidden'`) agar halaman belakang tidak ikut tergulung saat modal aktif.
  - Touch gesture / swipe kiri-kanan untuk kenyamanan navigasi di smartphone.

### B. Pembaruan pada `ImageSlider.tsx`
1. Menambahkan cursor pointer pada slide gambar: `cursor-zoom-in`.
2. Menambahkan tombol ikon **Zoom / Fullscreen** di pojok kanan atas foto sebagai petunjuk visual (*affordance*) bahwa foto bisa diperbesar.
3. Mengabaikan video YouTube dari lightbox (video tetap diputar langsung di iframe slider).

---

## 4. Kriteria Selesai (Definition of Done)
- [ ] Foto di halaman katalog bisa diklik langsung atau melalui tombol ikon Zoom.
- [ ] Mode layar penuh menampilkan seluruh gambar secara utuh (`object-contain`) tanpa ada crop.
- [ ] Tersedia tombol tutup `✕`, klik di latar hitam, dan tombol `Escape` untuk menutup.
- [ ] Navigasi foto (geser / tombol panah) berjalan mulus di mode full screen.
- [ ] Posisi foto tersinkronisasi dengan slider utama saat modal ditutup.
- [ ] Nol dependensi baru — performa tetap ringan dan cepat.
