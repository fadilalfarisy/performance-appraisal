# Audit: Departments (`src/departments/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`arch-*`, `db-*`, `api-*`, `security-*`, `test-*`)
**File yang diperiksa (9):**
- `departments.module.ts`, `departments.controller.ts`, `departments.service.ts`, `departments.repository.ts`
- `dto/create-department.dto.ts`, `dto/update-department.dto.ts`, `dto/department-query.dto.ts`, `dto/department-response.dto.ts`
- `interfaces/department.interface.ts`
- `departments.service.spec.ts`
- Rujukan: `db/schema.ts` (FK `criteria_sets`, `daily_notes`, `appraisals`, `user_departments`), `users/users.repository.ts`, `dashboard/dashboard.repository.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | DEP-01 |
| Medium | 7 | DEP-02 … DEP-08 |
| Low | 5 | DEP-09 … DEP-13 |

Pola master data sudah benar dan konsisten dengan modul lain: repository menerima `DbExecutor`, audit ditulis dalam transaksi yang sama, `findOneOrFail` memusatkan 404, dan DTO terikat tipe bersama. Masalah utamanya: **aturan hapus hanya memeriksa karyawan**, sementara departemen juga direferensikan criteria set, daily notes, appraisals, dan `user_departments`.

---

## 2. Temuan & Perbaikan

### DEP-01 — `remove` hanya memblokir jika ada karyawan; referensi lain diabaikan (High)

**Rule:** `db-use-transactions`, `arch-single-responsibility`
**Lokasi:** `departments.service.ts:87-107`, `departments.repository.ts:95-108`, `db/schema.ts:208` (`criteria_sets.department_id`), `:323-325` (`daily_notes.department_id`), `:384-386` (`appraisals.department_id`), `:89-91` (`user_departments.department_id`)

`remove` hanya memanggil `isLinkedToEmployees`. Padahal departemen juga dirujuk oleh:

| Tabel | FK | Perilaku saat departemen dihapus |
|-------|----|----------------------------------|
| `employees` | `department_id` | dicek oleh service |
| `criteria_sets` | `department_id` | **tidak dicek** (soft delete tidak memicu FK) |
| `daily_notes` | `department_id` | **tidak dicek** |
| `appraisals` | `department_id` | **tidak dicek** |
| `user_departments` | `department_id` | **tidak dicek** |

Karena penghapusan bersifat soft delete (UPDATE), constraint FK tidak akan menolong. Setelah departemen dihapus:
- criteria set ACTIVE milik departemen itu tetap ACTIVE tetapi departemennya tidak terlihat (`notDeleted`), sehingga pembuatan appraisal baru untuk departemen tersebut gagal dengan pesan membingungkan,
- riwayat appraisal/catatan harian menunjuk departemen yang "tidak ada"; query yang melakukan join + `notDeleted(departments)` (mis. `dashboard.repository.ts:53`) akan menghilangkan baris tersebut dari agregasi,
- `user_departments` menyisakan scope yang menunjuk departemen terhapus.

**Perbaikan:** perluas pemeriksaan menjadi satu query eksistensi atau beberapa `exists`:
```ts
async isReferenced(id: string, executor: DbExecutor = this.db): Promise<boolean> {
  // employees, criteria_sets, appraisals, daily_notes, user_departments
}
```
Kembalikan `409 Conflict` dengan `errorCode: 'DEPARTMENT_IN_USE'` yang menyebut entitas penghalang. Alternatif yang lebih eksplisit: `ON DELETE RESTRICT` tetap tidak membantu untuk soft delete, jadi validasi bisnis wajib. **Perlu konfirmasi** apakah departemen dengan riwayat appraisal seharusnya tidak boleh dihapus sama sekali (rekomendasi) atau boleh diarsipkan dengan penanda khusus.

---

### DEP-02 — Pemeriksaan relasi dilakukan di luar transaksi hapus (Medium)

**Rule:** `db-use-transactions`
**Lokasi:** `departments.service.ts:90-100`

`isLinkedToEmployees` dijalankan **sebelum** `dbService.transaction`. Karyawan baru bisa dibuat (atau dipindahkan) ke departemen itu di antara pemeriksaan dan `softDelete`, sehingga aturan "tidak boleh dihapus jika berisi karyawan" tetap bisa dilanggar.

**Perbaikan:** jalankan pemeriksaan dengan `tx` yang sama di dalam transaksi, dan/atau kunci baris departemen (`SELECT ... FOR UPDATE`) bila pola ini dipakai di modul lain.

---

### DEP-03 — Duplikasi `code` hanya tertangkap constraint; pesan tidak spesifik (Medium)

**Rule:** `error-throw-http-exceptions`, `db-use-transactions`
**Lokasi:** `departments.service.ts:42-61`, `db/schema.ts:111`

`create` langsung insert tanpa pre-check. Duplikat `code` memicu `23505` yang dipetakan filter menjadi `409 UNIQUE_VIOLATION` dengan pesan hasil parsing detail PostgreSQL (mis. `code 'ENG' already exists`). Itu masih bisa dibaca, tetapi tidak memakai `errorCode` domain seperti modul lain (`USER_USERNAME_ALREADY_EXISTS`).

**Perbaikan:** tangkap `23505` pada `departments_code_key` di service dan lempar `ConflictException({ message: 'Department code already exists', errorCode: 'DEPARTMENT_CODE_ALREADY_EXISTS' })`. Tambahkan test.

---

### DEP-04 — `headEmployeeId` tidak divalidasi (Medium)

**Rule:** `security-validate-all-input`, `arch-single-responsibility`
**Lokasi:** `dto/create-department.dto.ts:26-29`, `departments.service.ts:42-61`

`headEmployeeId` hanya `@IsUUID()`. Yang tidak diperiksa:
- karyawan benar-benar ada dan belum di-soft-delete,
- karyawan berasal dari departemen yang sama (kepala departemen lain tidak masuk akal),
- saat `update`, apakah `headEmployeeId` masih valid.

Tanpa itu, FK hanya menangkap ID yang tidak ada (`400 FOREIGN_KEY_VIOLATION` generik), sedangkan ID karyawan terhapus/berbeda departemen lolos.

**Perbaikan:** validasi di service (`employeesRepository.findById` + cek `departmentId`), lempar `BadRequestException` dengan `errorCode: 'DEPARTMENT_HEAD_INVALID'`.

---

### DEP-05 — Pagination tanpa `ORDER BY` (Medium)

**Rule:** `db-optimize-database` (determinisme query), `api-use-dto-serialization`
**Lokasi:** `departments.repository.ts:29-57`

Query data memakai `.limit(limit).offset(...)` tanpa `.orderBy(...)`. PostgreSQL tidak menjamin urutan baris; dengan `OFFSET` halaman dapat melewatkan atau mengulang departemen saat data berubah atau planner memilih urutan berbeda.

**Perbaikan:** tambahkan urutan yang stabil, mis. `.orderBy(asc(departments.createdAt), asc(departments.id))` (atau `name`). Jika `QueryDto.orderBy` ingin dipakai, tambahkan field `sortBy` yang di-whitelist.

---

### DEP-06 — Dua query berurutan untuk data + count (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `departments.repository.ts:45-55`

`select` data lalu `select count(*)` dijalankan berurutan (bukan paralel). Untuk tabel kecil dampaknya kecil, tetapi pola ini menambah latensi dua round-trip dan mudah tersalin ke modul besar (employees/appraisals).

**Perbaikan:** jalankan paralel (`Promise.all`) atau gunakan window function `count(*) OVER ()` dalam satu query. Jika memakai `Promise.all`, pastikan keduanya memakai snapshot yang konsisten (tanpa transaksi, count bisa berbeda tipis — biasanya dapat diterima untuk list).

---

### DEP-07 — Search `%...%` tidak memakai index (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `departments.repository.ts:35-41`

`ilike(departments.name, '%search%')` dengan wildcard di depan tidak bisa memakai index B-tree biasa. Untuk ratusan departemen tidak masalah, tetapi pola ini perlu diingat bila dipakai pada tabel besar.

**Perbaikan (opsional):** index `gin_trgm_ops` untuk kolom yang sering dicari, atau batasi pencarian ke prefix (`search%`).

---

### DEP-08 — `departments.service.spec.ts` belum menguji jalur gagal (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `departments.service.spec.ts:55-152`

Test yang ada baik untuk happy path + rule karyawan. Yang belum:
- `create` saat repository mengembalikan `null` → `BadRequestException`,
- `update` saat baris hilang di antara `findOneOrFail` dan `updateAndSave` → 404,
- `remove` ketika referensi non-karyawan ada (setelah DEP-01),
- duplikasi `code` (setelah DEP-03),
- validasi `headEmployeeId` (setelah DEP-04).

---

### DEP-09 — Default `limit` berbeda dari `QueryDto` (Low)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `departments.repository.ts:32` vs `common/query/query.dto.ts` (`DEFAULT_LIMIT = 10`)

Repository memakai `limit = 20` sebagai default, sedangkan `QueryDto` default 10. Dalam alur normal `ValidationPipe` mengisi 10 sehingga default repository tidak terpakai — tetapi bila service dipanggil langsung (job, test, modul lain), hasilnya 20. Membingungkan.

**Perbaikan:** gunakan konstanta bersama (`DEFAULT_PAGE`, `DEFAULT_LIMIT`) atau hapus default lokal.

---

### DEP-10 — `remove` mengaudit dan mengembalikan 204 walau baris sudah tidak ada (Low)

**Rule:** `error-handle-async-errors`
**Lokasi:** `departments.service.ts:87-107`

`softDelete` mengembalikan `null` bila baris sudah dihapus bersamaan, tetapi hasilnya tidak diperiksa: audit `DEPARTMENT_DELETED` tetap ditulis dan response 204. Dua request delete paralel menghasilkan dua entri audit.

**Perbaikan:** jika `softDelete` mengembalikan `null`, lempar 404 (atau lewati audit) agar audit mencerminkan kejadian nyata.

---

### DEP-11 — Kode mati: `department-response.dto.ts` & komentar guard (Low)

**Lokasi:** `dto/department-response.dto.ts:4-10`, `departments.controller.ts:30`

- `DepartmentResponseDto` tidak diimpor di mana pun (payload sebenarnya berasal dari `@appraisal/types`). Isinya juga tidak lengkap (hanya `id`, `name`) dan memakai `randomUUID()` sebagai contoh Swagger, sehingga jika suatu saat dipakai justru menyesatkan.
- Baris `// @UseGuards(JwtAuthGuard, RolesGuard)` adalah sisa percobaan; guard sudah global. Komentar ini bisa membuat pembaca mengira proteksi belum aktif.

