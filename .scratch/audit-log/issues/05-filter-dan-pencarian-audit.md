# 05: Filter dan pencarian audit

**What to build:** ADMIN mempersempit feed berdasarkan rentang tanggal, user, entity, action, dan actor type, serta mencari bebas berdasarkan username, employee number, atau entity id.

**Blocked by:** 4 (Audit trail end-to-end: daftar dan halaman)

**Status:** ready-for-agent

- [ ] Setiap filter bekerja sendiri dan saat digabung: rentang tanggal, user, entity, entity id, action, actor type.
- [ ] Rentang tanggal inklusif pada kedua batas dan memakai format tanggal yang sama dengan filter lain.
- [ ] Pencarian bebas mencocokkan username, employee number, dan entity id; tidak memindai isi before/after.
- [ ] Nilai filter tidak valid (user id bukan UUID, actor type di luar USER/SYSTEM) ditolak 400.
- [ ] Mengubah filter mengembalikan halaman ke 1; filter kosong berarti tanpa batasan tambahan.
- [ ] Filter bar di halaman audit menampilkan pilihan yang sama dan mempertahankan nilai saat halaman berpindah.
- [ ] Total di meta mengikuti filter, bukan total seluruh trail.
