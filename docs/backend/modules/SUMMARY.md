# Ringkasan Audit Backend — Konsolidasi & Rencana Perbaikan

**Tanggal:** 2026-11-18
**Cakupan:** 17 module di `apps/backend/src` (208 butir temuan: 22 High, 112 Medium, 74 Low)
**Sumber:** `docs/backend/modules/<module>.md`
**Acuan:** skill `nestjs-best-practices`

Dokumen ini **tidak mengulang** setiap temuan. Fokusnya: mengelompokkan temuan yang berakar sama, menyusun urutan perbaikan, dan menandai keputusan yang harus diambil sebelum coding.

---

## 1. Temuan yang Berulang Lintas Module (akar masalah)

| # | Akar masalah | Muncul di | Dampak |
|---|--------------|-----------|--------|
| A | **Otorisasi/scope tidak konsisten** — sebagian endpoint tidak memakai `ScopeService`, sebagian memakai `roles[0]` | `contracts` CTR-01, `criteria` CRT-03/04, `appraisals` APR-02/04, `daily-notes` DN-03, `common` CMM-01/02, `departments`/`positions`/`employees` (role literal), `dashboard` DSH-04 | Data lintas departemen dapat dibaca/diubah; user multi-role kehilangan hak |
| B | **Sesi tidak dicabut saat akun berubah** | `users` USR-02, `auth` AUTH-01 | Refresh token penyerang tetap hidup setelah reset password/nonaktif/hapus |
| C | **Soft delete punya dua sumber kebenaran + unique index tidak parsial** | `db` DB-03/06, `daily-notes` DN-01, `appraisals` APR-03 | Update catatan & re-add peserta gagal; data terhapus bisa bocor |
| D | **Secret & default config lemah** | `config` CFG-01/02/05/06/07, `auth` AUTH-03/04, `imports` IMP-05 | Pemisahan access/refresh hilang di produksi; impor bisa lumpuh |
| E | **API response/envelope tidak konsisten** | `app` APP-04, `common` CMM-03/04, `health` HLT-01 | Payload hilang (`data: null`); dua bentuk error bagi frontend |
| F | **Resource limit diperiksa terlambat / batas tak seragam** | `imports` IMP-01, `employees` EMP-08, `contracts` CTR-11 | Zip bomb / memori; upload 20 MB ditolak setelah dibaca |
| G | **Audit tidak lengkap / merusak data** | `audit` AUD-01/02/04, `daily-notes` DN-02, `appraisals` APR-10, `criteria` CRT-05, `users` USR-10 | Jejak audit tidak bisa diandalkan untuk investigasi |
| H | **Query builder/raw SQL melewati filter soft delete** | `employees` EMP-04, `users` USR-08, `daily-notes` DN-07, `criteria` CRT-09 | Entitas terhapus tetap tampil |
| I | **N+1 / query per baris di dalam transaksi** | `employees` EMP-01, `contracts` CTR-04, `appraisals` APR-01, seed `DB-02` | Transaksi panjang, lock, risiko timeout |
| J | **Duplikasi util `sanitizeCell` (4 salinan)** | `common` CMM-07, `employees` EMP-07, `contracts` CTR-08, `appraisals` APR-14 | Hardening harus diubah di 4 tempat; semua mewarisi kelemahan yang sama |
| K | **Pagination/urutan/tipe query tidak deterministik atau longgar** | `departments` DEP-05, `positions` POS-01, `appraisals` APR-08, `query.dto` (search tanpa `@MaxLength`) | Baris terlewat/berulang; input invalid → 500 |
| L | **Test gap pada alur kritikal** | `health`, `positions`, `imports`, `appraisals` (transitions/saveRatings/scheduler), `users`, `criteria`, `dashboard` | Regresi keamanan/alur tidak tertangkap |

---

## 2. Gelombang Perbaikan (disarankan)

### P0 — Keamanan & integritas data (kerjakan lebih dulu)

| Urutan | Temuan | Ringkas |
|--------|--------|---------|
| 1 | `contracts` CTR-01 | Terapkan scope departemen pada list/detail/export kontrak |
| 2 | `appraisals` APR-02 | Validasi kepemilikan `comments` + filter `appraisal_id` |
| 3 | `users` USR-01 | Cegah hapus/nonaktifkan admin terakhir |
| 4 | `users` USR-02 + `auth` AUTH-01 | Revokasi refresh token saat reset password/nonaktif/hapus; tolak refresh untuk user nonaktif/terhapus |
| 5 | `common` CMM-02 + `auth` AUTH-04 + variannya | Satu helper role/scope berbasis `includes`, bukan `roles[0]` |
| 6 | `db` DB-06 + `daily-notes` DN-01 + `appraisals` APR-03 | Partial unique index `WHERE deleted_at IS NULL` (atau upsert) |
| 7 | `db` DB-01/DB-02 | Seed produksi tidak menulis criteria ACTIVE placeholder; seed transaksional |
| 8 | `config` CFG-01/02 | Wajibkan `JWT_REFRESH_SECRET` & panjang minimum `JWT_SECRET` |
| 9 | `imports` IMP-01 | Cek baris selama iterasi + magic bytes/MIME + limit Multer sinkron |
| 10 | `audit` AUD-01/02 | Perbaiki masking `Date` dan nilai sensitif |
| 11 | `criteria` CRT-01 | Kunci `scaleMin/scaleMax` (dan `code`) pada set ACTIVE — **konfirmasi** |
| 12 | `app` APP-04 + `common` CMM-04 + `health` HLT-01 | Perbaiki envelope response agar payload tidak hilang |

