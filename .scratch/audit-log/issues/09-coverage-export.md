# 09: Coverage export yang sudah ada

**What to build:** Keempat export yang sudah ada — employees, contracts, appraisal result, dan template — meninggalkan jejak di activity feed beserta filter yang dipakai, sesuai aturan "setiap export diaudit".

**Blocked by:** 3 (Prefactor: satu helper actor bersama), 4 (Audit trail end-to-end: daftar dan halaman)

**Status:** ready-for-agent

- [ ] Export employees menulis satu audit entry berisi filter dan jumlah baris.
- [ ] Export contracts menulis satu audit entry berisi filter dan jumlah baris.
- [ ] Export appraisal result menulis satu audit entry berisi appraisal/period yang diekspor.
- [ ] Setiap pembuatan template menulis satu audit entry, tanpa menyimpan isi file.
- [ ] Entri export terlihat di activity feed dan dapat difilter berdasarkan action.
- [ ] Perilaku export dan file yang dihasilkan tidak berubah bagi pengguna.
- [ ] Export yang gagal karena otorisasi atau validasi tidak menulis entri sukses.
