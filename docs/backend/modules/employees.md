# Audit: Employees (`src/employees/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`arch-*`, `db-*`, `perf-*`, `security-*`, `api-*`, `test-*`)
**File yang diperiksa (13):**
- `employees.module.ts`, `employees.controller.ts`, `employees.service.ts`, `employees.repository.ts`
- `employees.excel.ts`, `employees.importer.ts`
- `dto/create-employee.dto.ts`, `dto/update-employee.dto.ts`, `dto/query-employee.dto.ts`
- `enums/column-employee.enum.ts`, `enums/gender.enum.ts`, `interfaces/employee.interface.ts`
- `employees.service.spec.ts` (216 baris)
- Rujukan: `packages/types/src/employees.ts`, `packages/types/src/enums.ts`, `contracts/contracts.module.ts`, `imports/import.service.ts`, `db/schema.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | EMP-01 |
| Medium | 10 | EMP-02 … EMP-11 |
| Low | 6 | EMP-12 … EMP-17 |

Module paling kaya fitur sejauh ini (list/filter/scope, CRUD + nested contracts, impor & ekspor Excel). Desainnya kuat di beberapa titik: kolom sort di-whitelist (tidak ada SQL injection lewat `sortBy`), filter scope diterapkan di list **dan** detail, seluruh nilai filter di-parameterisasi, audit mencatat snapshot penuh, dan nested contract dibuat dalam transaksi yang sama. Kelemahan utama: **lapisan raw SQL yang tidak memakai helper soft-delete**, tipe `any` di batas response, dan **impor yang melakukan query per baris**.

---

## 2. Temuan & Perbaikan

### EMP-01 — Impor melakukan 2 query per baris di dalam satu transaksi (High)

**Rule:** `perf-optimize-database`, `db-use-transactions`
**Lokasi:** `employees.importer.ts:113-176` (pass 1 di `:132-158`, pass 2 di `:160-175`), `imports/import.service.ts:84` (batas 5000 baris)

`commit` melakukan:

- pass 1: untuk setiap baris → `updateAndSave` atau `createAndSave` (1 query/baris),
- pass 2: untuk setiap baris dengan supervisor → `updateAndSave` lagi (1 query/baris).

Dengan batas `IMPORT_MAX_ROWS` default 5000, satu file dapat menghasilkan **±10.000 query berurutan** di dalam satu transaksi (ditambah `SELECT` master data). Transaksi berjalan lama → menahan koneksi & lock, memperbesar risiko timeout, dan memblokir perubahan employees lain.

**Perbaikan:**
1. Batch insert karyawan baru dengan satu `INSERT ... VALUES (...), (...)` (drizzle: `insert(employees).values(rows)`).
2. Batch update memakai `UPDATE ... FROM (VALUES ...)` atau `CASE` per kolom, atau minimal kelompokkan per set kolom yang sama.
3. Resolusi supervisor: karena `supervisor_id` hanya butuh id yang sudah ada (file atau DB), bagi menjadi dua fase **tanpa** update per baris — kumpulkan pasangan `(selfId, supervisorId)` lalu satu `UPDATE ... FROM (VALUES ...)`.
4. Pertimbangkan menurunkan `IMPORT_MAX_ROWS` atau memproses per batch dengan progres.

---

### EMP-02 — `removeEmployee` hanya memblokir jika ada user terkait (Medium, **Perlu konfirmasi**)

**Rule:** `arch-single-responsibility`, `db-use-transactions`
**Lokasi:** `employees.service.ts:223-239`, `employees.repository.ts:138-154`

Guard satu-satunya adalah `isLinkedToUsers`. Yang tidak diperiksa:

- **kontrak** (`contracts.employee_id`, cascade pada hard delete, tetapi soft delete tidak memicunya) — karyawan dengan kontrak aktif bisa dihapus, dan exclusion constraint tetap menganggap kontraknya aktif,
- **appraisal** (`appraisal_employees.employee_id`),
- **daily notes** (`daily_notes.employee_id`),
- **supervisor** — karyawan yang masih menjadi `supervisor_id` orang lain akan menyisakan referensi ke baris terhapus (kolom ini juga tanpa FK, lihat `db.md` DB-14).

Karena penghapusan soft delete, FK tidak menolong. Dampak: daftar daily notes/appraisal yang melakukan join + `notDeleted(employees)` dapat menyembunyikan riwayat, sementara data lain masih menunjuk karyawan tersebut.

**Perbaikan:** perluas pemeriksaan menjadi `isReferenced` (users, contracts, appraisals, daily notes, subordinates) dan kembalikan `409` dengan `errorCode: 'EMPLOYEE_IN_USE'` + daftar entitas. Putuskan juga apakah karyawan dengan riwayat appraisal boleh dihapus sama sekali.

---

### EMP-03 — `updateEmployee` tidak mencegah siklus supervisor & relasi nonaktif (Medium)

**Rule:** `security-validate-all-input`, `arch-single-responsibility`
**Lokasi:** `employees.service.ts:197-221`, `dto/create-employee.dto.ts:56-72`

Yang tidak divalidasi saat create/update:

- `supervisorId` boleh menunjuk dirinya sendiri atau membentuk siklus (A→B→A). Tidak ada penelusuran hierarki.
- `departmentId`/`positionId` boleh menunjuk baris yang sudah **soft-deleted** (FK tetap valid karena baris masih ada).
- `supervisorId` boleh menunjuk karyawan nonaktif/terhapus (tidak ada pengecekan).

Dampak: laporan hierarki bisa rekursif tanpa akhir, dan karyawan bisa ditempatkan di departemen yang sudah dihapus (list menampilkan `department: null` karena join difilter — lihat EMP-04).

**Perbaikan:** validasi di service: supervisor ≠ self, `supervisorId` ada & aktif, `departmentId`/`positionId` ada, `notDeleted`, dan `isActive`. Untuk siklus, telusuri rantai supervisor (batasi kedalaman) atau gunakan recursive CTE saat menetapkan supervisor.

---

### EMP-04 — Join raw SQL tidak memfilter soft delete (Medium)

**Rule:** `arch-use-repository-pattern`, `db-avoid-n-plus-one` (korektness)
**Lokasi:** `employees.repository.ts:43-58`

```sql
LEFT JOIN employees m ON m.id = e.supervisor_id
LEFT JOIN positions p ON p.id = e.position_id
LEFT JOIN departments d ON d.id = e.department_id
```

Tidak ada `AND m.deleted_at IS NULL` / `p.deleted_at IS NULL` / `d.deleted_at IS NULL`. Akibatnya karyawan yang departemennya sudah dihapus tetap menampilkan nama departemen di list/detail, padahal modul lain (dan filter `notDeleted`) menganggap departemen itu tidak ada. Ini juga bertentangan dengan `DEP-01` (departemen bisa dihapus walau masih ada karyawan — jadi kasus ini nyata, bukan teoretis).

**Perbaikan:** tambahkan filter pada setiap join, atau hentikan praktik raw SQL dan gunakan query builder + `notDeleted`. Konsistenkan dengan `users.md` USR-08.

---

### EMP-05 — `any` dan cast ganda di batas response (Medium)

**Rule:** `arch-use-repository-pattern` (tipe), `api-use-dto-serialization`
**Lokasi:** `employees.service.ts:132` (`result as unknown as EmployeePayload[]`), `:313` (`private toResponseEmployee(employee: any)`)

`any` menonaktifkan pemeriksaan tipe pada mapper yang justru menjadi satu-satunya tempat kontrak `EmployeePayload` ditegakkan. `as unknown as` melewati dua lapis tipe (raw row → payload) tanpa verifikasi. Ini juga melanggar aturan repo "TypeScript strict, hindari `any`" (AGENTS.md).

**Perbaikan:** definisikan tipe baris hasil raw SQL, mis.:
```ts
interface EmployeeRow {
  id: string;
  employeeNumber: string;
  // ...
  supervisor: { id: string; fullName: string } | null;
}
```
lalu `toResponseEmployee(employee: EmployeeRow): EmployeePayload` dan `rows as EmployeeRow[]` (satu cast yang jelas). Idealnya `db.execute<EmployeeRow>` memakai generic agar hasilnya sudah bertipe.

---

### EMP-06 — Tanggal dari raw SQL kemungkinan berupa `Date`, bukan `YYYY-MM-DD` (Medium, **Perlu konfirmasi**)

**Rule:** `db-*` (konsistensi tipe), `api-use-dto-serialization`
**Lokasi:** `employees.repository.ts:22-40`, `employees.service.ts:313-330`, `packages/types/src/employees.ts:41-57`

`selectClause` menjalankan SQL mentah melalui `db.execute`, sehingga parser tipe `node-postgres` yang dipakai. Kolom `date` (`birth_date`, `join_date`, `start_date`, `end_date`) di-parse menjadi objek `Date` (bukan string). `toResponseEmployee` meneruskannya apa adanya, sedangkan `EmployeeResponse` mendeklarasikan `birthDate: string` dan frontend mengharapkan `YYYY-MM-DD`.

Sebaliknya, jalur Drizzle (`createAndSave().returning()`) dengan tipe `date()` mengembalikan string. Jadi endpoint create dapat mengembalikan `"2023-01-01"` sementara list mengembalikan `"2023-01-01T00:00:00.000Z"`.

**Perbaikan:** verifikasi dengan test integrasi/respons nyata. Jika benar, format di mapper:
```ts
private toDateOnly(value: unknown): string { /* Date | string → YYYY-MM-DD */ }
```
atau cast di SQL (`::text`) untuk setiap kolom tanggal, lalu tambahkan test yang mengunci format.

---

### EMP-07 — `sanitize` diduplikasi dengan aturan lebih lemah (Medium)

**Rule:** `security-sanitize-output`, `arch-module-sharing`
**Lokasi:** `employees.excel.ts:17-19` vs `common/utils/excel.util.ts:5-7`

`EmployeesExcelService` mendefinisikan `sanitize` lokal yang identik dengan `sanitizeCell` di util bersama (dan keduanya memakai regex lemah `^[=+\-@]`). Dua salinan berarti hardening nanti harus diubah di dua tempat; `employees.excel.ts` sudah mengimpor `ExcelJS` tetapi tidak mengimpor util bersama.

**Perbaikan:** impor `sanitizeCell` dari `common/utils/excel.util` dan hapus salinan lokal; perketat util bersama sekali (lihat `common.md` CMM-07). Tambahkan test untuk karakter berbahaya.

---

### EMP-08 — Batas ukuran file tidak konsisten: 20 MB di interceptor vs 5 MB di service (Medium)

**Rule:** `security-validate-all-input`, `perf-optimize-database`
**Lokasi:** `employees.controller.ts:83-87` vs `imports/import.service.ts:119-139` (`IMPORT_MAX_FILE_SIZE_MB` default 5)

Multer menerima file hingga 20 MB dan menyimpannya **di memori** (tanpa `storage` disk), lalu `ImportService` menolak file > 5 MB setelah seluruh buffer terbaca. Akibatnya: memori terpakai untuk file yang akhirnya ditolak, dan pesan error baru muncul setelah upload selesai.

**Perbaikan:** jadikan satu sumber konfigurasi — mis. baca `IMPORT_MAX_FILE_SIZE_MB` di module (via `ConfigService`) untuk `limits.fileSize`, atau gunakan `MulterModule.registerAsync` dengan config yang sama. Pertimbangkan `memoryStorage` limit yang lebih kecil (mis. 5 MB).

---

### EMP-09 — Test belum mencakup alur kritikal (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `employees.service.spec.ts:97-215`

Sudah baik: nested contract dalam transaksi + audit, filter SQL yang benar, audit export/template. Yang belum:
- `findAllEmployees` dengan `scope !== 'ALL'` (scope kosong → `1 = 0`, scope berisi → `IN (...)`) — ini kontrol akses, wajib diuji.
- `findOneEmployee` menolak karyawan di luar scope.
- `removeEmployee`: blokir bila terkait user, soft delete + audit.
- `updateEmployee`: 404 saat baris hilang, audit `before`/`after`.
- `importEmployees`: delegasi ke `ImportService` dengan strategy yang benar.
- mapper response (termasuk format tanggal — EMP-06).

---

### EMP-10 — Duplikasi `employeeNumber` menghasilkan error generik (Medium)

**Rule:** `error-throw-http-exceptions`
**Lokasi:** `employees.service.ts:144-195`, `db/schema.ts:160-162`

Tidak ada pre-check `employeeNumber`; duplikat memicu `23505` pada `uq_employees_number_active` → filter memberi `409 UNIQUE_VIOLATION` dengan pesan parsing constraint, bukan `errorCode` domain. Impor mengatasi ini dengan upsert (update jika nomor sudah ada), sehingga perilaku create (tolak) dan import (timpa) berbeda untuk input yang sama — dapat membingungkan pengguna.

**Perbaikan:** tangkap `23505` dan lempar `ConflictException({ errorCode: 'EMPLOYEE_NUMBER_ALREADY_EXISTS' })`; dokumentasikan bahwa impor bersifat upsert.

---

### EMP-11 — `countEmployees` memakai seluruh `fromClause` (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `employees.repository.ts:81-90`

```sql
SELECT count(*)::int
FROM employees e
LEFT JOIN employees m ...
LEFT JOIN positions p ...
LEFT JOIN departments d ...
LEFT JOIN ( ... GROUP BY employee_id ) latest ...
LEFT JOIN contracts c ...
WHERE ...
```

Untuk menghitung, semua join dan subquery agregasi tetap dijalankan. Count tidak membutuhkan kolom tampilan, tetapi memang membutuhkan `c.end_date` untuk filter `contractEnd*` (dan subquery `MIN` untuk filter `contractStart*` bila dikirim).

**Perbaikan:** susun `fromClause` kondisional: tanpa join kontrak bila filter kontrak tidak dipakai; atau hitung via `COUNT(*) OVER ()` pada query data sehingga hanya satu perjalanan query (lihat `departments.md` DEP-06).

---

### EMP-12 — `DELETE` mengembalikan 200, bukan 204 (Low)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `employees.controller.ts:111-116`

Tidak ada `@HttpCode(HttpStatus.NO_CONTENT)`, sehingga Nest memakai default 200 sementara service mengembalikan `void` → response `{ status: 200, data: null }`. Modul Users/Departments/Positions memakai 204. Konsistenkan.

---

### EMP-13 — `address` wajib di API tetapi opsional di impor dan DB (Low)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `dto/create-employee.dto.ts:70-73` (`@IsNotEmpty()`), `employees.importer.ts:139` (`address: p.address || null`), `db/schema.ts:152` (`text('address')` nullable)

Kontrak tidak konsisten: tidak mungkin membuat karyawan tanpa alamat lewat API, tetapi impor Excel dan skema DB mengizinkannya. `EmployeeResponse.address: string` juga tidak mengizinkan `null`, padahal data impor bisa `null` → tipe berbohong.

**Perbaikan:** putuskan satu kebijakan (wajib atau opsional) dan selaraskan DTO, importer, tipe bersama, serta kolom DB.

---

### EMP-14 — DTO query tidak mengimplementasikan tipe bersama `EmployeeQuery` (Low)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `dto/query-employee.dto.ts:1-32`, `packages/types/src/employees.ts:36-42`

`QueryEmployeeDto extends QueryDto` tetapi tidak `implements EmployeeQuery`, dan shared type tidak memuat filter kontrak (`contractStartFrom`, dst.) yang ditambahkan DTO. Akibatnya kontrak frontend–backend untuk query tidak lagi satu sumber; perubahan di salah satu sisi tidak memicu error compiler.

**Perbaikan:** jadikan `EmployeeQuery` sumber tunggal (tambahkan filter kontrak di sana) dan `implements EmployeeQuery`.

---

### EMP-15 — File enum hanya re-export (Low)

**Lokasi:** `enums/column-employee.enum.ts:1`, `enums/gender.enum.ts:1`

Sama seperti `users.md` USR-11: dua file satu baris yang hanya meneruskan simbol dari `@appraisal/types`. Berfungsi, tetapi menambah lapisan. Impor langsung dari paket bersama lebih sederhana (kecuali ada alasan historis).

---

### EMP-16 — Impor: master data dibaca di luar transaksi & parsing diulang (Low)

**Rule:** `db-use-transactions`
**Lokasi:** `employees.importer.ts:60-66` dan `:117-125`

- `findDepartmentIdsByCodes`/`findPositionIdsByCodes` tidak menerima `executor`, jadi pada `commit` mereka membaca lewat koneksi global, bukan `tx` impor. Untuk master data yang stabil hasilnya sama, tetapi snapshot-nya tidak konsisten dengan transaksi.
- `parse(rows)` dijalankan dua kali (validate dan commit) — tidak berbahaya, hanya duplikasi kerja.

**Perbaikan:** beri parameter `executor` pada kedua method dan teruskan `tx`; simpan hasil parse bila memungkinkan.

---

### EMP-17 — Ekspor tanpa scope/filter dan tanpa batas (Low, **Perlu konfirmasi**)

**Rule:** `security-use-guards`, `perf-optimize-database`
**Lokasi:** `employees.service.ts:245-267`, `employees.repository.ts:174-199`

`findForExport` mengambil **semua** karyawan tanpa filter departemen/status dan tanpa `LIMIT`, lalu seluruh workbook dibangun di memori. Saat ini endpoint dibatasi ADMIN/HR (scope global), jadi belum ada kebocoran; tetapi bila nanti role lain diberi akses, scope tidak otomatis berlaku. Untuk data besar, memori bisa membengkak.

**Perbaikan:** terima `QueryEmployeeDto` yang sama dengan list (termasuk scope) untuk ekspor, dan/atau batasi jumlah baris per file. Konfirmasi apakah ekspor memang harus seluruh data atau mengikuti filter di layar.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Whitelist kolom sort** (`SORT_COLUMNS`) + validasi `@IsEnum(ColumnEmployee)` → `sql.raw(column)` tidak bisa disuntik, karena hanya nilai peta yang masuk.
- **Semua nilai filter di-parameterisasi** (`sql` template + `sql.join`), termasuk `search` dengan `%` yang dibungkus parameter.
- **Scope departemen diterapkan pada list dan detail** (`findAllEmployees` menambahkan `IN (...)`, `findOneRowOrFail` menolak di luar scope) — 404 dipakai agar keberadaan data tidak bocor.
- **Nested contract dibuat dalam transaksi yang sama** dengan karyawan + audit; bila salah satu gagal, semuanya rollback (diuji).
- **Audit menyimpan snapshot penuh** (`after: full`) dan mencatat ekspor/template tanpa isi file.
- **Ekspor memakai `sanitizeCell`-style prefix** untuk mencegah formula injection (walau duplikat, lihat EMP-07).
- **Importer menjalankan validasi seluruh file sebelum menulis** (`validate` → `commit`), sesuai pola pipeline `imports`.
- **`fromClause` memakai subquery `MAX(start_date)`** sehingga kontrak terbaru diambil tanpa N+1 di sisi query.
- **`UpdateEmployeeDto` memakai `OmitType` + `PartialType`** — `contracts` sengaja tidak bisa diubah lewat endpoint update.
- **`isLinkedToUsers`** mencegah karyawan yang dipakai akun login terhapus.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | EMP-01 | Impor 5000 baris = ±10.000 query dalam satu transaksi |
| 2 | EMP-03 | Siklus supervisor & relasi nonaktif merusak hierarki |
| 3 | EMP-04 | Data soft-deleted bocor ke list/detail |
| 4 | EMP-05, EMP-06 | Tipe `any` dan format tanggal yang mungkin salah |
| 5 | EMP-02 | Aturan hapus karyawan belum lengkap |
| 6 | EMP-08, EMP-11 | Memori upload & beban query count |
| 7 | EMP-07, EMP-09, EMP-10 | Utilitas bersama, test, pesan error |
| 8 | EMP-12 … EMP-17 | Konsistensi & kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] EMP-01 Batch insert/update pada importer; resolusi supervisor dengan satu `UPDATE ... FROM`
- [ ] EMP-02 Perluas guard hapus (contracts, appraisals, daily notes, subordinates)
- [ ] EMP-03 Validasi supervisor (self/siklus/nonaktif) dan department/position aktif
- [ ] EMP-04 Filter soft delete pada join `m`/`p`/`d`
- [ ] EMP-05 Ganti `any`/cast ganda dengan tipe baris eksplisit
- [ ] EMP-06 Pastikan & kunci format tanggal `YYYY-MM-DD` (mapper/test)
- [ ] EMP-07 Pakai `sanitizeCell` dari util bersama; hapus salinan
- [ ] EMP-08 Satukan batas ukuran file (config yang sama untuk Multer & ImportService)
- [ ] EMP-09 Tambah test scope, remove, update 404, import
- [ ] EMP-10 `errorCode: EMPLOYEE_NUMBER_ALREADY_EXISTS`
- [ ] EMP-11 Count tanpa join yang tidak perlu / pakai window function
- [ ] EMP-12 `@HttpCode(204)` pada delete
- [ ] EMP-13 Selaraskan aturan `address`
- [ ] EMP-14 `QueryEmployeeDto implements EmployeeQuery` (tambahkan filter kontrak ke shared type)
- [ ] EMP-15 (opsional) Hapus file enum re-export
- [ ] EMP-16 Teruskan `tx` ke lookup master data; hindari parse ganda
- [ ] EMP-17 Konfirmasi cakupan ekspor (scope/filter/limit)
