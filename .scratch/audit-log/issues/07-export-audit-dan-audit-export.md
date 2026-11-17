# 07: Export audit dan audit atas export

**What to build:** ADMIN mengunduh hasil audit sesuai filter yang sedang aktif sebagai file Excel, dan pengunduhan itu sendiri tercatat di audit trail — sementara sekadar membuka halaman tidak menambah baris apa pun.

**Blocked by:** 5 (Filter dan pencarian audit)

**Status:** ready-for-agent

- [ ] Endpoint export hanya untuk ADMIN dan memakai filter yang sama dengan daftar, tanpa paginasi.
- [ ] File yang dihasilkan berisi kolom yang sama dengan tabel plus detail yang dibutuhkan, dan sel yang dimulai `=`, `+`, `-`, `@` disanitasi.
- [ ] Tombol unduh di halaman mengirim filter aktif dan menyimpan file dengan nama yang jelas.
- [ ] Setiap export menulis tepat satu audit entry berisi filter yang dipakai dan jumlah baris.
- [ ] Membaca daftar audit tidak menulis audit entry apa pun.
- [ ] Export dengan hasil kosong tetap menghasilkan file yang valid dan tetap tercatat.
- [ ] Role selain ADMIN menerima 403 pada endpoint export.
