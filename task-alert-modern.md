# Task: Ganti Alert Bawaan Browser ke Alert/Konfirmasi Modern

## 1. Konteks Project
```
Nama project     : MBG Internal Portal (admin portal auction marketplace)
Stack            : Next.js (App Router, dominan Server Components), TypeScript,
                    Tailwind CSS, lucide-react, Supabase + Prisma
Lokasi kode      : src/app/mbg-internal-portal
Modul terkait    : POS Kasir, Gudang, Semua Barang, Tambah Barang, Laporan,
                    Log Aktivitas, Kelola Pengguna
Konvensi kode    : ikuti pola komponen yang sudah ada di project (Server Components
                    dominan, client component hanya untuk bagian interaktif)
Hal yang dihindari: jangan ubah skema database/Prisma untuk task ini — murni UI/UX
```

## 2. Tujuan Task
```
Situasi sekarang : Semua notifikasi (sukses/error) dan konfirmasi aksi di admin
                    portal masih pakai window.alert() / window.confirm() bawaan
                    browser — termasuk di halaman POS Kasir saat pembayaran.
Yang diinginkan  : Seluruh notifikasi memakai toast modern, dan seluruh konfirmasi
                    aksi (termasuk konfirmasi sebelum submit pembayaran di POS
                    Kasir) memakai modal dialog modern. Tidak ada lagi pemanggilan
                    alert()/confirm() bawaan browser di manapun pada admin portal.
```

## 3. Task Breakdown
```
[ ] 1. Audit: cari semua pemanggilan window.alert() dan window.confirm()
       di seluruh src/app/mbg-internal-portal. Buat daftar: file, baris,
       konteks pemakaian (notifikasi sukses/error, atau konfirmasi aksi).
       Laporkan hasil audit ini dulu sebelum lanjut ke implementasi.
[ ] 2. Setup toast: install & konfigurasi library toast (sonner) di root
       layout admin portal.
[ ] 3. Buat komponen ConfirmDialog reusable (modal) untuk menggantikan
       window.confirm — menerima props title, message, onConfirm, onCancel.
[ ] 4. Ganti semua window.alert() -> toast.success()/toast.error() sesuai
       konteksnya, mulai dari modul POS Kasir (prioritas utama).
[ ] 5. Ganti semua window.confirm() -> ConfirmDialog, mulai dari konfirmasi
       submit pembayaran di POS Kasir.
[ ] 6. Lanjutkan penggantian alert/confirm di modul lain: Gudang, Semua Barang,
       Tambah Barang, Laporan, Log Aktivitas, Kelola Pengguna.
[ ] 7. Uji manual tiap modul yang sudah diganti — pastikan toast & dialog
       muncul dengan benar dan aksi tetap berjalan seperti sebelumnya.
[ ] 8. Laporkan daftar lengkap file yang diubah.
```

## 4. Definition of Done
```
- [ ] grep "window.alert(" dan "window.confirm(" di src/app/mbg-internal-portal
      tidak menemukan hasil apapun
- [ ] Notifikasi sukses/error tampil sebagai toast modern di semua modul
- [ ] Ada dialog konfirmasi modern sebelum submit pembayaran di POS Kasir
- [ ] Semua modul (POS Kasir, Gudang, Semua Barang, Tambah Barang, Laporan,
      Log Aktivitas, Kelola Pengguna) sudah dicek, tidak ada alert/confirm
      bawaan browser tersisa
- [ ] Tidak ada fitur lain yang rusak (regresi) setelah perubahan
```

## 5. Batasan & Izin
```
Boleh tanpa tanya dulu : install library toast, buat komponen baru,
                          edit file yang memanggil alert/confirm
Harus tanya dulu        : kalau ternyata perlu ubah struktur data/schema
                          (seharusnya tidak perlu untuk task ini)
```

## 6. Checkpoint Review
```
Cek setelah  : Langkah 1 (hasil audit) — sebelum lanjut implementasi, supaya
               tahu berapa banyak titik yang perlu diubah dan di file mana saja
Cek lagi     : setelah POS Kasir selesai (langkah 4-5), sebelum lanjut ke
               modul lain — karena ini modul paling prioritas dari laporan bug
```
