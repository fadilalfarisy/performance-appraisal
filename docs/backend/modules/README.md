# Audit Backend per Module — Indeks & Progres

**Mulai:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (Architecture, DI, Error Handling, Security, Performance, Testing, Database, API Design, Microservices, DevOps)
**Cakupan:** setiap folder module di `apps/backend/src`
**Metode:** satu module per pass — scan → tulis `docs/backend/modules/<module>.md` → update tabel ini → konfirmasi sebelum lanjut.

Kode yang sudah ada tetap menjadi sumber kebenaran; catatan di sini adalah rekomendasi perbaikan, bukan perubahan yang sudah diterapkan.

---

## Status Scan

| # | Module | Folder / file sumber | Status | File catatan |
|---|--------|----------------------|--------|--------------|
| 1 | AppModule | `src/app.module.ts`, `app.controller.ts`, `app.service.ts`, `main.ts` | ✅ Selesai — 12 temuan | [`app.md`](./app.md) |
| 2 | Config | `src/config/` | ✅ Selesai — 11 temuan | [`config.md`](./config.md) |
| 3 | Common | `src/common/` | ✅ Selesai — 14 temuan | [`common.md`](./common.md) |
| 4 | Db | `src/db/` | ✅ Selesai — 16 temuan | [`db.md`](./db.md) |
| 5 | Health | `src/health/` | ✅ Selesai — 7 temuan | [`health.md`](./health.md) |
| 6 | Users | `src/users/` | ✅ Selesai — 12 temuan | [`users.md`](./users.md) |
| 7 | Auth | `src/auth/` | ✅ Selesai — 13 temuan | [`auth.md`](./auth.md) |
| 8 | Departments | `src/departments/` | ✅ Selesai — 13 temuan | [`departments.md`](./departments.md) |
| 9 | Positions | `src/positions/` | ✅ Selesai — 9 temuan | [`positions.md`](./positions.md) |
| 10 | Employees | `src/employees/` | ✅ Selesai — 17 temuan | [`employees.md`](./employees.md) |
| 11 | Contracts | `src/contracts/` | ✅ Selesai — 14 temuan | [`contracts.md`](./contracts.md) |
| 12 | Daily Notes | `src/daily-notes/` | ✅ Selesai — 12 temuan | [`daily-notes.md`](./daily-notes.md) |
| 13 | Criteria | `src/criteria/` | ✅ Selesai — 12 temuan | [`criteria.md`](./criteria.md) |
| 14 | Appraisals | `src/appraisals/` | ✅ Selesai — 17 temuan | [`appraisals.md`](./appraisals.md) |
| 15 | Audit | `src/audit/` | ✅ Selesai — 10 temuan | [`audit.md`](./audit.md) |
| 16 | Imports | `src/imports/` | ✅ Selesai — 11 temuan | [`imports.md`](./imports.md) |
| 17 | Dashboard | `src/dashboard/` | ✅ Selesai — 8 temuan | [`dashboard.md`](./dashboard.md) |

**Progres:** 17 dari 17 module (100%). Semua folder `apps/backend/src` sudah di-scan.

---

## Rekap Temuan

| Module | High | Medium | Low | Total |
|--------|------|--------|-----|-------|
| AppModule | 3 | 4 | 5 | 12 |
| Config | 2 | 5 | 4 | 11 |
| Common | 2 | 6 | 6 | 14 |
| Db | 2 | 7 | 7 | 16 |
| Health | 0 | 5 | 2 | 7 |
| Users | 2 | 7 | 3 | 12 |
| Auth | 1 | 9 | 3 | 13 |
| Departments | 1 | 7 | 5 | 13 |
| Positions | 0 | 5 | 4 | 9 |
| Employees | 1 | 10 | 6 | 17 |
| Contracts | 1 | 7 | 6 | 14 |
| Daily Notes | 1 | 7 | 4 | 12 |
| Criteria | 1 | 7 | 4 | 12 |
| Appraisals | 3 | 10 | 4 | 17 |
| Audit | 1 | 6 | 3 | 10 |
| Imports | 1 | 5 | 5 | 11 |
| Dashboard | 0 | 5 | 3 | 8 |
| **Total** | **22** | **112** | **74** | **208** |

