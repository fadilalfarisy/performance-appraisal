# 10: Coverage criteria archive dan normalisasi before/after

**What to build:** Mengaktifkan criteria set baru meninggalkan dua jejak yang benar — set lama tercatat sebagai diarsipkan, dan perubahan user terbaca sebagai perubahan nilai, bukan sekadar "ada yang diubah".

**Blocked by:** 3 (Prefactor: satu helper actor bersama), 4 (Audit trail end-to-end: daftar dan halaman)

**Status:** ready-for-agent

- [ ] Aktivasi criteria set baru menulis audit entry untuk set yang diarsipkan, bukan hanya untuk set yang diaktifkan.
- [ ] Entri arsip menyertakan identitas set lama dan alasan bahwa aktivasi baru menggantikannya.
- [ ] Update user menyimpan before dan after untuk field yang berubah.
- [ ] Hapus user menyimpan kondisi before.
- [ ] Tidak ada nilai sensitif yang lolos ke before/after.
- [ ] Semua entri baru terlihat di activity feed dan dapat difilter berdasarkan action.
- [ ] Spec yang menyentuh alur criteria dan user diperbarui dan tetap hijau.
