# 08: Coverage auth: login, logout, login gagal

**What to build:** Percobaan masuk yang berhasil, keluar, dan percobaan masuk yang gagal muncul di activity feed sebagai aktivitas tersendiri, tanpa pernah menyimpan password atau token.

**Blocked by:** 3 (Prefactor: satu helper actor bersama), 4 (Audit trail end-to-end: daftar dan halaman)

**Status:** ready-for-agent

- [ ] Login berhasil menulis satu audit entry berisi aktor dan origin request.
- [ ] Logout menulis satu audit entry.
- [ ] Login gagal menulis satu audit entry berisi username yang dicoba, tanpa user id palsu bila user tidak ada.
- [ ] Tidak ada password, hash, atau token yang tersimpan di nilai audit mana pun.
- [ ] Baris audit ditulis dalam transaksi yang sama dengan perubahan auth, sehingga sukses dan gagal konsisten.
- [ ] Ketiga jenis entri terlihat di activity feed dan dapat difilter berdasarkan action.
- [ ] Failure path auth tetap mengembalikan respons yang sama seperti sebelumnya.
