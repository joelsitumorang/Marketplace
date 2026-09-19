# Task: Fix Preview Gambar saat Share Link & UI Overflow di Mobile

## 1. Konteks Project
```
Nama project     : Halaman customer /lelang + MBG Internal Portal (admin)
Stack            : Next.js (App Router), TypeScript, Tailwind CSS
Lokasi kode      : app/lelang/katalog/[id] (detail barang), src/app/mbg-internal-portal
                    (Manajemen Barang, POS Kasir)
Sumber laporan   : Screenshot WhatsApp (link share tanpa gambar) + screenshot
                    mobile (Manajemen Barang & checkout POS Kasir terpotong)
```

## 2. Tujuan Task

**A. Preview gambar saat share link produk**
```
Situasi sekarang : Link produk yang di-share (WhatsApp/social media) hanya
                    menampilkan teks, tanpa gambar/thumbnail produk.
Yang diinginkan  : Link produk menampilkan rich preview dengan gambar produk,
                    judul, dan deskripsi — seperti link pada umumnya.
```

**B. UI overflow di mobile**
```
Situasi sekarang : Halaman Manajemen Barang (judul & tombol Export Excel/
                    Tambah Barang terpotong) dan checkout POS Kasir (tombol
                    metode pembayaran & DP terpotong) overflow ke kanan di
                    layar mobile, perlu scroll horizontal.
Yang diinginkan  : Kedua halaman fit penuh di layar mobile tanpa horizontal
                    scroll, semua elemen terlihat & bisa dipakai normal.
```

## 3. Task Breakdown
```
[ ] 1. Cek halaman app/lelang/katalog/[id]/page.tsx — apakah sudah ada
       generateMetadata() dengan openGraph.images; kalau belum, tambahkan
[ ] 2. Pastikan URL gambar di og:image absolute (https://domain.com/...),
       bukan relative path, dan bisa diakses publik tanpa auth
[ ] 3. Tambahkan og:title, og:description sesuai nama/deskripsi barang, dan
       twitter:card "summary_large_image" untuk kompatibilitas lebih luas
[ ] 4. Test hasil pakai tool seperti metatags.io atau Facebook Sharing
       Debugger, lalu share ulang link ke WhatsApp untuk verifikasi
       (WA bisa cache preview lama — cek apakah perlu link/parameter baru
       untuk lihat hasil terbaru)
[ ] 5. Audit halaman Manajemen Barang di viewport mobile (~360-414px) —
       identifikasi elemen yang overflow (kemungkinan header dengan 2 tombol
       yang tidak wrap)
[ ] 6. Perbaiki layout header Manajemen Barang: tombol Export Excel/Tambah
       Barang di-stack vertikal atau flex-wrap di layar sempit
[ ] 7. Audit halaman checkout POS Kasir di viewport mobile — identifikasi
       elemen Metode Pembayaran & Bayar Sebagian (DP) yang overflow
[ ] 8. Perbaiki layout metode pembayaran & DP supaya tombol wrap/stack rapi,
       tidak terpotong di layar sempit
[ ] 9. Uji manual di beberapa lebar layar mobile umum (360px, 390px, 414px)
       untuk kedua halaman, pastikan tidak ada horizontal scroll
[ ] 10. Laporkan daftar file yang diubah
```

## 4. Definition of Done
```
- [ ] Link produk yang di-share ke WhatsApp/social media menampilkan gambar
      preview (rich link), bukan cuma teks
- [ ] Halaman Manajemen Barang fit penuh di layar mobile, judul & tombol
      tidak terpotong
- [ ] Halaman checkout POS Kasir (metode pembayaran & DP) fit di layar
      mobile, semua tombol/elemen terlihat penuh
- [ ] Tidak ada regresi tampilan di layar desktop untuk kedua halaman
```

## 5. Batasan & Izin
```
Boleh tanpa tanya dulu : edit metadata, edit className/style Tailwind
Harus tanya dulu        : kalau ternyata perlu restrukturisasi komponen besar
                           (bukan sekadar perbaikan CSS/responsive)
```

## 6. Checkpoint Review
```
Cek setelah : og:image beres & teruji (langkah 1-4) — sebelum lanjut ke
              perbaikan UI mobile
Cek lagi    : setelah masing-masing halaman (Manajemen Barang, lalu POS
              Kasir) selesai diperbaiki
```
