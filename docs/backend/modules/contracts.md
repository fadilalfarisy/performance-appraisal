# Audit: Contracts (`src/contracts/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`security-*`, `db-*`, `perf-*`, `api-*`, `test-*`)
**File yang diperiksa (13):**
- `contracts.module.ts`, `contracts.controller.ts`, `contracts.service.ts`, `contracts.repository.ts`
- `contracts.excel.ts`, `contracts.importer.ts`
- `dto/create-contract.dto.ts`, `dto/update-contract.dto.ts`, `dto/contract-query.dto.ts`
- `interfaces/contract.interface.ts`
- `contracts.service.spec.ts`, `contracts.repository.spec.ts`, `contracts.importer.spec.ts`
- Rujukan: `packages/types/src/contracts.ts`, `db/schema.ts`, `drizzle/0002_drop_contract_status.sql`, `employees/employees.service.ts`, `common/scope/scope.service.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | CTR-01 |
| Medium | 7 | CTR-02 … CTR-08 |
| Low | 6 | CTR-09 … CTR-14 |

Ini module dengan **kualitas test terbaik** (tiga spec: service, repository, importer; termasuk kompilasi SQL untuk memverifikasi filter dan overlap guard). Aturan anti-tumpang-tindih dijaga dua lapis: pengecekan aplikasi **dan** exclusion constraint DB. Kelemahan utamanya: **tidak ada data-scope departemen pada `GET /contracts` dan `GET /contracts/:id`** — berbeda dari Employees yang menerapkan `ScopeService`.

---

## 2. Temuan & Perbaikan

### CTR-01 — List & detail kontrak tidak menerapkan scope departemen (High)

**Rule:** `security-use-guards`, `security-authorization` (data scope)
**Lokasi:** `contracts.controller.ts:43-51` (`GET /contracts`), `:80-88` (`GET /contracts/:id`), `contracts.service.ts:39-53`, `contracts.repository.ts:24-45`

`@Controller('contracts')` tidak punya `@Roles`, jadi **semua role yang login** (mis. `SUPERVISOR`, `HEAD_DEPARTMENT`) bisa:

- melihat seluruh kontrak semua karyawan di semua departemen,
- mencari berdasarkan nama/nomor karyawan (`search`),
- mengambil kontrak mana pun lewat UUID (`GET /contracts/:id`).

Bandingkan dengan `EmployeesService.findAllEmployees`/`findOneRowOrFail` yang memanggil `ScopeService.getDepartmentScope` dan mengembalikan 404 untuk data di luar scope. Kontrak berisi data pribadi (jenis kontrak, tanggal, keterkaitan karyawan), jadi ketiadaan scope adalah kebocoran data lintas departemen.

**Perbaikan:**
1. Tambahkan `ScopeService` ke `ContractsService` (atau repository) dan filter `contracts.employee_id` berdasarkan departemen karyawan yang boleh diakses:
   ```sql
   AND e.department_id IN (...)   -- atau 1 = 0 bila scope kosong
   ```
2. Terapkan di `findAllWithCount`, `findForExport`, dan `findOne` (404 bila out-of-scope).
3. Tambahkan test untuk scope `ALL`, scope kosong, dan scope berisi.

Catatan: ekspor sudah dibatasi `@Roles(ADMIN, HR)` — keduanya role global — tetapi filter scope tetap perlu agar tidak bergantung pada asumsi role di masa depan.

---

### CTR-02 — Validasi tanggal & tipe kontrak berbeda antara API dan importer (Medium)

**Rule:** `security-validate-all-input`, `arch-single-responsibility`
**Lokasi:** `dto/create-contract.dto.ts:8-27`, `contracts.service.ts:55-111`, `contracts.importer.ts:66-83`

Importer menegakkan:
- `PERMANENT` tidak boleh punya `endDate`,
- selain `PERMANENT` wajib punya `endDate`,
- `endDate >= startDate`.

API tidak menegakkan satu pun:
- `POST /contracts` menerima `PERMANENT` + `endDate`,
- menerima `FIXED_TERM` tanpa `endDate`,
- menerima `endDate < startDate` (tidak ada check constraint di `contracts` untuk urutan tanggal; exclusion constraint tetap jalan, tapi data tidak masuk akal).

Akibatnya file Excel yang ditolak importer bisa lolos lewat endpoint create/update, dan sebaliknya.

**Perbaikan:** pusatkan aturan di satu validator yang dipakai DTO (custom validator/`@ValidateIf`) dan importer, atau tambahkan `CHECK (end_date IS NULL OR end_date >= start_date)` di migrasi + validasi `PERMANENT` di service. Putuskan juga apakah `PERMANENT` memang tidak boleh punya `endDate` (importer bilang ya; tipe `ContractResponse` mengizinkan `null`).

---

### CTR-03 — `create` tidak memverifikasi karyawan ada dan belum dihapus (Medium)

**Rule:** `security-validate-all-input`
**Lokasi:** `contracts.service.ts:55-79`, `contracts.repository.ts:156-171`

`employeeId` hanya `@IsUUID()`. FK menangkap ID yang tidak ada (`23503` → 400 generik), tetapi karyawan yang sudah **soft-deleted** tetap valid secara FK, sehingga kontrak baru bisa dibuat untuk karyawan terhapus.

**Perbaikan:** cek `employeesRepository.findById(employeeId)` (yang memfilter `notDeleted`) sebelum insert, lempar `400/404` dengan `errorCode: 'CONTRACT_EMPLOYEE_INVALID'`. Importer sudah melakukan ini lewat `findEmployeesByNumbers`.

---

### CTR-04 — Importer melakukan 2 query per baris (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `contracts.importer.ts:132-177`

Untuk setiap baris: `findByEmployeeAndStart` lalu `updateAndSave`/`createAndSave`. Dengan batas 5000 baris → ±10.000 query berurutan dalam satu transaksi.

**Perbaikan:** ambil seluruh kontrak karyawan terkait dalam satu query (`findByEmployeeIds` sudah ada), bangun map `(employeeId, startDate) → id`, lalu batch insert/update (sama seperti `employees.md` EMP-01). Perhatikan exclusion constraint: batch insert yang saling tumpang tindih akan gagal seluruhnya — validasi file sudah mencegahnya, tetapi urutan eksekusi tetap perlu diuji.

---

### CTR-05 — `toPayload(contract: any)` dan cast implisit (Medium)

**Rule:** `api-use-dto-serialization` (tipe)
**Lokasi:** `contracts.service.ts:219-229`, `contracts.service.spec.ts` (memakai `as never` di banyak tempat)

Sama seperti `employees.md` EMP-05: `any` menonaktifkan pemeriksaan tipe pada mapper `ContractPayload`, dan hasil `findAllWithCount` (yang punya bentuk gabungan `contracts + employees`) tidak punya tipe eksplisit.

**Perbaikan:** definisikan `ContractWithEmployeeRow` dan gunakan sebagai tipe parameter `toPayload`; gunakan generic `db.select<...>` di repository agar `employee` terketik.

---

### CTR-06 — Filter `endDate*` mengecualikan kontrak PERMANENT (Medium, **Perlu konfirmasi**)

**Rule:** `db-use-migrations` (semantik query)
**Lokasi:** `contracts.repository.ts:41-42`, `contracts.excel.ts` (Notes: "Required unless PERMANENT")

`gte(contracts.endDate, endDateFrom)` dan `lte(contracts.endDate, endDateTo)` memakai SQL `NULL` semantics: baris dengan `end_date IS NULL` (PERMANENT) **tidak pernah** cocok. Jadi filter "kontrak yang berakhir setelah 2026-01-01" tidak menampilkan kontrak permanen, padahal secara bisnis kontrak permanen berakhir "tak terhingga".

**Perbaikan:** konfirmasi definisi filter. Jika kontrak permanen harus ikut, gunakan `COALESCE(end_date, 'infinity'::date)` atau tambahkan opsi eksplisit (`includePermanent`). Dokumentasikan di DTO/Swagger.

---

### CTR-07 — Cakupan test belum menyentuh scope dan jalur hapus (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `contracts.service.spec.ts`, `contracts.importer.spec.ts`, `contracts.repository.spec.ts`

Yang sudah sangat baik: overlap guard (create/update, exclude ID, respons 422 dengan detail), filter SQL, dan validasi importer (termasuk duplikat & overlap).

Yang belum:
- scope departemen (setelah CTR-01),
- `remove` → soft delete + audit,
- `findOne`/`update` saat baris tidak ada → 404,
- `create` untuk karyawan terhapus (setelah CTR-03),
- validasi urutan tanggal/PERMANENT (setelah CTR-02),
- `commit` importer (batch vs per baris).

---

### CTR-08 — `sanitize` excel disalin untuk ketiga kalinya (Medium)

**Rule:** `security-sanitize-output`, `arch-module-sharing`
**Lokasi:** `contracts.excel.ts:27-30` vs `common/utils/excel.util.ts:5-7` vs `employees/employees.excel.ts:17-19`

Tiga salinan regex yang sama (`^[=+\-@]`), semuanya mewarisi kelemahan yang sama (tidak menangani `\t`, `\r`, spasi di depan — lihat `common.md` CMM-07). Perbaikan hardening harus dilakukan di tiga tempat.

**Perbaikan:** impor `sanitizeCell` dari util bersama dan hapus salinan lokal. Tambahkan test tunggal untuk util tersebut.

---

### CTR-09 — Default `limit` berbeda dari `QueryDto` (Low)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `contracts.repository.ts:94` (`limit = 20`), `contracts.service.ts:44-48` (memakai `query.limit` mentah untuk `paginated`)

Selain default yang berbeda dari `QueryDto` (10), service memakai `query.limit`/`query.page` untuk metadata, sedangkan repository memakai nilai default lokal bila kosong. Jika query datang tanpa transformasi, metadata dan jumlah baris bisa berbeda.

**Perbaikan:** gunakan konstanta bersama (`DEFAULT_PAGE`, `DEFAULT_LIMIT`) dan hitung metadata dari nilai yang benar-benar dipakai repository.

---

### CTR-10 — `count` menjalankan join yang tidak selalu perlu (Low)

**Rule:** `perf-optimize-database`
**Lokasi:** `contracts.repository.ts:107-118`

Count selalu `leftJoin(employees)` meskipun join hanya dibutuhkan saat `search` diisi. Untuk tabel besar, ini menambah biaya tanpa manfaat.

**Perbaikan:** tambahkan join hanya bila `query.search` ada, atau pakai `COUNT(*) OVER ()` pada query data (lihat `departments.md` DEP-06).

---

### CTR-11 — Batas upload 20 MB vs batas impor 5 MB (Low)

**Rule:** `security-validate-all-input`
**Lokasi:** `contracts.controller.ts:89-93` vs `imports/import.service.ts:119-139`

Sama seperti `employees.md` EMP-08: Multer menerima 20 MB ke memori, lalu `ImportService` menolak > 5 MB setelah file terbaca.

**Perbaikan:** satukan sumber konfigurasi (`IMPORT_MAX_FILE_SIZE_MB`) untuk `limits.fileSize`.

---

### CTR-12 — Lookup karyawan pada `commit` di luar transaksi (Low)

**Rule:** `db-use-transactions`
**Lokasi:** `contracts.importer.ts:135` → `contracts.repository.ts:156-171` (tanpa `executor`)

`findEmployeesByNumbers` tidak menerima `DbExecutor`, sehingga pada `commit` ia membaca lewat koneksi global, bukan `tx`. Untuk data master yang stabil hasilnya sama, tetapi snapshot tidak konsisten. Beri parameter `executor` seperti method lain.

---

### CTR-13 — `remove` tidak memeriksa hasil `softDelete` (Low)

**Rule:** `error-handle-async-errors`
**Lokasi:** `contracts.service.ts:113-129`

`softDelete` mengembalikan `null` bila baris sudah terhapus bersamaan, tetapi audit `CONTRACT_DELETED` tetap ditulis dan response 204. Sama seperti `departments.md` DEP-10 / `positions.md` POS-05.

---

### CTR-14 — DTO query tidak mengimplementasikan `ContractQuery` (Low)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `dto/contract-query.dto.ts:1-30`, `packages/types/src/contracts.ts:15-22`

`ContractQueryDto extends QueryDto` dan field-nya saat ini cocok dengan `ContractQuery`, tetapi tidak `implements ContractQuery` (berbeda dari `CreateContractDto implements CreateContractRequest`). Jika shared type berubah, compiler tidak akan menandai DTO.

**Perbaikan:** tambahkan `implements ContractQuery` (dan hilangkan duplikasi deklarasi bila memungkinkan).

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Dua lapis aturan overlap**: `assertNoOverlap` (422 `CONTRACT_OVERLAP` dengan rentang yang bentrok) **dan** exclusion constraint DB (`23P01` dipetakan ke 422 oleh filter). Uji keduanya mengunci perilaku.
- **`daterange` + `&&` + `COALESCE(end_date, 'infinity')`** — semantik overlap benar, termasuk kontrak tanpa akhir; nilai tetap diparameterisasi.
- **Update memakai tanggal efektif** (`dto.startDate ?? existing.startDate`, dsb.) dan mengecualikan kontrak itu sendiri — diuji.
- **Repository dipecah baik**: `buildContractFilters` diekspor dan diuji terpisah lewat kompilasi SQL (`PgDialect`), termasuk memastikan tidak ada pencarian saat `search` kosong.
- **Importer memvalidasi seluruh file sebelum commit**, termasuk overlap terhadap DB dan antar-baris dalam file, dan menolak permanen dengan `end_date`.
- **Audit dalam transaksi** dengan `before`/`after`, serta mencatat filter ekspor (`exportFilters`).
- **Export menghormati filter query** (berbeda dari Employees yang mengekspor seluruh data).
- **Soft delete konsisten** dan semua query memakai `notDeleted`.
- **DTO memakai tipe bersama** untuk create/update.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | CTR-01 | Kebocoran data kontrak lintas departemen |
| 2 | CTR-03 | Kontrak untuk karyawan terhapus |
| 3 | CTR-02 | Data tidak masuk akal (end < start, permanen + end date) |
| 4 | CTR-04 | Impor lambat & transaksi panjang |
| 5 | CTR-06 | Filter mengembalikan hasil menyesatkan |
| 6 | CTR-05, CTR-07, CTR-08 | Tipe, test, util bersama |
| 7 | CTR-09 … CTR-14 | Konsistensi & kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] CTR-01 Terapkan `ScopeService` pada list, detail, dan export + test
- [ ] CTR-02 Satukan validasi `PERMANENT`/urutan tanggal (DTO + importer + CHECK DB)
- [ ] CTR-03 Validasi karyawan ada & belum dihapus
- [ ] CTR-04 Batch insert/update pada importer
- [ ] CTR-05 Hilangkan `any` dan beri tipe baris eksplisit
- [ ] CTR-06 Konfirmasi semantik filter `endDate*` untuk PERMANENT
- [ ] CTR-07 Tambah test scope/remove/404/commit
- [ ] CTR-08 Pakai `sanitizeCell` bersama (hapus salinan ketiga)
- [ ] CTR-09 Pakai konstanta pagination bersama
- [ ] CTR-10 Join `employees` hanya saat `search`
- [ ] CTR-11 Satukan batas ukuran file
- [ ] CTR-12 Teruskan `tx` ke `findEmployeesByNumbers`
- [ ] CTR-13 Periksa hasil `softDelete`
- [ ] CTR-14 `ContractQueryDto implements ContractQuery`