> Catatan: angka di atas adalah jumlah butir temuan per module; beberapa temuan saling terkait (mis. `JWT_REFRESH_SECRET` muncul di Config/Auth, soft delete muncul di Db/Users/Daily Notes/Appraisals). Konsolidasi per akar masalah dan urutan perbaikan ada di [`SUMMARY.md`](./SUMMARY.md).

Catatan: `src/test/` hanya berisi `.gitkeep` (bukan module) — tidak masuk daftar. File `app.*` di root dihitung sebagai module #1.

---

## Konvensi Catatan

Setiap file `<module>.md` memakai struktur yang sama:

1. **Ringkasan** — tabel jumlah temuan per severity (High / Medium / Low).
2. **Temuan & Perbaikan** — ID `APP-01`, `AUTH-01`, dst.; setiap temuan memuat rule acuan, lokasi file/baris, penjelasan masalah, dan saran perbaikan (dengan snippet bila perlu).
3. **Yang sudah baik** — hal yang jangan diubah tanpa alasan.
4. **Prioritas perbaikan** — urutan pengerjaan.
5. **Checklist tindak lanjut** — checkbox per temuan.

Aturan penting:
- Temuan harus disertai bukti dari kode, bukan dugaan. Bila butuh keputusan produk, tandai **"Perlu konfirmasi"**.
- Perbaikan yang menambah dependency baru atau menyentuh `.env` tetap menunggu persetujuan (AGENTS.md).
- Jangan menandai module selesai sebelum semua file di foldernya dibaca.

---

## Glosarium: Awalan ID Temuan

Setiap temuan memakai format `<AWALAN>-<nomor>` (contoh `CTR-01`, `DN-03`). Awalan menunjukkan **module tempat temuan berada**, bukan jenis masalahnya.

| Awalan | Module | Folder / file sumber | Contoh |
|--------|--------|----------------------|--------|
| `APP` | AppModule | `src/app.module.ts`, `app.controller.ts`, `app.service.ts`, `main.ts` | `APP-04` |
| `CFG` | Config | `src/config/` | `CFG-01` |
| `CMM` | Common | `src/common/` | `CMM-04` |
| `DB` | Db | `src/db/` + `drizzle/` | `DB-01` |
| `HLT` | Health | `src/health/` | `HLT-05` |
| `USR` | Users | `src/users/` | `USR-01` |
| `AUTH` | Auth | `src/auth/` | `AUTH-01` |
| `DEP` | Departments | `src/departments/` | `DEP-01` |
| `POS` | Positions | `src/positions/` | `POS-01` |
| `EMP` | Employees | `src/employees/` | `EMP-01` |
| `CTR` | Contracts | `src/contracts/` | `CTR-01` |
| `DN` | Daily Notes | `src/daily-notes/` | `DN-01` |
| `CRT` | Criteria | `src/criteria/` | `CRT-01` |
| `APR` | Appraisals | `src/appraisals/` | `APR-01` |
| `AUD` | Audit | `src/audit/` | `AUD-01` |
| `IMP` | Imports | `src/imports/` | `IMP-01` |
| `DSH` | Dashboard | `src/dashboard/` | `DSH-01` |

Catatan: `APP` (AppModule) dan `APR` (Appraisals) sengaja dibedakan agar tidak tertukar.

### Severity

| Istilah | Arti dalam audit ini |
|---------|----------------------|
| **High** | Berpotensi menyebabkan kebocoran data, kehilangan/kerusakan data, atau fitur inti gagal berfungsi. Perbaiki lebih dulu. |
| **Medium** | Perilaku salah pada kondisi tertentu, risiko keamanan terbatas, atau masalah performa/keandalan yang nyata. |
| **Low** | Konsistensi, kebersihan kode, dokumentasi, atau penyempurnaan yang tidak mendesak. |

### Gelombang Prioritas (`SUMMARY.md`)

| Istilah | Arti |
|---------|------|
| **P0** | Keamanan & integritas data — dikerjakan lebih dulu. |
| **P1** | Keandalan & perilaku yang benar (bug, config, performa). |
| **P2** | Kualitas, konsistensi, test, dan penghapusan kode mati. |

---

## Glosarium: Istilah Teknis yang Dipakai

