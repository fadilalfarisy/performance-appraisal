# 04: Audit trail end-to-end: daftar dan halaman

**What to build:** ADMIN membuka halaman "Audit Trail" dan melihat aktivitas sistem 7 hari terakhir, terbaru lebih dulu, dengan navigasi halaman. Role lain tidak melihat menu dan tidak dapat memanggil endpoint-nya.

**Blocked by:** 1 (Dokumen: PRD v0.10 dan sinkronisasi desain), 2 (Batas paginasi bersama: limit default 10, maksimal 100)

**Status:** ready-for-agent

- [ ] Endpoint daftar audit hanya dapat dipanggil ADMIN; role lain menerima 403.
- [ ] UI membuka dengan jendela 7 hari terakhir (API tanpa filter mengembalikan semua, sesuai DESIGN-BACKEND 12.3) dan mengurutkan waktu terbaru lalu id terbaru.
- [ ] Respons memakai envelope paginasi yang sama dengan endpoint daftar lain (data + meta total/page/limit/totalPages).
- [ ] Route dan menu "Audit Trail" hanya muncul untuk ADMIN; mengunjungi route tanpa hak mendapat halaman 403.
- [ ] Kolom tabel: waktu (format tanggal-waktu rumah), aktor (username, atau SYSTEM bila tidak ada user), role, action, entity, entity id.
- [ ] Kondisi kosong menampilkan tabel kosong, bukan error.
- [ ] Tag cache audit tersedia sehingga daftar dapat diinvalidasi tanpa refresh penuh.
- [ ] Spec backend untuk pemetaan response dan spec frontend untuk menu per role diperbarui.