### P1 — Keandalan & correct behavior

| Temuan | Ringkas |
|--------|---------|
| `appraisals` APR-01 | Transaksi per departemen / SAVEPOINT pada scheduler |
| `appraisals` APR-05/09, `daily-notes` DN-04, `criteria` CRT-02 | Hanya set ACTIVE untuk transaksi baru; validasi create draft; konfirmasi eligibility PERMANENT |
| `app` APP-02/03/06, `health` HLT-02/03/04/05 | Shutdown hooks, bootstrap error, trust proxy, 503/timeout, `@SkipThrottle` |
| `config` CFG-05/06/07, `db` DB-05/09 | Env wajib/range, pool config, resolusi folder migrasi |
| `departments` DEP-01/02, `positions` POS-02, `employees` EMP-02/03 | Aturan hapus lengkap & di dalam transaksi; validasi supervisor/siklus |
| `criteria` CRT-06, `users` USR-04/07 | Petakan `23505` ke error domain; dedupe input |
| `audit` AUD-03/04/06/07, `db` DB-07 | Partisi bulanan, index action/actor, batasi ekspor |
| `employees` EMP-01, `contracts` CTR-04 | Batch insert/update importer |
| `departments` DEP-05, `appraisals` APR-17 | `ORDER BY` deterministik |

### P2 — Kualitas, konsistensi, kebersihan

- Satukan `sanitizeCell` (hapus 3 salinan) dan perketat regex (`CMM-07`).
- Hapus kode/kolom mati: `DatabaseException`, `ValidationException`, `capitalizeString`, `DepartmentResponseDto`, `criterion.interface.ts`, `refresh_tokens.replaced_by`, file enum re-export.
- Tambah test: health, positions, imports, transitions/saveRatings/scheduler, scope users/criteria/dashboard.
- Selaraskan `QueryDto` (limit default, `@MaxLength`, `@ArrayUnique`), `implements` tipe bersama pada DTO query.
- Konsistenkan `@HttpCode(204)` untuk delete; `imports: [DbModule]` eksplisit.
- Perbaiki typo `succesfully` → `successfully`.

---

## 3. Keputusan yang Perlu Dikonfirmasi Sebelum Coding

| ID | Pertanyaan |
|----|------------|
| `config` CFG-10 | Apakah `TZ` memang harus mengatur zona waktu proses? |
| `common` CMM-01 | Matriks `PERMISSIONS` dijadikan sumber utama (`@RequirePermission`) atau dihapus? |
| `common` CMM-03 | Envelope error diseragamkan (breaking untuk frontend)? |
| `config` CFG-05 | `NODE_ENV` wajib diisi (tanpa default) atau cukup warning? |
| `db` DB-03 | Pertahankan dua kolom soft delete + CHECK, atau migrasi ke `deleted_at` saja? |
| `db` DB-01 | Seed produksi: criteria set `DRAFT`, skip, atau flag eksplisit? |
| `users` USR-05 | Username akun terhapus boleh dipakai ulang? |
| `departments` DEP-01 | Departemen dengan riwayat appraisal boleh dihapus? |
| `employees` EMP-02 | Karyawan dengan kontrak/appraisal/notes boleh dihapus? |
| `employees` EMP-06 | Format tanggal response: kunci `YYYY-MM-DD`? |
| `contracts` CTR-06 | Kontrak PERMANENT ikut filter `endDate`? |
| `daily-notes` DN-04 / `appraisals` APR-05 | Set `ARCHIVED` ditolak untuk transaksi baru? |
| `appraisals` APR-09 | Karyawan kontrak PERMANENT eligible untuk appraisal? |
| `dashboard` DSH-02/03/04 | Periode default, definisi "total karyawan", dan scope SUPERVISOR? |
| `imports` IMP-07 | Perlu mengumpulkan banyak error validasi sekaligus? |
| `criteria` CRT-01 | Perubahan `scaleMin/scaleMax` pada ACTIVE diizinkan? |

---

## 4. Saran Alur Eksekusi

1. **P0 gelombang 1** — otorisasi & sesi (CTR-01, APR-02, USR-01/02, AUTH-01, scope helper). Ini yang paling berisiko.
2. **P0 gelombang 2** — data integrity (partial unique index, seed, config secret, audit masking, response envelope).
3. **P1** — satu tiket per akar masalah (A–L), dengan test baru di tiket yang sama.
4. **P2** — cleanup, dijadwalkan bersamaan saat menyentuh file terkait.
5. Setiap tiket mengikuti alur `AGENTS.md`: test dulu (TDD) → implement → `code-review`, dan perbarui dokumen module terkait pada perubahan yang sama.
6. Setelah P0/P1 selesai, jalankan `/sync-agent-custom` bila struktur/aturan berubah dan perbarui `docs/backend/modules/README.md` (status temuan per module).

---

## 5. Catatan Metodologi

- Hanya kode di `apps/backend/src` (plus migrasi `apps/backend/drizzle` dan tipe bersama saat relevan) yang diaudit.
- Temuan bersifat rekomendasi; belum ada perubahan kode yang diterapkan.
- Butir bertanda **Perlu konfirmasi** adalah dugaan berbasis kode/test, bukan bug yang terbukti — verifikasi dengan PRD/pemilik produk.
- Duplikasi temuan antar module sengaja dipertahankan di masing-masing file agar setiap catatan module bisa dibaca mandiri; dokumen ini yang menghapus duplikasinya.
