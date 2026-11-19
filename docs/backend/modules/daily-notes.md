# Audit: Daily Notes (`src/daily-notes/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`security-*`, `db-*`, `api-*`, `test-*`)
**File yang diperiksa (12):**
- `daily-notes.module.ts`, `daily-notes.controller.ts`, `daily-notes.service.ts`, `daily-notes.repository.ts`
- `daily-note.validation.ts`
- `dto/create-daily-note.dto.ts`, `dto/update-daily-note.dto.ts`, `dto/daily-note-query.dto.ts`
- `interfaces/daily-note.interface.ts`
- `daily-note.validation.spec.ts`, `daily-notes.repository.spec.ts`, `daily-notes.service.spec.ts`
- Rujukan: `db/schema.ts` (`dailyNotes`, `dailyNoteValues`), `drizzle/0005_daily_note_dynamic_form.sql`, `common/scope/scope.service.ts`, `criteria/criteria.service.ts`, `common/utils/field-validation.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | DN-01 |
| Medium | 7 | DN-02 … DN-08 |
| Low | 4 | DN-09 … DN-12 |

Struktur scope-nya rapi dan berlapis: controller dibatasi `HEAD_DEPARTMENT`/`SUPERVISOR` (ADMIN lolos lewat bypass guard), `resolveScope` menerjemahkan role menjadi `all`/`employee`/`department`, dan scope juga diterapkan ke `accessibleEmployees`, create, detail, update, dan delete. Validasi form dinamis dipisahkan sebagai fungsi murni dan diuji menyeluruh. **Tetapi alur update tampaknya tidak bisa berhasil** karena kombinasi soft-delete nilai lama dengan unique index yang tidak parsial.

---

## 2. Temuan & Perbaikan

### DN-01 — `update` selalu gagal karena unique index `(note_id, field_id)` tidak parsial (High)

**Rule:** `db-use-transactions`, `db-avoid-n-plus-one` (korektness)
**Lokasi:** `daily-notes.repository.ts:192-207` (`replaceValues`), `db/schema.ts:360-362`, `drizzle/0005_daily_note_dynamic_form.sql` (index `uq_daily_note_value_field`)

`replaceValues` melakukan:

```ts
// 1. soft delete semua nilai lama
await executor.update(dailyNoteValues)
  .set({ isDeleted: true, deletedAt: new Date() })
  .where(and(eq(dailyNoteValues.noteId, noteId), notDeleted(dailyNoteValues)));