**Perbaikan:** hapus keduanya.

---

### DEP-12 — `DepartmentsModule` tidak mengimpor `DbModule` (Low)

**Lokasi:** `departments.module.ts:4-8`

Bekerja hanya karena `DbModule` bertanda `@Global()`. Sama seperti `health.md` HLT-07; bukan bug, tetapi dependensi menjadi implisit dan tidak terlihat dari module. Opsional: tambahkan `imports: [DbModule]` untuk keterbacaan (konsistenkan kebijakan di seluruh module).

---

### DEP-13 — `headEmployeeId` pada response bisa menunjuk karyawan terhapus (Low, **Perlu konfirmasi**)

**Rule:** `arch-use-repository-pattern`
**Lokasi:** `departments.service.ts:115-126`, `departments.repository.ts:19-27`

`toPayload` mengembalikan `headEmployeeId` apa adanya; tidak ada join untuk memastikan karyawan masih ada/aktif. Bila kepala departemen di-soft-delete, UI tetap menampilkannya sebagai kepala.

**Perbaikan:** putuskan apakah response harus `null` untuk kepala yang sudah tidak aktif (butuh join) atau tetap menampilkan ID historis. Jika tetap, dokumentasikan di kontrak tipe.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Repository menerima `DbExecutor`** di semua operasi tulis/baca, sehingga bisa ikut transaksi.
- **Audit ditulis dalam transaksi yang sama** (`create`, `update`, `remove`) dan menyimpan `before`/`after` lengkap.
- **`findOneOrFail` memusatkan 404** dengan pesan yang menyebut ID.
- **`findAllWithCount` mengembalikan `[rows, total]`** sehingga service bisa memakai `paginated()` dari util bersama.
- **DTO tervalidasi** (`MaxLength`, `IsUUID`, `IsBoolean`) dan terikat tipe bersama (`implements CreateDepartmentRequest`).
- **Aturan "tidak boleh hapus jika berisi karyawan"** sudah ada dan diuji — tinggal diperluas (DEP-01).
- **Soft delete konsisten** (`isDeleted` + `deletedAt`) dan semua query memakai `notDeleted`.
- **`UpdateDepartmentDto` memakai `PartialType`** sehingga field optional tanpa duplikasi deklarasi.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | DEP-01 | Menghindari data yatim & appraisal/catatan yang tidak bisa diakses |
| 2 | DEP-02 | Race condition pada aturan hapus |
| 3 | DEP-05 | Pagination tidak deterministik (bug terlihat pengguna) |
| 4 | DEP-04, DEP-03 | Validasi input & pesan error domain |
| 5 | DEP-06, DEP-07 | Performa list |
| 6 | DEP-08 | Test jalur gagal |
| 7 | DEP-09 … DEP-13 | Kebersihan & konsistensi |

---

## 5. Checklist tindak lanjut

- [ ] DEP-01 Perluas pemeriksaan relasi (criteria_sets, appraisals, daily_notes, user_departments) + `409 DEPARTMENT_IN_USE`
- [ ] DEP-02 Jalankan pemeriksaan di dalam transaksi (idealnya `FOR UPDATE`)
- [ ] DEP-03 Tangani `23505` dengan `errorCode` domain
- [ ] DEP-04 Validasi `headEmployeeId` (ada, aktif, satu departemen)
- [ ] DEP-05 Tambahkan `ORDER BY` stabil
- [ ] DEP-06 Paralelkan data + count (atau window function)
- [ ] DEP-07 (opsional) Index trigram / pencarian prefix
- [ ] DEP-08 Tambah test jalur gagal
- [ ] DEP-09 Pakai konstanta pagination bersama
- [ ] DEP-10 Periksa hasil `softDelete` sebelum audit/204
- [ ] DEP-11 Hapus `DepartmentResponseDto` & komentar guard
- [ ] DEP-12 (opsional) `imports: [DbModule]`
- [ ] DEP-13 Konfirmasi perilaku kepala departemen yang sudah dihapus
