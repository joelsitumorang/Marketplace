# Task: Installable Web App (PWA) — Admin Portal & Halaman Customer /lelang

## 1. Konteks Project
```
Nama project     : MBG Internal Portal (admin) + halaman customer /lelang,
                    bagian dari online auction system
Stack            : Next.js (App Router), TypeScript, Tailwind CSS, deploy di Vercel
Lokasi kode      : src/app/mbg-internal-portal (admin), app/lelang (customer)
Kebutuhan        : DUA bagian ini masing-masing bisa di-install terpisah
                    (beda manifest, beda scope) di PC & mobile, dari Chrome
                    dkk. TIDAK perlu offline-capable — cukup installable,
                    aplikasi tetap butuh koneksi internet untuk jalan normal.
Dependency       : butuh aset icon/logo (192x192 & 512x512 PNG minimal) untuk
                    masing-masing bagian — kalau belum ada, tanya ke user dulu
                    sebelum lanjut ke langkah icon
```

## 2. Tujuan Task
```
- Admin portal (MBG Internal Portal) bisa di-install sebagai app terpisah,
  dengan nama & icon sendiri, start dari /mbg-internal-portal
- Halaman customer /lelang bisa di-install sebagai app terpisah, dengan nama
  & icon sendiri, start dari /lelang
- Tidak ada ekspektasi offline — cukup lolos kriteria installability browser
```

## 3. Task Breakdown
```
[ ] 1. Siapkan icon aplikasi minimal 192x192 & 512x512 PNG untuk admin portal
       dan untuk /lelang (bisa beda atau sama, konfirmasi dulu ke user kalau
       belum ada asetnya)
[ ] 2. Buat public/manifest-admin.webmanifest — name, short_name,
       start_url "/mbg-internal-portal", scope "/mbg-internal-portal",
       display "standalone", theme_color, background_color, icons
[ ] 3. Buat public/manifest-lelang.webmanifest — name, short_name,
       start_url "/lelang", scope "/lelang", display "standalone",
       theme_color, background_color, icons
[ ] 4. Tambahkan <link rel="manifest" href="..."> yang sesuai di layout admin
       portal dan layout /lelang masing-masing (JANGAN dipasang di root
       layout kalau bisa bikin konflik scope), plus <meta name="theme-color">
[ ] 5. Buat service worker minimal di public/sw.js — cukup install/activate
       listener + fetch handler pass-through (tanpa caching agresif, karena
       tidak butuh offline), sekadar memenuhi syarat installability
[ ] 6. Register service worker di client-side, sekali untuk seluruh origin
       (satu registrasi cukup untuk kedua scope)
[ ] 7. Tambah meta tag khusus iOS Safari di masing-masing layout:
       apple-touch-icon, apple-mobile-web-app-capable,
       apple-mobile-web-app-title (dukungan PWA iOS beda dari Android/Chrome)
[ ] 8. Uji installability lewat Chrome DevTools > Application > Manifest —
       pastikan tidak ada error/warning untuk kedua manifest
[ ] 9. Uji install manual: Chrome desktop (admin & lelang terpisah), Chrome
       Android (Add to Home Screen), Safari iOS (Add to Home Screen)
[ ] 10. Laporkan hasil uji per platform + daftar file yang dibuat/diubah
```

## 4. Definition of Done
```
- [ ] Admin portal bisa di-install sebagai app terpisah (Chrome desktop &
      mobile), dengan nama & icon sendiri
- [ ] Customer /lelang bisa di-install sebagai app terpisah, dengan nama &
      icon sendiri
- [ ] Chrome DevTools > Application > Manifest tidak menunjukkan error untuk
      kedua bagian
- [ ] App yang ter-install berjalan normal (butuh internet — tidak perlu
      berfungsi saat offline)
- [ ] Icon & nama tampil benar di home screen/desktop setelah install, di
      Android maupun iOS
```

## 5. Batasan & Izin
```
Boleh tanpa tanya dulu : buat file manifest & service worker baru, tambah
                          meta tag di layout
Harus tanya dulu        : kalau belum ada aset icon/logo resmi untuk salah
                           satu atau kedua bagian
```

## 6. Checkpoint Review
```
Cek setelah : manifest + service worker untuk admin portal selesai dan lolos
              test installability (langkah 2, 4-6, 8) — sebelum ulangi pola
              yang sama untuk /lelang
Cek lagi    : setelah kedua bagian selesai, sebelum uji cross-platform
              (terutama iOS yang perilakunya beda)
```