// 2. insert nilai baru
await this.insertValues(rows, executor);
```

Namun index:

```ts
uniqueIndex('uq_daily_note_value_field').on(table.noteId, table.fieldId) // tanpa WHERE deleted_at IS NULL
```

Baris lama tetap ada (hanya ditandai terhapus), sehingga insert baris baru dengan `(note_id, field_id)` yang sama melanggar unique constraint (`23505`). Karena `update` mengganti **seluruh** nilai, setiap field yang sudah ada pada catatan akan bentrok. Hasilnya endpoint `PATCH /daily-notes/:id` mengembalikan 409 `UNIQUE_VIOLATION` (atau 500 tergantung jalur) dan perubahan tidak pernah tersimpan.

**Perbaikan (pilih satu):**
1. Ubah index menjadi parsial, konsisten dengan tabel soft-deletable lain:
   ```sql
   DROP INDEX uq_daily_note_value_field;
   CREATE UNIQUE INDEX uq_daily_note_value_field
     ON daily_note_values (note_id, field_id)
     WHERE deleted_at IS NULL;
   ```
   (tambahkan migrasi; jangan edit migrasi lama).
2. Atau ubah `replaceValues` menjadi upsert (`ON CONFLICT (note_id, field_id) DO UPDATE SET value = ..., is_deleted = false, deleted_at = NULL`), sehingga tidak pernah ada dua baris untuk pasangan yang sama.

Opsi 1 paling konsisten dengan pola proyek (`criteria_fields` memakai `WHERE is_deleted = false`). Setelah itu tambahkan test integrasi untuk update (repo test sekarang hanya menguji filter SQL).

---

### DN-02 — Audit tidak menyimpan nilai catatan (Medium)

**Rule:** `devops-use-logging` (kelengkapan audit), `arch-single-responsibility`
**Lokasi:** `daily-notes.service.ts:160-183` (create), `:211-219` (update), `:232-239` (remove)

Audit hanya mencatat `{ employeeId, departmentId, recordDate }` (create) atau `{ employeeId, recordDate }` (update/delete). Isi catatan — bagian paling penting untuk investigasi (mis. nilai yang diubah supervisor) — tidak tersimpan sebagai `before`/`after`. Modul lain (Employees, Contracts, Criteria) menyimpan snapshot penuh.

**Perbaikan:** simpan `values` (fieldId → value) pada `before`/`after`. Jika khawatir ukuran, simpan hanya field yang berubah (pola `changedFields` di `users.service.ts`). Masking/sanitasi sudah ditangani `AuditService`.

---

### DN-03 — Scope ditentukan hanya dari `user.roles[0]` (Medium)

**Rule:** `security-use-guards`
**Lokasi:** `daily-notes.service.ts:250-271`

```ts
const role = user.roles[0];
if (role === UserRole.ADMIN) return { by: 'all' };
if (role === UserRole.SUPERVISOR) { ... }
if (role === UserRole.HEAD_DEPARTMENT) { ... }
throw new ForbiddenException();
```

Sama seperti `common.md` CMM-02 dan `scope.service.ts`: user dengan lebih dari satu role (mis. `['HEAD_DEPARTMENT','SUPERVISOR']`) hanya memakai role pertama. Saat ini efeknya **menyempitkan** akses (tidak bocor), tetapi hasilnya bergantung pada urutan data dan bisa berbeda dari `ScopeService` yang dipakai modul lain.

**Perbaikan:** tentukan prioritas role yang eksplisit (mis. `ADMIN > HEAD_DEPARTMENT > SUPERVISOR`) dengan `user.roles.includes(...)`, atau satukan logika ke satu fungsi otorisasi bersama.

---

### DN-04 — `create` hanya menolak criteria set `DRAFT`, menerima `ARCHIVED` (Medium, **Perlu konfirmasi**)

**Rule:** `arch-single-responsibility`
**Lokasi:** `daily-notes.service.ts:124-137`

```ts
if (set.status === 'DRAFT') { throw ... }
if (set.departmentId !== null && set.departmentId !== employee.departmentId) { ... }
```

Criteria set `ARCHIVED` lolos, padahal status itu menandai versi yang sudah tidak dipakai untuk penilaian/catatan baru (lihat `criteria` docs). Catatan baru kemudian terkunci ke versi yang sudah diarsipkan.

**Perbaikan:** terima hanya `status === 'ACTIVE'` untuk catatan baru (tetap izinkan `update` pada catatan yang sudah terpin ke set yang kini ARCHIVED). Konfirmasi apakah `ARCHIVED` memang harus ditolak.

---

### DN-05 — Test hanya mencakup scope ADMIN (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `daily-notes.service.spec.ts` (2 test), `daily-notes.repository.spec.ts`, `daily-note.validation.spec.ts`

Yang sudah baik: `validateNoteValues` diuji untuk semua jenis input penting, dan `buildDailyNoteFilters` diuji termasuk `1 = 0` untuk scope kosong.

Yang belum:
- `resolveScope` untuk `SUPERVISOR` (subordinat) dan `HEAD_DEPARTMENT` (departemen),
- penolakan role lain,
- `create`: employee di luar scope (404), employee tanpa departemen (422), criteria set DRAFT/ARCHIVED/berbeda departemen,
- `update`: validasi nilai + pemanggilan `replaceValues` (dan bug DN-01),
- `remove` + audit,
- `accessibleEmployees` untuk supervisor tanpa `employeeId` → 403.

---

### DN-06 — `accessibleEmployees` tanpa batas/paginasi (Medium)

**Rule:** `perf-optimize-database`, `api-use-dto-serialization`
**Lokasi:** `daily-notes.service.ts:87-105`, `daily-notes.repository.ts:103-124`

Untuk ADMIN, `allEmployees()` mengembalikan **seluruh** karyawan (tanpa limit), lalu endpoint mengirimkannya sekaligus. Untuk HEAD_DEPARTMENT juga seluruh karyawan di departemennya. Di organisasi besar, ini payload besar dan memperlambat halaman form.

**Perbaikan:** terima `search`/`limit` (mis. 50) atau gunakan autocomplete server-side. Minimal tambahkan `LIMIT` dan filter nama/nomor.

---

### DN-07 — Join detail/list tanpa filter soft delete (Medium)

**Rule:** `arch-use-repository-pattern` (korektness)
**Lokasi:** `daily-notes.repository.ts:139-171` (`findNoteDetail`), `:220-248` (`listNotes`)

`leftJoin(employees, ...)`, `leftJoin(departments, ...)`, `leftJoin(criteriaSets, ...)` tanpa `notDeleted`. Karyawan/departemen yang sudah dihapus tetap menampilkan nama di daftar catatan (join tidak menghasilkan `null`). Seperti `employees.md` EMP-04, ini konsisten dengan fakta bahwa data soft-deleted masih memiliki baris.

**Perbaikan:** tentukan kebijakan. Untuk catatan historis, menampilkan nama lama mungkin diinginkan (snapshot), tetapi sebaiknya disimpan sebagai kolom snapshot seperti `appraisal_employees` agar tidak bergantung pada baris master yang mungkin berubah namanya.

---

### DN-08 — Count query selalu join employees (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `daily-notes.repository.ts:249-257`

Count memakai `leftJoin(employees)` hanya karena filter `search` menyentuh kolom employee; saat `search` kosong join tidak diperlukan. Selain itu, data query dan count dijalankan berurutan (bukan `Promise.all`).

**Perbaikan:** tambahkan join secara kondisional; jalankan keduanya paralel atau pakai `COUNT(*) OVER ()`.

---

### DN-09 — `resolveScope` melempar `ForbiddenException` tanpa pesan/errorCode (Low)

**Rule:** `error-throw-http-exceptions`
**Lokasi:** `daily-notes.service.ts:270`

`throw new ForbiddenException()` menghasilkan `code: 'FORBIDDEN'` generik tanpa penjelasan. Modul lain memakai `{ message, errorCode }` sehingga frontend bisa menampilkan pesan spesifik (mis. `DAILY_NOTE_ROLE_NOT_ALLOWED`).

**Perbaikan:** beri pesan + `errorCode`; pertimbangkan juga `currentUser()` (`:245-248`).

---

### DN-10 — `accessibleEmployees` menanyakan ulang subordinat alih-alih memakai scope (Low)

**Rule:** `arch-single-responsibility`
**Lokasi:** `daily-notes.service.ts:91-100`

`resolveScope` untuk SUPERVISOR sudah memanggil `subordinateEmployees` dan menyimpan `scope.ids`, tetapi `accessibleEmployees` memanggil `subordinateEmployees(user.employeeId)` sekali lagi, sehingga satu request melakukan query subordinat dua kali.

**Perbaikan:** gunakan `scope.ids` lalu ambil detail employee dengan satu query `inArray` (atau kembalikan `scope` beserta rows).

---

### DN-11 — `recordDate` tidak dibatasi terhadap masa depan / tanggal bergabung (Low, **Perlu konfirmasi**)

**Rule:** `security-validate-all-input`
**Lokasi:** `daily-notes.service.ts:121-123`, `dto/create-daily-note.dto.ts:34-38`

`period` diturunkan dari string `recordDate.slice(0, 7) + '-01'`, tanpa memeriksa apakah tanggal berada di masa depan atau sebelum `employee.joinDate`. Catatan harian untuk tanggal yang belum terjadi bisa dibuat (dan langsung ikut perhitungan).

**Perbaikan:** jika aturan bisnis melarang, tolak `recordDate > hari ini` dan `recordDate < joinDate` dengan `errorCode` yang jelas. Konfirmasi ke PRD.

---

### DN-12 — Nilai catatan yang dihapus tidak ikut ditandai (Low)

**Rule:** `db-use-transactions`
**Lokasi:** `daily-notes.repository.ts:209-218` (`softDeleteNote`)

Menghapus catatan hanya menandai `daily_notes`; baris `daily_note_values` tetap `is_deleted = false`. Tidak bocor karena semua query nilai dimulai dari catatan yang masih aktif, tetapi baris yatim terus bertambah (dan index `(note_id, field_id)` tetap memblokir pola update — lihat DN-01).

**Perbaikan:** soft-delete nilai dalam transaksi yang sama (`update daily_note_values set is_deleted=true ... where note_id = ...`), sehingga snapshot konsisten dengan induknya.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Scope berlapis** (`all`/`employee`/`department`) diterapkan konsisten pada list, detail, create, update, delete, dan `accessibleEmployees`; out-of-scope → 404 agar keberadaan data tidak bocor.
- **`buildDailyNoteFilters` diuji lewat kompilasi SQL**, termasuk `1 = 0` untuk scope kosong dan pemastian `search` tidak menambah join saat kosong.
- **Validasi form dinamis dipisahkan sebagai fungsi murni** (`validateNoteValues`) dan diuji untuk seluruh tipe input, required, aturan min/max, dan opsi.
- **`DailyNoteValueDto.value` memakai `@Allow()`** lalu divalidasi terhadap definisi field — pendekatan tepat untuk form dinamis.
- **Kriteria set dipilih eksplisit** oleh user dan disematkan ke catatan (`criteriaSetId`), bukan "yang aktif saat itu".
- **`createNote` memakai `onConflictDoNothing`** lalu 409 `DAILY_NOTE_ALREADY_EXISTS` — menangani race dua request pada tanggal yang sama.
- **Nilai diambil batch** (`valuesForNotes` dengan `inArray`) lalu dikelompokkan di service — menghindari N+1 list.
- **Audit dalam transaksi** yang sama dengan perubahan data.
- **`DailyNoteQueryDto implements DailyNoteQuery`** dari paket bersama (berbeda dari Contracts/Employees yang tidak).

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | DN-01 | Update catatan tidak bisa berhasil (data tidak tersimpan) |
| 2 | DN-02 | Audit tidak merekam isi perubahan |
| 3 | DN-03 | Konsistensi scope dengan modul lain |
| 4 | DN-04 | Catatan baru bisa terpin ke versi ARCHIVED |
| 5 | DN-05 | Test alur utama & scope lain |
| 6 | DN-06, DN-08 | Payload besar & query count |
| 7 | DN-07, DN-09 … DN-12 | Korektness & kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] DN-01 Jadikan `uq_daily_note_value_field` parsial **atau** pakai upsert di `replaceValues` + migrasi
- [ ] DN-02 Simpan `values` (atau diff) pada audit create/update/delete
- [ ] DN-03 Prioritas role eksplisit / satu sumber logika scope
- [ ] DN-04 Tolak criteria set `ARCHIVED` untuk catatan baru (konfirmasi)
- [ ] DN-05 Tambah test scope supervisor/department, create/update/remove, accessibleEmployees
- [ ] DN-06 Batasi/paginasi `accessibleEmployees` (atau autocomplete)
- [ ] DN-07 Putuskan kebijakan join soft-deleted (atau snapshot nama)
- [ ] DN-08 Join `employees` kondisional + paralelkan/count window
- [ ] DN-09 Pesan & `errorCode` pada 403/404
- [ ] DN-10 Pakai `scope.ids` di `accessibleEmployees`
- [ ] DN-11 Konfirmasi aturan `recordDate` (masa depan / joinDate)
- [ ] DN-12 Soft-delete nilai bersama catatan
