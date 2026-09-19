# Task: Halaman Detail Barang, Share, Viewcount, Thumbnail & Export Excel

## 1. Konteks Project
```
Nama project     : Halaman customer /lelang (katalog publik) + admin portal
                    manajemen barang, bagian dari online auction system
Stack            : Next.js (App Router), TypeScript, Tailwind CSS, Supabase + Prisma
Lokasi kode      : app/lelang (customer-facing), src/app/mbg-internal-portal
                    (admin — Manajemen Barang, Dashboard)
Referensi        : contoh halaman detail yang dituju —
                    https://www.mbgpasuruan.co.id/lelang/katalog/1333
Konvensi kode    : ikuti pola komponen yang sudah ada (Server Components
                    dominan di halaman customer)
```

## 2. Tujuan Task
```
- Klik barang di katalog /lelang -> ke halaman detail barang per-item
- Tombol CTA di detail barang jadi "Beli Sekarang" (teks saja), pesan WA yang
  terkirim tetap template lama ("mau tanya ketersediaan") — tidak diubah
- Ada tombol share produk di halaman detail
- Admin bisa lihat viewcount tiap barang (dihitung polos, tanpa dedup) untuk
  tahu barang paling diminati
- Admin bisa pilih foto mana yang jadi thumbnail katalog per barang
- Admin bisa export daftar barang tersedia ke Excel dari halaman Manajemen
  Barang/Semua Barang
```

## 3. Task Breakdown
```
[ ] 1. Update schema Prisma: tambah field view_count (int, default 0) dan
       thumbnail_url/thumbnail_index (nullable) di AuctionItem, migration
[ ] 2. Buat route dinamis app/lelang/katalog/[id]/page.tsx — ambil data
       AuctionItem by id, tampilkan foto, harga, kondisi, deskripsi, dll
[ ] 3. Update halaman katalog utama: ubah link tiap kartu barang mengarah
       ke halaman detail baru (langkah 2)
[ ] 4. Di halaman detail: increment view_count tiap kali halaman diakses
       (server-side, polos tanpa dedup session/IP)
[ ] 5. Di halaman detail: ubah label tombol jadi "Beli Sekarang", pastikan
       link/pesan WA yang terbentuk tetap pakai template lama
       ("mau tanya ketersediaan ...")
[ ] 6. Di halaman detail: tambah tombol Share — pakai Web Share API
       (navigator.share) untuk mobile, fallback "salin link" untuk browser
       yang tidak support
[ ] 7. Admin - halaman Tambah/Edit Barang: tampilkan semua foto yang
       diupload, tambah UI untuk pilih salah satu jadi thumbnail (dipakai
       di katalog customer)
[ ] 8. Admin - Dashboard: tampilkan viewcount per barang, bisa di-sort
       "paling banyak dilihat"
[ ] 9. Admin - halaman Manajemen Barang/Semua Barang: tambah tombol
       "Export Excel", generate laporan barang berstatus tersedia
       (pakai exceljs atau xlsx/SheetJS di API route)
[ ] 10. Uji manual: klik barang dari katalog -> detail, viewcount bertambah,
        tombol Beli Sekarang -> WA dengan pesan lama, tombol share berfungsi,
        pilih thumbnail tampil benar di katalog, export Excel menghasilkan
        file dengan data yang benar
[ ] 11. Laporkan daftar file yang diubah + ringkasan perubahan schema
```

## 4. Definition of Done
```
- [ ] Klik barang di katalog mengarah ke halaman detail sesuai pola URL contoh
- [ ] View count bertambah tiap halaman detail diakses (polos)
- [ ] Tombol "Beli Sekarang" tampil, pesan WA yang terkirim tetap template lama
- [ ] Tombol share berfungsi di mobile (native share) & desktop (fallback)
- [ ] Admin bisa pilih & menyimpan thumbnail per barang, tampil benar di katalog
- [ ] Admin bisa lihat & sort barang berdasarkan viewcount
- [ ] Export Excel menghasilkan file data barang tersedia yang akurat
- [ ] Tidak ada fitur katalog/admin lain yang rusak
```

## 5. Batasan & Izin
```
Boleh tanpa tanya dulu : buat route baru, tambah field via migration (additive,
                          tidak mengubah field lama), install library exceljs/xlsx
Harus tanya dulu        : kalau ternyata butuh ubah struktur foto/gallery yang
                           sudah ada (bukan cuma tambah field thumbnail)
```

## 6. Checkpoint Review
```
Cek setelah : Langkah 2-3 (halaman detail barang jadi & bisa diakses dari
              katalog) — ini fondasi untuk viewcount & share
Cek lagi    : setelah semua fitur admin (thumbnail, viewcount, export Excel)
              selesai, sebelum uji final menyeluruh
```
