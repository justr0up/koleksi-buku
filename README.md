# Koleksi Buku — Situs Statis (Baca Saja)

Situs koleksi buku pribadi, versi **baca saja** untuk di-deploy sebagai website publik
(mis. Vercel) supaya bisa dibuka dari iPad. Tidak ada tambah/edit/hapus buku —
itu tetap lewat web Muse "Koleksi Buku".

## Isi

- `index.html` — halaman utama (rak kipas 3D + grid + reader)
- `style.css`, `app.js`, `books.json` — tampilan, logika, dan data 11 buku
- `assets/covers/` — cover asli tiap buku (11 file)
- `assets/pdfs/` — PDF ringkasan asli tiap buku (11 file)
- `assets/mindmaps/` — mind map tiap buku (11 file PNG 2160x4800)
- `assets/pages/<slug>/page-XX.jpg` — tiap PDF di-render jadi gambar per halaman
  (140 halaman total, 140 dpi, JPEG q78 — cukup tajam buat dibaca di iPad)

## Cara deploy ke Vercel

1. Push folder ini ke repo GitHub (atau drag folder ke dashboard Vercel → Add New → Project → import).
2. Framework preset: **Other** (situs statis murni, tanpa build step).
3. Root directory: folder ini. Tidak ada perintah build, tidak ada environment variable.
4. Deploy — situs langsung tayang.

## Cara jalankan lokal

```bash
cd book-collection-site
python3 -m http.server 8000
# buka http://localhost:8000
```

## Catatan

- Semua cover adalah cover asli buku (dari Open Library / penerbit), bukan hasil generate.
- Kalau ada buku baru, tambahkan lewat web Muse, lalu ulangi proses salin + render
  ke folder ini dan deploy ulang.
