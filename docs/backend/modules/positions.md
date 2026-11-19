# Audit: Positions (`src/positions/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`arch-*`, `db-*`, `api-*`, `security-*`, `test-*`)
**File yang diperiksa (8):**
- `positions.module.ts`, `positions.controller.ts`, `positions.service.ts`, `positions.repository.ts`
- `dto/create-position.dto.ts`, `dto/update-position.dto.ts`, `dto/position-query.dto.ts`
- `interfaces/position.interface.ts`
- Rujukan: `packages/types/src/positions.ts`, `db/schema.ts`, `employees/employees.repository.ts`
- Catatan: **tidak ada file `*.spec.ts`** di module ini.

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 0 | — |
| Medium | 5 | POS-01 … POS-05 |
| Low | 4 | POS-06 … POS-09 |

Module master data paling kecil dan paling bersih setelah Health. Repository sudah memakai `ORDER BY name` (berbeda dari Departments), guard hapus sesuai karena hanya `employees.position_id` yang menjadi FK nyata (snapshot `appraisal_employees.position_id` sengaja tanpa FK), dan audit mengikuti pola transaksi yang sama. Temuan utama: **DTO query ada tetapi tidak dipakai**, dan **module ini tidak punya test sama sekali**.

---

## 2. Temuan & Perbaikan

### POS-01 — `findAll` tanpa pagination/search; `PositionQueryDto` tidak dipakai (Medium)

**Rule:** `api-use-dto-serialization`, `perf-optimize-database`
**Lokasi:** `positions.controller.ts:31-34`, `positions.service.ts:26-30`, `positions.repository.ts:32-40`, `dto/position-query.dto.ts`

Controller menerima tanpa `@Query`, service mengambil semua baris, dan repository mengembalikan seluruh posisi. `PositionQueryDto` (extends `QueryDto`) dideklarasikan tetapi **tidak diimpor di mana pun** — jadi `page`/`limit`/`search` yang dikirim klien diabaikan tanpa error (karena tidak ada `@Query()` yang memvalidasi).

Selain tidak konsisten dengan Departments, ini juga membuat frontend tidak punya cara mencari posisi saat jumlahnya bertambah.

**Perbaikan:** terima `@Query() query: PositionQueryDto`, tambahkan `WHERE` untuk `search` (code/name) dan `LIMIT/OFFSET` + `count`, lalu kembalikan `paginated(...)` seperti Departments. Atau, bila posisi memang selalu sedikit dan ingin daftar penuh, hapus `PositionQueryDto` dan dokumentasikan bahwa endpoint tidak berpaginasi (jangan biarkan DTO menggantung).

---

### POS-02 — Pemeriksaan relasi dilakukan di luar transaksi hapus (Medium)

**Rule:** `db-use-transactions`
**Lokasi:** `positions.service.ts:76-96`

`isLinkedToEmployees` dijalankan sebelum `dbService.transaction`, sehingga karyawan bisa dibuat/dipindahkan ke posisi tersebut di antara cek dan `softDelete`. Aturan "tidak boleh hapus jika dipakai karyawan" bisa terlanggar.

**Perbaikan:** jalankan pemeriksaan memakai `tx` yang sama di dalam transaksi (idealnya dengan `SELECT ... FOR UPDATE` pada baris posisi), lalu soft delete. Pola yang sama berlaku untuk `departments.md` DEP-02.

---

### POS-03 — Duplikasi `code` tidak ditangani sebagai error domain (Medium)

**Rule:** `error-throw-http-exceptions`
**Lokasi:** `positions.service.ts:38-56`, `db/schema.ts:130`

Tidak ada pre-check atau penanganan `23505`. Duplikat `code` muncul sebagai `409 UNIQUE_VIOLATION` dengan pesan hasil parsing detail PostgreSQL, bukan `errorCode` domain (mis. `POSITION_CODE_ALREADY_EXISTS`). Frontend yang menampilkan pesan per-kode error harus menangani bentuk generik.

**Perbaikan:** tangkap `23505` pada constraint `positions_code_key` di service dan lempar `ConflictException` dengan `errorCode` yang konsisten dengan modul lain (Users/Departments).

---

### POS-04 — Tidak ada test sama sekali (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `src/positions/` (0 file spec)

Berbeda dari Departments/Users/Auth yang punya spec, module ini tidak punya test. Alur yang perlu diuji:
- `create` → transaksi + audit `POSITION_CREATED`,
- `update` → `before`/`after` audit,
- `remove` → blokir bila ada karyawan, soft delete + audit bila tidak,
- `findOne` → 404,
- `create` saat repository mengembalikan `null`.

