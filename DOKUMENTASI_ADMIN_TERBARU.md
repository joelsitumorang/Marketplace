# Dokumentasi Portal Internal Admin (MBG Internal Portal)

Dokumen ini berisi penjelasan struktur dan fitur pada modul **Admin / Internal Portal** (`src/app/mbg-internal-portal`) dari proyek Marketplace PT MBG. Modul ini berfungsi sebagai *back-office* untuk mengelola inventaris, gudang, kasir, pengguna, hingga memantau laporan.

---

## 🏗 Struktur Navigasi & Hak Akses (Role)

Akses ke dalam sistem portal admin diatur oleh sesi otentikasi. Hanya pengguna yang masuk yang dapat melihat portal ini.
Terdapat dua *role* utama yang ada pada sistem (berdasarkan skema `Role`):
- **ADMIN**: Memiliki akses ke fitur harian kasir, gudang, dan pengelolaan barang.
- **SUPERADMIN**: Memiliki seluruh akses `ADMIN` ditambah dengan wewenang untuk **mengelola pengguna lain**.

Navigasi sidebar (`src/components/AdminSidebar.tsx`) menyesuaikan berdasarkan *role* pengguna dan cabang (`asal_cabang`).

### Daftar Menu Admin:

#### 1. 📊 Dashboard (`/mbg-internal-portal`)
Halaman pertama setelah login. Berisi metrik performa toko cabang, seperti:
- Total barang aktif/tersedia.
- Total penjualan.
- Total pendapatan.
- Grafik penjualan harian.
- Grafik berdasarkan kategori barang.
- Laporan performa masing-masing kasir.
- 15 Transaksi terakhir.

#### 2. 🛒 POS Kasir (`/mbg-internal-portal/kasir`)
Fitur kasir atau *Point of Sale* untuk memproses transaksi.
- Terintegrasi dengan model `SalesTransaction` pada database.
- Saat kasir menjual barang, status `AuctionItem` akan otomatis berubah menjadi `Terjual` (atau tercatat pembayarannya).

#### 3. 🏭 Gudang (`/mbg-internal-portal/gudang`)
Modul ini digunakan untuk melacak riwayat fisik barang yang ada di gudang.
- Terhubung dengan model `PhysicalItem` dan `PawnContract`.
- Cocok untuk mengelola barang gadai karena model mencatat lokasi rak (`current_rack`), perpanjangan gadai (`extensionCount`), hingga status barang (`PawnStatus`: Aktif, Perpanjang, Lunas, Tebus, Proses Lelang, dll).

#### 4. 📦 Semua Barang (`/mbg-internal-portal/items`)
Halaman tabel atau daftar yang berisi seluruh barang katalog (`AuctionItem`).
- Menampilkan SKU, harga, status (`Tersedia`, `Dipesan`, `Terjual`, `RETUR`), kondisi (`Baru`/`Bekas`), serta asal cabang.
- Barang dari halaman ini yang di-set visibilitasnya (`isMarketplaceVisible`) akan tampil di katalog publik pengguna umum (O2O).

#### 5. ➕ Tambah Barang (`/mbg-internal-portal/items/new`)
Formulir untuk mendaftarkan barang baru ke dalam katalog lelang/bekas.

#### 6. 📈 Laporan (`/mbg-internal-portal/reports`)
Halaman khusus untuk menghasilkan *report* atau analitik penjualan dan pergerakan stok lebih mendalam dari periode ke periode.

#### 7. 🕒 Log Aktivitas (`/mbg-internal-portal/log-aktivitas`)
Menampilkan jejak aktivitas (Audit Trail) para admin.
- Tersimpan pada model `AuditLog`.
- Mencatat siapa yang mengubah, menghapus, atau menambah data beserta waktu (`createdAt`), `eventType`, serta produk yang terdampak. Sangat penting untuk investigasi jika ada kesalahan stok.

#### 8. 👥 Kelola Pengguna (`/mbg-internal-portal/settings/manage-users`)
*(Khusus Role SUPERADMIN)*
Halaman untuk manajemen akun staf/karyawan. Admin utama dapat mendaftarkan email, nama, mengatur peran (`ADMIN` atau `SUPERADMIN`), serta penempatan cabang (`asal_cabang`) untuk staf tersebut.

---

## 🗄 Relasi Model Database (Prisma)
Portal Admin berinteraksi langsung dengan model Prisma berikut:

1. **`User`**: Data kredensial dan hak akses staf.
2. **`AuctionItem`**: Katalog barang (item untuk dijual/lelang di frontend & POS).
3. **`SalesTransaction`**: Catatan penjualan. Memiliki relasi ke `AuctionItem`.
4. **`PhysicalItem`**: Mewakili wujud fisik barang di gudang. Dapat dipisah dari `AuctionItem` karena satu barang fisik bisa memiliki siklus gadai/pembukuan berulang.
5. **`PawnContract`**: Histori kontrak gadai barang (`PhysicalItem`).
6. **`AuditLog`**: Pencatatan aktivitas staf terkait manipulasi barang.

---

## 🎨 Arsitektur Frontend Admin
- Menggunakan **Next.js App Router** terbaru.
- **Server Components** digunakan secara dominan (contoh pada `page.tsx` Dashboard) untuk optimasi kecepatan *query* database.
- **Client Components** digunakan untuk antarmuka yang butuh interaksi (seperti grafik pada `AdminDashboardClient.tsx` dan Sidebar `AdminSidebar.tsx`).
- Seluruh gaya desain (styling) memakai **Tailwind CSS**, dengan beberapa komponen interaktif seperti `lucide-react` untuk ikon-ikon menu.
