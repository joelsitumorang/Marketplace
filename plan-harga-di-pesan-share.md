# Plan: Tambahkan Harga ke Pesan Share Produk (WhatsApp)

## Kondisi sekarang

Tombol share di halaman customer `/lelang/katalog/[id]` menghasilkan pesan WhatsApp seperti ini:

```
Cek barang ini di MBG: IPHONE 13 128 INTER
https://www.mbgpasuruan.co.id/lelang/katalog/1359
```

WhatsApp lalu menampilkan kartu preview (foto, judul `IPHONE 13 128 INTER | MBG Lelang`, deskripsi, domain). Harga **tidak ada** di pesan maupun di kartu preview.

## Target

Pesan share memuat harga katalog:

```
Cek barang ini di MBG: IPHONE 13 128 INTER
Harga: *Rp 7.500.000*
https://www.mbgpasuruan.co.id/lelang/katalog/1359
```

(`Rp 7.500.000` hanya contoh. Nilai asli diambil dari harga barang di katalog.) Tanda `*...*` membuat harga tercetak tebal di WhatsApp.

## Langkah

### 1. Temukan semua tempat pembuat teks share
Cari di kode string `Cek barang ini di MBG` (grep seluruh `src/`). Kemungkinan ada lebih dari satu tempat: tombol share di halaman detail produk, dan panel share di halaman admin kalau sudah dibuat. Semua tempat harus memakai satu fungsi yang sama.

### 2. Buat satu helper terpusat

Contoh `src/lib/share.ts`:

```ts
const rupiah = (n: number) =>
  "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
// 7500000 -> "Rp 7.500.000"

export function buildShareText(
  item: { name: string; price?: number | null },
  url: string
) {
  // tanda * di nama akan merusak format tebal WhatsApp
  const nama = item.name.replace(/\*/g, "");
  const baris = [`Cek barang ini di MBG: ${nama}`];
  if (item.price && item.price > 0) {
    baris.push(`Harga: *${rupiah(item.price)}*`);
  }
  baris.push(url); // link selalu baris terakhir
  return baris.join("\n");
}
```

Kalau sudah ada fungsi format rupiah yang dipakai di kartu katalog, **pakai itu** supaya angka di pesan sama persis dengan yang tampil di halaman. Jangan membuat format kedua.

### 3. Ganti semua pembuat teks lama dengan helper
- Teruskan `price` dari data barang yang sama dengan yang dirender halaman. Jangan menghitung ulang di sisi klien dari state lama.
- Pastikan `price` ikut di-select dan sampai ke komponen tombol share. Kalau komponen share cuma menerima `name` dan `id`, tambahkan `price` ke props.
- Untuk `wa.me` link, encode seluruh teks dengan `encodeURIComponent` (baris baru jadi `%0A`).
- Untuk `navigator.share`, tetap pakai cara yang sekarang berjalan (link ada di dalam `text`, hanya satu kali). Jangan menambah parameter `url` terpisah, karena di beberapa aplikasi link bisa muncul dobel.

### 4. Kasus pinggir
- Harga kosong, `null`, atau 0: baris harga dilewati, pesan kembali seperti format lama.
- Nama sangat panjang atau berisi karakter khusus (`&`, `|`, tanda kutip): pastikan pesan tetap utuh setelah di-encode.
- Link harus tetap di baris terakhir dan terpisah, supaya WhatsApp tetap membuat kartu preview.

### 5. Opsional (fase 2): harga di kartu preview
Judul preview sekarang `{nama} | MBG Lelang`. Kalau mau harga juga muncul di kartu, tambahkan ke `og:description` lewat `generateMetadata` (misalnya `Rp 7.500.000 · 128 GB KABEL INTER`). Catatan: WhatsApp menyimpan cache preview, jadi link yang sudah pernah dibagikan bisa tetap menampilkan preview lama beberapa waktu. Karena itu harga di **isi pesan** (langkah 1-4) yang diandalkan, bukan di preview.

## Pengecekan terpisah (bukan bagian perubahan ini)

Di screenshot, pesan pertama (`/lelang/katalog/1360`, IPHONE 12 128 IBOX) tampil **tanpa kartu preview**, sedangkan `/1359` punya. Itu mirip dengan bug preview yang pernah dilaporkan. Cek `og:image` untuk barang 1360: apakah kosong, URL-nya tidak publik, atau ukuran gambarnya terlalu besar. Bisa juga cuma karena WhatsApp belum selesai mengambil preview saat pesan terkirim.

## Kriteria selesai
- [ ] Share dari halaman detail ke WhatsApp (HP dan WhatsApp Web) memuat baris `Harga: ...`
- [ ] Angka di pesan sama persis dengan harga yang tampil di halaman produk
- [ ] Kartu preview WhatsApp tetap muncul untuk link yang baru dibagikan
- [ ] Barang tanpa harga valid tidak menampilkan baris harga
- [ ] Hanya ada satu fungsi pembuat teks share di seluruh kode (tidak ada duplikat)
- [ ] Tidak ada dependency baru dan tidak ada panggilan API tambahan
