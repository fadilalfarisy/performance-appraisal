# 03: Prefactor: satu helper actor bersama

**What to build:** Identitas pelaku audit (user, role, employee number, IP, request id) diambil dari request context di satu tempat, sehingga penambahan cakupan audit berikutnya tidak menyalin helper yang sama untuk kesembilan kalinya. Tidak ada perubahan perilaku.

**Blocked by:** 1 (Dokumen: PRD v0.10 dan sinkronisasi desain)

**Status:** ready-for-agent

- [ ] Semua modul yang menulis audit memakai satu helper bersama; tidak ada salinan helper pelaku yang tersisa.
- [ ] Aksi terjadwal tetap menghasilkan `actorType` SYSTEM tanpa error ketika tidak ada user di context.
- [ ] Spec yang ada tetap hijau tanpa perubahan assertion, membuktikan payload audit tidak berubah.
- [ ] Tidak ada perubahan pada bentuk baris audit yang tersimpan.
