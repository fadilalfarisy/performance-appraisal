# 01: Dokumen: PRD v0.10 dan sinkronisasi desain

**What to build:** Dokumen requirement menyatakan akses baca audit hanya untuk ADMIN dan mencantumkan cakupan aksi yang lebih luas, sehingga developer, reviewer, dan agent membaca aturan yang sama dengan yang akan diimplementasikan.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] PRD naik ke v0.10 dengan entri change log; §5.6 dan §5.8 menyatakan audit trail hanya dapat dibaca ADMIN.
- [ ] PRD §5.6 mencantumkan login, logout, login gagal, dan setiap export sebagai aksi tercakup.
- [ ] DESIGN-BACKEND memperbarui bagian audit (auth, export beserta filter, endpoint baca untuk ADMIN).
- [ ] DESIGN-FRONTEND memperbarui route, menu, dan isi layar audit: ADMIN, default 7 hari, kolom, panel expand, export.
- [ ] CONVENTIONS menyebut batas `limit` baru (default 10, maksimal 100).
- [ ] Baris "Based on: PRD vX.Y" di setiap dokumen desain sama dengan v0.10.
- [ ] Dokumentasi modul audit dan FLOW tidak lagi menyatakan bahwa tidak ada read path atau bahwa daily notes tidak diaudit.
