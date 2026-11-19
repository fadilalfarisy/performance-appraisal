# Audit: Appraisals (`src/appraisals/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`db-*`, `security-*`, `arch-*`, `api-*`, `test-*`)
**File yang diperiksa (22):**
- Module & web: `appraisals.module.ts`, `appraisals.controller.ts`, `scheduler.controller.ts`
- Logika: `appraisals.service.ts` (820 baris), `appraisals.repository.ts` (431 baris), `appraisal-score.ts`, `appraisal.transitions.ts`, `appraisal-scheduler.service.ts`
- Excel: `appraisals.excel.ts`
- DTO (7): `appraisal-query.dto.ts`, `appraisal-transition.dto.ts`, `create-appraisal.dto.ts`, `preview-appraisal.dto.ts`, `run-scheduler.dto.ts`, `save-ratings.dto.ts`, `update-appraisal-employees.dto.ts`
- Interface: `interfaces/appraisal.interface.ts`
- Test (5): `appraisal-score.spec.ts`, `appraisal.transitions.spec.ts`, `appraisals.service.spec.ts`, `appraisals.repository.spec.ts`, `appraisals.excel.spec.ts`
- Rujukan: `db/schema.ts`, `common/scope/scope.service.ts`, `criteria/criteria.service.ts`, `common/utils/period.util.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 3 | APR-01, APR-02, APR-03 |
| Medium | 10 | APR-04 … APR-13 |
| Low | 4 | APR-14 … APR-17 |

Desain inti module ini kuat: transisi status sebagai **data** (bukan if-else tersebar) dan diuji, perhitungan skor sebagai fungsi murni dan diuji, `lockAppraisal` memakai `SELECT ... FOR UPDATE` di dalam transaksi, scheduler dilindungi **advisory lock**, snapshot karyawan/kontrak disimpan untuk histori, dan query daily note sum diuji lewat kompilasi SQL. Tiga masalah High muncul dari detail eksekusi: **catch di dalam transaksi scheduler**, **komentar rating tanpa cek kepemilikan**, dan **unique index yang tidak parsial**.

---

## 2. Temuan & Perbaikan

### APR-01 — `try/catch` per departemen di dalam satu transaksi scheduler (High)

**Rule:** `db-use-transactions`, `error-handle-async-errors`
**Lokasi:** `appraisals.service.ts:514-593` (khususnya `:533-582`), `appraisals.repository.ts:100-124`

`runScheduler` membuka **satu transaksi** untuk semua departemen, lalu menangkap error per departemen:

```ts
for (const department of departments) {
  try {
    ... createAppraisal(..., tx); insertEmployees(..., tx); audit.record(tx, ...)
  } catch {
    failed += 1;
  }
}
await this.audit.record(tx, { action: 'SCHEDULER_RUN', ... });
```

Di PostgreSQL, satu statement yang gagal (mis. `23505`, `23P01`, timeout) membuat **seluruh transaksi berstatus aborted**. Setelah itu setiap query pada `tx` akan gagal dengan `25P02 current transaction is aborted`, sehingga:
- semua departemen berikutnya masuk ke `catch` dan dihitung `failed`,
- audit `SCHEDULER_RUN` gagal,
- transaksi di-rollback seluruhnya — hasil `{created, skipped, failed}` yang dikembalikan **tidak sesuai kenyataan** (tidak ada yang tersimpan).

**Perbaikan:** pakai transaksi **per departemen** (loop di luar transaksi, masing-masing `dbService.transaction`), atau pakai SAVEPOINT per departemen (`SAVEPOINT d; ... ROLLBACK TO SAVEPOINT d`). Simpan counter di luar transaksi dan tulis audit `SCHEDULER_RUN` pada transaksi terpisah. Jangan menelan error tanpa log (lihat APR-11).

---

### APR-02 — `saveRatings` dapat mengubah komentar milik appraisal lain (High)

**Rule:** `security-use-guards`, `security-validate-all-input`
**Lokasi:** `appraisals.service.ts:375-411`, `appraisals.repository.ts:377-386`

Rating diverifikasi:

```ts
if (!employeeIds.has(rating.appraisalEmployeeId) || ...) throw ...
```

Tetapi komentar **tidak**:

```ts
for (const comment of dto.comments ?? []) {
  await this.repository.updateEmployeeComment(comment.appraisalEmployeeId, comment.comment, tx);
}
```

`updateEmployeeComment` melakukan `UPDATE appraisal_employees SET comment = ... WHERE id = $1` **tanpa filter `appraisal_id`**. Seorang HEAD_DEPARTMENT yang mengetahui `appraisalEmployeeId` dari appraisal lain (bahkan departemen lain) dapat menimpa komentarnya, melewati scope dan tanpa jejak audit per-entitas. Ini IDOR lintas appraisal.

**Perbaikan:** validasi setiap `comment.appraisalEmployeeId` dengan `employeeIds` (sama seperti rating) atau ubah repository menjadi `updateEmployeeComment(appraisalId, id, comment)` dengan `AND appraisal_id = ... AND deleted_at IS NULL`, lalu cek jumlah baris terpengaruh.

---

### APR-03 — Menambahkan kembali karyawan yang dihapus melanggar unique index (High)

**Rule:** `db-use-transactions`, `db-use-migrations`
**Lokasi:** `appraisals.service.ts:310-350`, `appraisals.repository.ts:118-124`, `:301-316`, `db/schema.ts:434-437`

`removeEmployees` men-soft-delete baris `appraisal_employees`, lalu `updateEmployees` (atau `findEligible` karena `NOT EXISTS ... ae.deleted_at IS NULL`) menganggap karyawan itu **layak lagi**, dan `insertEmployees` memasukkan baris baru dengan `(appraisal_id, employee_id)` yang sama.

Index:

```ts
uniqueIndex('uq_appraisal_employee').on(table.appraisalId, table.employeeId) // tanpa WHERE deleted_at IS NULL
```

Baris lama masih ada → insert baru melanggar `23505`. Alur normal "hapus lalu tambahkan lagi" gagal (409/500), dan `updateEmployees` tidak menangkapnya.

**Perbaikan:** ubah index menjadi parsial `WHERE deleted_at IS NULL` (migrasi baru), **atau** ubah `insertEmployees` menjadi upsert yang mengaktifkan kembali baris lama (`ON CONFLICT (appraisal_id, employee_id) DO UPDATE SET is_deleted = false, deleted_at = NULL, ...`). Opsi upsert juga sekaligus membereskan duplikat di `dto.addEmployeeIds`. Pola yang sama berlaku untuk `appraisal_ratings` (`db.md` DB-06).

---

### APR-04 — `transition` memakai `roles[0]` (Medium)

**Rule:** `security-use-guards`
**Lokasi:** `appraisals.service.ts:431-432`, `appraisal.transitions.ts:78-86`

```ts
const role = user?.roles?.[0] ?? '';
```

`findTransition` hanya menerima satu role. User dengan `['HR','ADMIN']` atau `['SUPERVISOR','HEAD_DEPARTMENT']` bisa kehilangan hak transisinya (ADMIN bypass di `findTransition` juga tidak aktif karena role pertama bukan ADMIN), bergantung urutan data. Konsisten dengan `common.md` CMM-02 dan `criteria.md` CRT-04.

**Perbaikan:** teruskan seluruh `roles` dan uji irisan (`rule.roles.some(r => user.roles.includes(r)) || user.roles.includes(ADMIN)`), atau resolusi role prioritas tunggal yang terdokumentasi.

---

### APR-05 — `requireCriteriaSet` menerima criteria set `ARCHIVED` (Medium)

**Rule:** `arch-single-responsibility`
**Lokasi:** `appraisals.service.ts:597-612`

Sama seperti `daily-notes.md` DN-04: hanya `DRAFT` yang ditolak. `ARCHIVED` lolos sehingga appraisal baru dapat dipin ke versi yang sudah tidak berlaku. Untuk appraisal (lebih kritis daripada catatan), ini seharusnya ACTIVE saja.

**Perbaikan:** `if (set.status !== 'ACTIVE') throw ... 'APPRAISAL_CRITERIA_SET_NOT_ACTIVE'`. Pastikan scheduler juga memakai aturan yang sama (`criteriaService.findActive` sudah ACTIVE-only, jadi konsisten).

---

### APR-06 — `updateEmployees` diam-diam mengabaikan karyawan tidak layak/duplikat (Medium)

**Rule:** `security-validate-all-input`, `error-throw-http-exceptions`
**Lokasi:** `appraisals.service.ts:321-335`

```ts
const chosen = dto.addEmployeeIds
  .map((employeeId) => byId.get(employeeId))
  .filter((row): row is EligibleEmployee => Boolean(row));
