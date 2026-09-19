# Task: Metode Pembayaran (Tunai/Transfer/Split) & Fitur DP di POS Kasir

## 1. Konteks Project
```
Nama project     : MBG Internal Portal (admin portal auction marketplace)
Stack            : Next.js (App Router), TypeScript, Tailwind CSS, Supabase + Prisma
Lokasi kode      : src/app/mbg-internal-portal, modul POS Kasir
Prasyarat        : idealnya dikerjakan setelah task "alert/konfirmasi modern"
                    selesai — dipakai untuk validasi (mis. nominal split tidak
                    sesuai) dan konfirmasi sebelum submit pembayaran
Konvensi kode    : ikuti pola komponen & schema yang sudah ada
Hal yang dihindari: jangan hapus/ubah field transaksi lama yang sudah dipakai
                     laporan lain tanpa migration yang aman
```

## 2. Tujuan Task

**A. Metode Pembayaran**
```
Situasi sekarang : POS Kasir belum punya pilihan metode pembayaran.
Yang diinginkan  : Kasir bisa pilih Tunai, Transfer, atau Split (gabungan
                    tunai + transfer). Untuk Split, nominal tunai + transfer
                    harus sama dengan total tagihan.
```

**B. Fitur DP**
```
Situasi sekarang : Belum ada cara mencatat transaksi yang dibayar sebagian (DP).
Yang diinginkan  : Kasir bisa proses pembayaran DP (sebagian). Barang otomatis
                    dianggap terjual (keluar dari stok/katalog), tapi status
                    transaksi di laporan tetap "DP" sampai lunas. DP punya batas
                    waktu 3 hari (dp_deadline) — kalau lewat, TIDAK auto-batal,
                    cukup ditandai di laporan supaya admin bisa putuskan manual.
                    Nota cetak transaksi DP menampilkan Total Tagihan, Dibayar,
                    dan Kekurangan.
```

## 3. Task Breakdown
```
[ ] 1. Update schema Prisma: tambah field payment_method (enum TUNAI, TRANSFER,
       SPLIT) + amount_cash, amount_transfer (nullable) di SalesTransaction
[ ] 2. Tambah status baru "DP" di enum status transaksi (selain LUNAS, RETUR),
       tambah field dp_deadline (datetime, nullable)
[ ] 3. Buat tabel baru PaymentInstallment (relasi ke SalesTransaction): amount,
       tanggal_bayar, metode, dibuat_oleh — untuk mencatat tiap pelunasan DP
[ ] 4. Jalankan migration, verifikasi tidak merusak data transaksi lama
[ ] 5. UI Checkout: tambah selector metode pembayaran. Untuk Split, tampilkan
       2 input (nominal tunai & transfer) + validasi sum = total tagihan
       (pakai toast error dari task alert modern kalau tidak sesuai)
[ ] 6. UI Checkout: tambah opsi "Bayar DP" — input nominal DP (< total tagihan),
       saat submit: set status "DP", set dp_deadline = sekarang + 3 hari,
       barang keluar dari stok/katalog (update relasi ke AuctionItem)
[ ] 7. Halaman Detail Transaksi: tambah aksi "Bayar Pelunasan" untuk transaksi
       status DP — input nominal, simpan sebagai PaymentInstallment baru; kalau
       total dibayar sudah >= total tagihan, ubah status otomatis jadi LUNAS
[ ] 8. Cetak nota: transaksi DP menampilkan Total Tagihan/Dibayar/Kekurangan;
       transaksi biasa menampilkan metode pembayaran (termasuk rincian split)
[ ] 9. Halaman Laporan Transaksi: tambah indikator/badge "DP Jatuh Tempo" untuk
       transaksi status DP yang dp_deadline-nya sudah lewat hari ini
[ ] 10. Uji manual: tunai, transfer, split (termasuk validasi sum salah), DP +
        pelunasan sebagian, DP + pelunasan penuh (jadi LUNAS), DP lewat 3 hari
        (pastikan badge muncul, status tetap DP, tidak auto-batal)
[ ] 11. Laporkan daftar file yang diubah + ringkasan perubahan schema
```

## 4. Definition of Done
```
- [ ] Kasir bisa checkout dengan metode Tunai/Transfer/Split, Split tervalidasi
      sum = total tagihan
- [ ] Kasir bisa proses DP: status jadi "DP", barang keluar dari stok/katalog,
      dp_deadline tersimpan (+3 hari)
- [ ] Ada aksi pelunasan DP yang mencatat installment & auto-update ke LUNAS
      kalau sudah dibayar penuh
- [ ] Nota cetak DP menampilkan Total/Dibayar/Kekurangan dengan benar
- [ ] Laporan Transaksi menampilkan indikator DP jatuh tempo, tanpa perubahan
      status otomatis (tetap manual oleh admin)
- [ ] Tidak ada alur transaksi lain (LUNAS/RETUR biasa) yang rusak
```

## 5. Batasan & Izin
```
Boleh tanpa tanya dulu : buat komponen UI baru, tambah field/tabel via migration
Harus tanya dulu        : sebelum menjalankan migration di database produksi —
                           pastikan sudah ada backup atau dijalankan di staging dulu
```

## 6. Checkpoint Review
```
Cek setelah : Langkah 1-4 (schema & migration) — pastikan struktur data DP dan
              payment method sudah sesuai rencana sebelum masuk ke UI
Cek lagi    : setelah alur DP end-to-end selesai (langkah 6-9), sebelum uji final
```