| Istilah / singkatan | Arti |
|---------------------|------|
| **DTO** | *Data Transfer Object* — kelas yang mendefinisikan bentuk dan validasi data masuk/keluar. |
| **DI** | *Dependency Injection* — framework menyediakan dependensi lewat constructor, bukan `new` manual. |
| **ORM** | *Object-Relational Mapping* — pemetaan tabel database ke objek kode (di sini Drizzle). |
| **DDL** | *Data Definition Language* — perintah SQL yang mengubah struktur (CREATE/ALTER/DROP), dipakai di migrasi. |
| **SQL** | *Structured Query Language* — bahasa query database. |
| **UUID** | *Universally Unique Identifier* — ID 128-bit, dipakai sebagai primary key. |
| **JWT** | *JSON Web Token* — token bertanda tangan berisi klaim (`sub`, `typ`, `exp`). |
| **HS256** | Algoritma tanda tangan JWT simetris (satu secret untuk sign & verify). |
| **jti** | *JWT ID* — klaim ID unik token; di sini menjadi primary key `refresh_tokens`. |
| **bcrypt** | Algoritma hashing password (lambat, memakai salt). |
| **CORS** | *Cross-Origin Resource Sharing* — kebijakan browser untuk request lintas domain. |
| **CSRF** | *Cross-Site Request Forgery* — serangan yang memakai cookie korban untuk request lintas situs. |
| **XSS** | *Cross-Site Scripting* — injeksi skrip ke halaman. |
| **CSP** | *Content Security Policy* — header yang membatasi sumber skrip/aset. |
| **IDOR** | *Insecure Direct Object Reference* — mengakses/mengubah objek milik pihak lain hanya dengan menebak ID. |
| **TOCTOU** | *Time-of-Check to Time-of-Use* — kondisi berubah antara pengecekan dan pemakaian (race). |
| **N+1** | Pola query: satu query utama lalu satu query tambahan per baris. |
| **ReDoS** | *Regular Expression Denial of Service* — regex yang lambat dipaksa backtracking ekstrem. |
| **DoS / OOM** | *Denial of Service* / *Out of Memory* — layanan lumpuh karena resource habis. |
| **Zip bomb** | File terkompresi kecil yang membengkak sangat besar saat diekstrak. |
| **Envelope (response)** | Bungkus response seragam (`status`, `message`, `data`, `meta`). |
| **Snapshot / denormalisasi** | Menyalin nilai master data ke tabel transaksi agar histori tidak berubah. |
| **Fail-open / fail-closed** | Gagal ke kondisi "boleh" (berbahaya) vs gagal ke kondisi "tolak" (aman). |
| **Idempotent** | Dijalankan berulang dengan hasil akhir yang sama. |
| **Advisory lock** | Kunci PostgreSQL lintas sesi untuk mencegah job berjalan ganda. |
| **`FOR UPDATE`** | Row lock — baris dikunci sampai transaksi selesai. |
| **SAVEPOINT** | Titik dalam transaksi yang bisa di-rollback sebagian tanpa membatalkan seluruh transaksi. |
| **`timestamptz`** | `timestamp with time zone` — waktu disimpan dengan offset/zona. Sebaliknya `timestamp` tanpa zona. |
| **`jsonb`** | Tipe JSON biner PostgreSQL (bisa di-index dan di-query). |
| **Trigram / GIN** | Index untuk pencarian `ILIKE '%...%'` (ekstensi `pg_trgm`). |
| **Partition pruning** | Optimizer hanya membaca partisi yang relevan. |
| **Reverse proxy / `trust proxy`** | Proxy di depan aplikasi; tanpa pengaturan ini `req.ip` berisi IP proxy. |
| **Liveness / readiness probe** | Pemeriksaan "proses hidup" vs "siap menerima trafik" oleh orchestrator (K8s). |
| **TDD** | *Test-Driven Development* — tulis test dulu, lalu implementasi. |
| **PRD** | *Product Requirements Document* — sumber kebenaran kebutuhan produk di repo ini. |
| **CI/CD** | *Continuous Integration / Continuous Delivery*. |
| **`DbExecutor`** | Tipe lokal (`Database | Transaction`) agar repository bisa menerima transaksi. |
| **`APP_GUARD` / `APP_INTERCEPTOR` / `APP_FILTER`** | Token NestJS untuk mendaftarkan guard/interceptor/filter secara global. |