await this.repository.insertEmployees(chosen.map(...));
```

Bila ada ID yang tidak layak, `chosen` lebih pendek, tetapi request tetap sukses dan audit mencatat `added: dto.addEmployeeIds.length` (bukan jumlah yang benar-benar ditambahkan). `create` justru melempar `APPRAISAL_INELIGIBLE_EMPLOYEE` untuk kasus serupa — perilakunya tidak konsisten dan HR tidak tahu ada yang gagal.

**Perbaikan:** bandingkan `chosen.length` dengan `dto.addEmployeeIds.length` dan lempar error yang menyebut ID gagal; audit memakai jumlah aktual.

---

### APR-07 — `employeeIds`/`addEmployeeIds` tidak menolak duplikat (Medium)

**Rule:** `security-validate-all-input`
**Lokasi:** `dto/create-appraisal.dto.ts:25-28`, `dto/update-appraisal-employees.dto.ts:8-18`

`@IsArray() @IsUUID('all', { each: true })` menerima `['emp-1','emp-1']`. Di `create`, keduanya lolos `chosen.length === dto.employeeIds.length`, lalu `insertEmployees` memasukkan dua baris dengan `(appraisal_id, employee_id)` yang sama → `23505` (409 generik) alih-alih 400 yang jelas.

**Perbaikan:** tambahkan `@ArrayUnique()` pada kedua DTO (dan pertimbangkan `@ArrayNotEmpty()` untuk `addEmployeeIds` bila kosong tidak bermakna).

---

### APR-08 — Filter `department` bertipe string bebas (Medium)

**Rule:** `security-validate-all-input`
**Lokasi:** `dto/appraisal-query.dto.ts:13-16`, `appraisals.repository.ts:171`

```ts
@IsString() department?: string;
...
if (department) filters.push(eq(appraisals.departmentId, department));
```

`appraisals.department_id` bertipe `uuid`. Nilai seperti `?department=abc` diteruskan ke PostgreSQL dan memicu `22P02 invalid input syntax for type uuid` — tidak dipetakan filter, sehingga menjadi **500**, bukan 400.

**Perbaikan:** `@IsUUID()` pada `department` (konsisten dengan `employeeId` di modul lain).

---

### APR-09 — Kelayakan mensyaratkan kontrak berakhir di periode (Medium, **Perlu konfirmasi**)

**Rule:** `arch-single-responsibility`
**Lokasi:** `appraisals.repository.ts:46-90` (khususnya `:69-70`), `appraisals.service.ts:249-299`

```ts
gte(contracts.endDate, start),
lte(contracts.endDate, end),
```

Karyawan hanya dianggap eligible bila `contracts.end_date` berada di dalam periode appraisal. Karena `end_date` untuk kontrak `PERMANENT` bernilai `NULL`, `gte(NULL, ...)` tidak pernah benar → **karyawan kontrak permanen tidak pernah masuk appraisal** dan `dailyNoteSum` selalu `null` untuk mereka (join daily notes mensyaratkan `contract_end_date` tidak null).

Jika aturan bisnisnya memang "hanya kontrak yang berakhir di bulan itu", ini benar. Tetapi untuk sistem penilaian bulanan, mengecualikan seluruh karyawan tetap tampak tidak disengaja. **Perlu konfirmasi ke PRD.** Jika permanen harus ikut, gunakan `COALESCE(contracts.end_date, 'infinity'::date)` (seperti exclusion constraint kontrak) dan sesuaikan `dailyNoteSums` agar window tanpa akhir tetap dihitung.

---

### APR-10 — Audit rating tidak menyimpan nilai; komentar tidak diaudit (Medium)

**Rule:** `devops-use-logging` (kelengkapan audit)
**Lokasi:** `appraisals.service.ts:413-419`, `:405-411`

`APPRAISAL_RATINGS_SAVED` hanya mencatat `metadata: { ratings: n }`, dan perubahan `comment` sama sekali tidak diaudit. Untuk komponen yang menentukan skor akhir, tidak ada cara merekonstruksi siapa mengubah rating/komentar menjadi apa. Modul lain menyimpan `before`/`after`.

**Perbaikan:** simpan diff rating (per `appraisalEmployeeId`+`criterionId`) dan komentar pada `before`/`after` (atau tabel histori tersendiri). Pastikan nilainya tidak terlalu besar dengan membatasi ke yang berubah.

---

### APR-11 — Scheduler menelan error per departemen tanpa log (Medium)

**Rule:** `devops-use-logging`
**Lokasi:** `appraisals.service.ts:579-581`

```ts
} catch {
  failed += 1;
}
```

Detail kegagalan (departemen mana, error apa) hilang. `AppraisalSchedulerService` hanya mencatat ringkasan sukses/gagal dari `runScheduler`, sehingga investigasi produksi tidak mungkin dilakukan.

**Perbaikan:** `Logger.error` dengan `departmentId`, `period`, dan stack; sertakan daftar kegagalan pada hasil scheduler (bukan hanya angka) agar bisa ditampilkan/di-log.

---

### APR-12 — Test belum menyentuh alur kritikal (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `appraisals.service.spec.ts` (7 test), `appraisals.repository.spec.ts`, `appraisals.excel.spec.ts`, `appraisal.transitions.spec.ts`, `appraisal-score.spec.ts`

Yang sudah sangat baik: skor (mixed scale, pembulatan, missing rating), transisi (semua rule, ADMIN bypass, invalid jump), excel (termasuk sanitasi formula), lock `FOR UPDATE`, dan query daily note.

Yang belum:
- `transition`: rule tidak valid, komentar wajib, scope, precondition `hasEmployees`/`allRatingsFilled`, penulisan history,
- `saveRatings`: validasi kriteria/rentang, **kepemilikan komentar (APR-02)**, recompute skor,
- `updateEmployees`: ineligible (APR-06), re-add setelah remove (APR-03),
- `create`: eligibilitas, duplikat, criteria set ARCHIVED (APR-05),
- `runScheduler`: advisory lock, kegagalan satu departemen tidak merusak yang lain (APR-01).

---

### APR-13 — `create` tidak memverifikasi departemen aktif (Medium)

**Rule:** `security-validate-all-input`
**Lokasi:** `appraisals.service.ts:81-138`

`departmentId` hanya `@IsUUID()`. FK menangkap ID tidak ada, tetapi departemen yang sudah **soft-deleted** tetap valid secara FK dan masih dapat dipakai untuk membuat appraisal (selama ada karyawan di dalamnya menurut `findEligible`, yang juga tidak memfilter departemen terhapus).

**Perbaikan:** validasi `departments` ada, `notDeleted`, dan `isActive` sebelum membuat appraisal; kembalikan 400/404 dengan `errorCode`.

---

### APR-14 — `sanitize` excel disalin ke salinan keempat (Low)

**Rule:** `security-sanitize-output`, `arch-module-sharing`
**Lokasi:** `appraisals.excel.ts:28-30` vs `common/utils/excel.util.ts`

Sama seperti `employees.md` EMP-07 dan `contracts.md` CTR-08: salinan regex `^[=+\-@]` yang mewarisi kelemahan yang sama. Gunakan `sanitizeCell` bersama dan perketat di satu tempat.

---

### APR-15 — Audit update/hapus mencatat jumlah yang diminta, bukan aktual (Low)

**Rule:** `devops-use-logging`
**Lokasi:** `appraisals.service.ts:337-346` (`APPRAISAL_EMPLOYEES_UPDATED`), `:495-510`

Audit menulis `added/removed` dari panjang array request; `removeEmployees` dan `insertEmployees` tidak melaporkan jumlah baris terpengaruh. Jika ada yang gagal/terfilter, audit tidak sesuai. Kembalikan jumlah aktual dari repository dan simpan itu.

---

### APR-16 — Komentar transisi tidak dinormalisasi/dibatasi (Low)

**Rule:** `security-validate-all-input`
**Lokasi:** `dto/appraisal-transition.dto.ts:10-13`, `appraisals.service.ts:459-476`

Validasi hanya `dto.comment?.trim()` (untuk wajib-komentar), tetapi nilai asli disimpan (bisa mengandung spasi berlebih) dan tidak ada `@MaxLength()`. Komentar juga masuk `appraisal_status_history.comment` (`text`) tanpa batas. Tambahkan trim saat menyimpan dan batas panjang (mis. 2000 karakter) agar konsisten dengan UI.

---

### APR-17 — Count & list dijalankan berurutan, tanpa tiebreaker urutan (Low)

**Rule:** `perf-optimize-database`
**Lokasi:** `appraisals.repository.ts:165-211`

`rows` lalu `count` dijalankan berurutan (`:183` dan `:205`), dan `ORDER BY period DESC` tanpa kolom kedua. Beberapa appraisal dalam periode yang sama bisa berpindah posisi antar halaman. Tambahkan `asc(appraisals.id)` sebagai tiebreaker dan jalankan kedua query paralel atau pakai `COUNT(*) OVER ()`.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Transisi sebagai data** (`TRANSITIONS`) dengan role, scope, komentar wajib, dan precondition; diuji seluruh kombinasi termasuk ADMIN bypass dan larangan HR send back.
- **`calculateScore` murni** dan diuji (skala campuran, pembulatan 2 desimal, rating belum lengkap → `null`, tanpa kriteria → `null`).
- **`lockAppraisal` memakai `SELECT ... FOR UPDATE`** di dalam transaksi, sehingga transisi paralel tidak saling menimpa; diuji lewat kompilasi query.
- **Scheduler memakai `pg_try_advisory_xact_lock`** sehingga dua instance tidak menjalankan job bersamaan.
- **Snapshot karyawan + kontrak** (`appraisal_employees`) menjaga histori saat master data berubah; backfill migration 0014 menangani data lama.
- **Dedupe kontrak ganda** dalam satu periode memilih kontrak dengan akhir terbaru (diuji).
- **`findEligible` mengecualikan karyawan yang sudah ada di appraisal non-COMPLETE** pada periode yang sama (idempotensi scheduler).
- **Validasi rating** memeriksa kriteria milik set, kepemilikan `appraisalEmployeeId`, dan rentang `scaleMin..scaleMax`.
- **`dailyNoteSums`** memakai `jsonb_typeof = 'number'`, dibatasi kontrak/departemen/periode, dan diuji strukturnya.
- **Ekspor excel** menyertakan ringkasan + matriks karyawan×kriteria, sanitasi formula (diuji), dan audit ekspor.
- **Audit dalam transaksi** yang sama dengan perubahan status/rating.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | APR-02 | IDOR: komentar appraisal lain bisa ditimpa |
| 2 | APR-01 | Satu error DB membatalkan seluruh run scheduler |
| 3 | APR-03 | Alur hapus→tambah karyawan gagal di unique index |
| 4 | APR-05, APR-09 | Appraisal terpin ke set ARCHIVED / permanen tak pernah eligible |
| 5 | APR-04, APR-08 | Otorisasi multi-role & validasi query (500) |
| 6 | APR-06, APR-07 | Input diabaikan diam-diam / duplikat |
| 7 | APR-10 … APR-13 | Audit, logging, test, validasi departemen |
| 8 | APR-14 … APR-17 | Kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] APR-01 Transaksi per departemen (atau SAVEPOINT) di `runScheduler`
- [ ] APR-02 Validasi kepemilikan `comments` + filter `appraisal_id` di repository
- [ ] APR-03 Index parsial `uq_appraisal_employee` **atau** upsert saat re-add
- [ ] APR-04 Dukungan multi-role pada `findTransition`
- [ ] APR-05 Hanya criteria set ACTIVE untuk appraisal baru
- [ ] APR-06 Lempar error untuk ID tidak layak + audit jumlah aktual
- [ ] APR-07 `@ArrayUnique()` pada `employeeIds`/`addEmployeeIds`
- [ ] APR-08 `@IsUUID()` pada filter `department`
- [ ] APR-09 Konfirmasi eligibility kontrak PERMANENT (COALESCE infinity)
- [ ] APR-10 Audit diff rating & komentar
- [ ] APR-11 Log detail kegagalan scheduler
- [ ] APR-12 Tambah test transition/saveRatings/updateEmployees/scheduler
- [ ] APR-13 Validasi departemen aktif pada `create`
- [ ] APR-14 Pakai `sanitizeCell` bersama
- [ ] APR-15 Audit jumlah baris aktual
- [ ] APR-16 Trim + batas panjang komentar
- [ ] APR-17 Tiebreaker urutan + query paralel/window count
