# Dokumentasi Module Backend — Daftar & Urutan Membaca

**Dibuat:** 2026-10-11
**Cakupan:** seluruh module NestJS di `apps/backend/src` (module akar, infrastruktur/shared, dan semua module fitur).

Dokumentasi ini menjelaskan kode proyek **per module**, ditulis untuk pembaca pemula yang belum familiar dengan konsep NestJS (dependency injection, decorator, DTO, guard, dan sejenisnya). Setiap file module mengikuti struktur seragam: ringkasan + analogi, peta file & diagram alur, penjelasan kode per file (dengan "kenapa", "dampak", analogi, dan istilah baru), alur kerja nyata, hubungan antar-module, kesalahan umum, catatan kualitas kode, serta rangkuman & latihan.

---

## Daftar Semua Module

| # | Module | Ringkasan satu kalimat | File dokumentasi |
|---|--------|------------------------|------------------|
| 1 | **AppModule** | Module akar yang merakit seluruh aplikasi dan memasang guard/interceptor/filter global. | [`app.md`](./app.md) |
| 2 | **Config** | Memuat `.env` dan memvalidasinya agar aplikasi gagal cepat bila konfigurasi salah. | [`config.md`](./config.md) |
| 3 | **Common (Shared)** | Kumpulan perlengkapan bersama: guard, interceptor, filter, decorator, matriks izin, DTO umum, dan utilitas. | [`common.md`](./common.md) |
| 4 | **DbModule** | Satu-satunya pintu ke database (Pool PostgreSQL + Drizzle) beserta skema & migrasi. | [`db.md`](./db.md) |
| 5 | **HealthModule** | Endpoint `GET /api/health` untuk memeriksa aplikasi & koneksi database. | [`health.md`](./health.md) |
| 6 | **UsersModule** | Mengelola akun pengguna (buat, ubah, aktif/nonaktif, reset password) khusus ADMIN. | [`users.md`](./users.md) |
| 7 | **AuthModule** | Login, refresh token (rotasi & deteksi penyalahgunaan), dan logout dengan access/refresh token terpisah. | [`auth.md`](./auth.md) |
| 8 | **DepartmentsModule** | Master data departemen (daftar, detail, CRUD) dengan aturan tidak bisa dihapus bila masih berisi karyawan. | [`departments.md`](./departments.md) |
| 9 | **PositionsModule** | Master data jabatan dengan level, dan aturan serupa soal penghapusan. | [`positions.md`](./positions.md) |
| 10 | **EmployeesModule** | Data karyawan lengkap (daftar/filter/scope, CRUD, impor & ekspor Excel). | [`employees.md`](./employees.md) |
| 11 | **ContractsModule** | Kontrak kerja dengan aturan anti-tumpang-tindih dan impor/ekspor Excel. | [`contracts.md`](./contracts.md) |
| 12 | **DailyNotesModule** | Catatan harian karyawan oleh supervisor (dengan pemeriksaan kepemilikan). | [`daily-notes.md`](./daily-notes.md) |
| 13 | **CriteriaModule** | Versi set kriteria penilaian per department (DRAFT/ACTIVE/ARCHIVED) dengan validasi bobot total 100. | [`criteria.md`](./criteria.md) |
| 14 | **AppraisalsModule** | Inti workflow penilaian: peserta, rating, perhitungan skor, transisi status, dan scheduler bulanan. | [`appraisals.md`](./appraisals.md) |
| 15 | **AuditModule** | Jejak audit append-only untuk semua perubahan, dengan penyamaran nilai sensitif. | [`audit.md`](./audit.md) |
| 16 | **ImportsModule** | Pipeline impor Excel generik: validasi seluruh file dulu, commit dalam satu transaksi. | [`imports.md`](./imports.md) |
| 17 | **DashboardModule** | Ringkasan statistik (read-only) sesuai scope departemen pengguna. | [`dashboard.md`](./dashboard.md) |

---

## Urutan Membaca yang Disarankan (untuk Pemula)

Urutan ini disusun dari fondasi → sederhana → master data → transaksional → kompleks, supaya setiap modul sudah punya "prasyarat" yang dijelaskan lebih dulu.

**Tahap 1 — Fondasi (wajib dulu)**
1. **AppModule** — memahami bagaimana aplikasi dirakit, serta urutan guard/interceptor/filter.
2. **Config** — memahami environment variable & validasinya.
3. **Common** — memahami guard (otorisasi), interceptor/filter (bentuk response/error), DTO umum, dan matriks izin.
4. **DbModule** — memahami akses database, skema, soft delete, dan migrasi.

**Tahap 2 — Pemanasan**
5. **HealthModule** — module paling sederhana, bagus untuk membiasakan diri dengan struktur NestJS.

**Tahap 3 — Entitas dasar & autentikasi**
6. **UsersModule** — pola service/repository/audit yang berulang di banyak module.
7. **AuthModule** — login/JWT; bergantung pada Users.

**Tahap 4 — Master data**
8. **DepartmentsModule** — pola master data + aturan integritas.
9. **PositionsModule** — variasi pola master data yang sama.

**Tahap 5 — Data transaksional**
10. **EmployeesModule** — menggabungkan master data, scope, dan impor/ekspor.
11. **ContractsModule** — aturan interval/tumpang-tindih & impor.
12. **DailyNotesModule** — catatan harian; perhatikan perbedaannya (hard delete, tanpa audit).

**Tahap 6 — Inti penilaian**
13. **CriteriaModule** — versi kriteria; prasyarat bagi appraisals.
14. **AppraisalsModule** — workflow inti, paling kompleks (transitions, score, scheduler, locking).

**Tahap 7 — Lintas-cutting & pelaporan**
15. **AuditModule** — jejak semua perubahan (lebih mudah dipahami setelah tahu module lain).
16. **ImportsModule** — pipeline impor bersama yang dipakai employees & contracts.
17. **DashboardModule** — agregasi read-only sesuai scope.

> Catatan: **AppraisalsModule** adalah module terbesar dan paling penting untuk dipahami. Bacalah setelah Anda nyaman dengan pola Common, DbModule, Criteria, dan Scope.

---

## Istilah Kunci (Glosarium Singkat)

- **Module, Controller, Provider/Service, `@Injectable()`** — unit, pengatur route, dan penyedia logika; `@Injectable()` menandakan provider yang bisa disuntik.
- **Dependency Injection (DI)** — framework menyediakan dependensi, bukan `new` manual.
- **Decorator** — anotasi `@...` yang menempelkan metadata/perilaku.
- **DTO & `ValidationPipe`** — bentuk data yang divalidasi sebelum masuk handler.
- **Guard / Interceptor / Pipe / Filter** — penjaga akses / pengubah alur (response) / pemproses data / penangkap error.
- **Soft delete** — menandai data terhapus (bukan menghapus permanen).
- **Scope** — batas data per departemen sesuai peran pengguna.
- **Audit log** — catatan perubahan yang append-only.
- **Advisory lock** — kunci database agar job terjadwal tidak berjalan ganda.

---

## Cara Menjaga Dokumentasi Ini Tetap Akurat

- Jika perilaku kode berubah, perbarui file module terkait **di perubahan yang sama**.
- Untuk perubahan pada role/izin/status/transisi, perbarui semua salinan: PRD, tabel izin backend & frontend, tabel transisi, dan test — sesuai `AGENTS.md`.
- Bagian **"Catatan Kualitas Kode"** memuat butir berlabel **"Perlu konfirmasi"**; itu adalah dugaan yang belum dipastikan. Verifikasi dengan pemilik produk sebelum menganggapnya bug.
