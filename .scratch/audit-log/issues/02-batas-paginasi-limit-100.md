# 02: Batas paginasi bersama: limit default 10, maksimal 100

**What to build:** Setiap endpoint daftar menerima hingga 100 baris per request dengan default tetap 10, sehingga layar audit bisa menawarkan 100 baris per halaman tanpa DTO paginasi khusus.

**Blocked by:** 1 (Dokumen: PRD v0.10 dan sinkronisasi desain)

**Status:** ready-for-agent

- [ ] Paginasi bersama: `limit` default 10, minimum 1, maksimum 100.
- [ ] Permintaan `limit` di atas 100 ditolak sebagai kesalahan validasi (400), bukan dipotong diam-diam.
- [ ] Endpoint daftar lain tetap berperilaku sama untuk nilai 1–50.
- [ ] Swagger menampilkan batas baru.
- [ ] Pilihan ukuran halaman di layar daftar menyertakan 100, minimal di layar audit.
