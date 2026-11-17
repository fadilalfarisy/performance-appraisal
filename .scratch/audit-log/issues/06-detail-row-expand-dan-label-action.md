# 06: Detail row: panel expand dan label action

**What to build:** ADMIN membuka satu baris audit dan melihat nilai sebelum, sesudah, metadata, IP, dan request id tanpa meninggalkan halaman; action tampil sebagai label yang mudah dibaca, dengan fallback ke kode mentah.

**Blocked by:** 4 (Audit trail end-to-end: daftar dan halaman)

**Status:** ready-for-agent

- [ ] Setiap baris dapat di-expand dan menampilkan before, after, metadata, IP, serta request id secara read-only.
- [ ] Nilai yang dimasking backend tampil apa adanya (mis. `***`), bukan nilai asli.
- [ ] Field yang tidak ada menampilkan keadaan kosong, bukan teks "null" atau objek kosong yang membingungkan.
- [ ] Action yang dikenal tampil dengan label ramah; action yang belum dikenal tampil sebagai kode mentah tanpa error.
- [ ] Label tidak mengubah nilai yang dikirim ke backend dan tidak menambah dependency baru.