Test-nya murah karena service hanya bergantung pada repository + `DbService` + `AuditService` (pola mock sudah ada di `departments.service.spec.ts`).

---

### POS-05 — `remove` tetap mengaudit dan mengembalikan 204 walau baris hilang (Medium)

**Rule:** `error-handle-async-errors`
**Lokasi:** `positions.service.ts:76-96`

`softDelete` mengembalikan `PositionRow | null`, tetapi hasilnya tidak diperiksa. Dua request delete paralel menghasilkan dua entri `POSITION_DELETED`, dan request kedua tetap 204.

**Perbaikan:** bila `softDelete` mengembalikan `null`, lempar `NotFoundException` (atau lewati audit) agar jejak audit sesuai kejadian. Sama seperti `departments.md` DEP-10.

---

### POS-06 — Tidak ada filter status aktif (Low, **Perlu konfirmasi**)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `positions.repository.ts:32-40`

`findAll` mengembalikan posisi aktif **dan** nonaktif. Untuk dropdown pemilihan posisi di form karyawan, biasanya hanya posisi aktif yang relevan. Departments juga berperilaku sama, jadi ini mungkin keputusan konsisten — tetapi perlu dipastikan, karena `isActive` ada dan tidak pernah dipakai untuk memfilter.

**Perbaikan:** jika perlu, tambahkan filter `isActive` opsional di query DTO (default: semua, atau aktif saja sesuai kebutuhan UI).

---

### POS-07 — `PositionsModule` tidak mengimpor `DbModule` (Low)

**Lokasi:** `positions.module.ts:4-8`

Bekerja hanya karena `DbModule` `@Global()`. Sama seperti Health/Departments; opsional untuk keterbacaan. Pilih satu kebijakan untuk seluruh module agar konsisten.

---

### POS-08 — `level` tidak punya batas atas (Low)

**Rule:** `security-validate-all-input`
**Lokasi:** `dto/create-position.dto.ts:23-26`

`@IsInt() @Min(1)` menerima `level: 2147483647` atau angka tidak wajar lain. Level dipakai untuk logika hierarki (mis. siapa boleh menilai siapa). Tanpa batas atas, data bisa merusak aturan tersebut.

**Perbaikan:** tambahkan `@Max(...)` sesuai PRD (mis. 10), atau validasi enum/daftar level yang diizinkan.

---

### POS-09 — `code`/`name` tidak dinormalisasi (Low)

**Rule:** `security-validate-all-input`
**Lokasi:** `dto/create-position.dto.ts:10-21`

Tidak ada `@Transform(trim)`; `" CEO"` dan `"CEO"` menjadi dua posisi berbeda (code unik case-sensitive). Seperti `users.md` USR-12, putuskan kebijakan trim/case dan terapkan konsisten di semua master data.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **`ORDER BY name`** pada `findAll` — urutan stabil, berbeda dari Departments yang belum punya `ORDER BY`.
- **Guard hapus tepat sasaran**: satu-satunya FK nyata ke `positions` adalah `employees.position_id`; `appraisal_employees.position_id/name` adalah snapshot historis tanpa FK, jadi memblokir berdasarkan karyawan saja sudah benar.
- **Repository menerima `DbExecutor`** di semua operasi.
- **Audit dalam transaksi yang sama** dengan `before`/`after`.
- **DTO terikat tipe bersama** (`implements CreatePositionRequest`).
- **Soft delete konsisten** dan semua query memakai `notDeleted`.
- **`UpdatePositionDto` memakai `PartialType`** sehingga tidak ada duplikasi field.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | POS-01 | DTO query menggantung; perilaku endpoint berbeda dari module lain |
| 2 | POS-02 | Race condition pada aturan hapus |
| 3 | POS-03 | Kontrak error konsisten untuk frontend |
| 4 | POS-05 | Audit/204 palsu pada delete paralel |
| 5 | POS-04 | Tidak ada test |
| 6 | POS-06 … POS-09 | Kebijakan & kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] POS-01 Pakai `PositionQueryDto` (pagination + search) **atau** hapus DTO-nya
- [ ] POS-02 Pemeriksaan relasi di dalam transaksi
- [ ] POS-03 Tangani `23505` dengan `errorCode` domain
- [ ] POS-04 Tambah `positions.service.spec.ts`
- [ ] POS-05 Periksa hasil `softDelete` sebelum audit/204
- [ ] POS-06 Konfirmasi filter `isActive`
- [ ] POS-07 (opsional) `imports: [DbModule]`
- [ ] POS-08 `@Max` untuk `level`
- [ ] POS-09 Normalisasi `code`/`name`
