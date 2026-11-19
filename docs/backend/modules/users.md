# Audit: Users (`src/users/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`security-*`, `error-*`, `test-*`, `perf-*`)
**File yang diperiksa (12):**
- `users.module.ts`, `users.controller.ts`, `users.service.ts`, `users.repository.ts`
- `dto/create-user.dto.ts`, `dto/update-user.dto.ts`, `dto/reset-password.dto.ts`, `dto/set-user-status.dto.ts`
- `enums/user-role.enum.ts`, `interfaces/user.interface.ts`
- `users.service.spec.ts`
- Rujukan: `auth/auth.service.ts`, `auth/auth.module.ts`, `auth/jwt.strategy.ts`, `common/permissions/permissions.ts`, `db/schema.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 2 | USR-01, USR-02 |
| Medium | 7 | USR-03 … USR-09 |
| Low | 3 | USR-10, USR-11, USR-12 |

Module ini sudah mengikuti pola yang benar: controller tipis, DTO dengan `class-validator`, repository didorong `DbExecutor` sehingga bisa ikut transaksi, audit ditulis dalam transaksi yang sama, `findAll` memakai satu query batch untuk departemen (bukan N+1), dan `password` tidak pernah masuk `baseSelect`/payload. Masalah utama ada di **siklus hidup akun istimewa** dan **revokasi sesi**.

---

## 2. Temuan & Perbaikan

### USR-01 — Bisa menghapus/menonaktifkan admin terakhir atau dirinya sendiri (High)

**Rule:** `security-use-guards`, `arch-single-responsibility`
**Lokasi:** `users.controller.ts:26`, `users.service.ts:82-145` (`update`), `:130-145` (`setStatus`), `:167-186` (`remove`)

Seluruh endpoint dilindungi `@Roles(UserRole.ADMIN)`, tetapi tidak ada aturan bisnis yang mencegah:

- ADMIN menghapus (soft delete) dirinya sendiri → sesi langsung tidak bisa mengakses apa pun setelah token berikutnya divalidasi (`JwtStrategy` menolak user terhapus),
- ADMIN menonaktifkan dirinya sendiri,
- ADMIN mengubah role admin terakhir menjadi non-ADMIN,
- ADMIN terakhir dihapus oleh admin lain.

Hasilnya sistem bisa terkunci tanpa jalur pemulihan lewat API (harus lewat DB/seed).

**Perbaikan:** sebelum `update`/`setStatus`/`remove`, hitung admin aktif yang tersisa:
```ts
const remainingAdmins = await this.usersRepository.countActiveAdmins();
if (wouldRemoveLastAdmin) {
  throw new ConflictException({
    message: 'Cannot remove the last active administrator',
    errorCode: 'USER_LAST_ADMIN',
  });
}
```
Untuk `remove` dan `setStatus(false)`, bandingkan `id` dengan `requestContext.getUser()?.userId` bila produk ingin melarang self-delete (keputusan produk — **Perlu konfirmasi**). Tambahkan test untuk keempat skenario.

---

### USR-02 — Reset password / hapus akun tidak mencabut refresh token (High)

**Rule:** `security-auth-jwt`
**Lokasi:** `users.service.ts:147-165` (`resetPassword`), `:167-186` (`remove`), `auth/auth.service.ts` (`refresh`), `auth/auth.module.ts:20`

`resetPassword` hanya mengganti hash password. Refresh token lama tetap tersimpan di `refresh_tokens` dan masih bisa dipakai; `AuthService.refresh` tidak memeriksa `isActive` maupun apakah password berubah, lalu menerbitkan access token baru. Artinya sesi penyerang yang memegang refresh token **tetap hidup** meskipun korban mengganti password. Hal yang sama terjadi saat akun di-soft-delete: token tidak dicabut (hanya tertolak di tahap berikutnya lewat `findById`).

**Perbaikan:** sediakan operasi `revokeAllForUser(userId, tx)` dan panggil pada `resetPassword`, `remove`, dan `setStatus(false)`.

Catatan arsitektur: `AuthModule` **tidak** mengekspor `AuthService`/`AuthRepository` (`auth.module.ts:20`), dan `AuthModule` mengimpor `UsersModule` — jadi `UsersModule` tidak boleh mengimpor `AuthModule` (akan circular). Opsi bersih:

1. Pindahkan `AuthRepository` ke module netral (mis. `SessionModule`) yang hanya bergantung pada `DbModule`, lalu diekspor ke Auth dan Users; atau
2. Tambahkan method di `UsersRepository` yang meng-update `refresh_tokens.revoked_at` untuk `user_id` (repository sudah memegang `DB_CONNECTION`), tanpa dependensi ke Auth.

Opsi 2 paling kecil dan tetap transaksional (`setStatus`/`remove` sudah punya `tx`).

---

### USR-03 — Kebijakan password terlalu lemah (Medium)

**Rule:** `security-validate-all-input`, `security-auth-jwt`
**Lokasi:** `dto/create-user.dto.ts:22-25`, `dto/reset-password.dto.ts:7-10`

```ts
@IsString()
@MinLength(6)
password!: string;
```

- Min 6 karakter terlalu pendek untuk akun admin.
- Tidak ada batas panjang. `bcrypt` hanya memakai 72 byte pertama; input lebih panjang diterima tanpa peringatan, sehingga dua password berbeda bisa menghasilkan hash yang sama.
- Tidak ada aturan kompleksitas (opsional, tapi minimal panjang + batas atas).

**Perbaikan:** `@MinLength(8)` (atau 12 untuk admin) dan `@MaxLength(72)`, plus pesan yang jelas. Konsistenkan dengan kebijakan di modul lain/auth (saat ini Auth hanya `MinLength(6)` juga — lihat `auth.md`).

---

### USR-04 — Cek username di luar transaksi (Medium)

**Rule:** `db-use-transactions`, `error-handle-async-errors`
**Lokasi:** `users.service.ts:41-47`, `users.repository.ts:67-74`

```ts
if (await this.usersRepository.existsByUsername(dto.username)) { throw ... }
...
const created = await this.dbService.transaction(async (tx) => { ... });
```

Dua request bersamaan dapat lolos pengecekan dan menabrak unique index `users.username`. Saat itu terjadi, error PostgreSQL `23505` dipetakan filter ke `409 UNIQUE_VIOLATION` dengan pesan generik, bukan `USER_USERNAME_ALREADY_EXISTS` — klien menerima bentuk error yang berbeda untuk kasus yang sama.

**Perbaikan:** tetap lakukan pre-check untuk pesan ramah, tetapi tangani `23505` pada `username` di service (catch → `ConflictException` dengan `errorCode` yang sama), atau pindahkan cek ke `INSERT ... ON CONFLICT DO NOTHING` dan periksa hasilnya di dalam transaksi.

---

### USR-05 — Username milik akun terhapus memblokir pemakaian ulang secara permanen (Medium, **Perlu konfirmasi**)

**Rule:** `db-use-migrations` (perilaku index)
**Lokasi:** `users.repository.ts:67-74`, `db/schema.ts:48`

`existsByUsername` tidak memfilter `notDeleted(users)`, sesuai dengan unique constraint `username` yang **tidak** parsial (berbeda dari `employees.employee_number`). Jadi setelah user di-soft-delete:

- `create` selalu menolak dengan "Username already exists" (termasuk untuk akun yang sudah tidak terlihat di daftar),
- FK `refresh_tokens`/audit tetap menunjuk baris lama.

Ini bisa disengaja (jejak audit tidak boleh punya dua pemilik username sama), tetapi perlu diputuskan. Jika username boleh dipakai ulang, ubah unique index menjadi parsial `WHERE deleted_at IS NULL` **dan** filter `existsByUsername`; jika tidak, dokumentasikan perilakunya di UI/PRD agar admin tidak bingung.

---

### USR-06 — `findAll` tanpa pagination/filter (Medium)

**Rule:** `api-use-dto-serialization`, `perf-optimize-database`
**Lokasi:** `users.controller.ts:31-35`, `users.service.ts:27-33`, `users.repository.ts:32-38`

Endpoint mengembalikan seluruh user beserta relasi employee tanpa batas. Saat ini jumlahnya kecil, tetapi `QueryDto` sudah tersedia dan dipakai modul lain; tanpa `limit`, respons akan membesar seiring pertumbuhan user (dan audit admin membuka daftar ini berulang kali).

**Perbaikan:** terima `QueryDto` (`page`, `limit`, `search`), tambahkan `LIMIT/OFFSET` dan hitung `total` untuk `paginated()`.

---

### USR-07 — `departmentIds` tidak di-dedupe; duplikat memicu pelanggaran primary key (Medium)

**Rule:** `security-validate-all-input`
**Lokasi:** `dto/create-user.dto.ts:36-41`, `dto/update-user.dto.ts:24-29`, `users.repository.ts:144-157`

`setDepartments` melakukan insert batch tanpa deduplikasi:

```ts
.values(departmentIds.map((departmentId) => ({ userId, departmentId })))
```

Body `departmentIds: ['dep-1', 'dep-1']` melanggar PK `(user_id, department_id)` → error `23505` → `409 UNIQUE_VIOLATION` dengan pesan yang tidak menjelaskan masalahnya. Selain itu, ID departemen yang tidak ada baru gagal di FK (`23503` → 400 generik).

**Perbaikan:** `@ArrayUnique()` pada DTO dan dedupe di service; validasi keberadaan departemen (soft-deleted) sebelum insert agar pesan error jelas.

---

### USR-08 — Relasi employee tidak memfilter yang sudah dihapus (Medium)

**Rule:** `db-avoid-n-plus-one` (korektness query), `arch-use-repository-pattern`
**Lokasi:** `users.repository.ts:32-48` (`findAll`/`findById`), `:50-65` (`findByUsernameForAuth`)

`leftJoin(employees, eq(users.employeeId, employees.id))` tanpa `notDeleted(employees)`. Jika karyawan di-soft-delete, daftar user masih menampilkan nama/nomor karyawan tersebut, dan `findByUsernameForAuth` masih mengembalikan `employeeNumber` untuk audit login. Bisa jadi memang diinginkan untuk histori, tetapi berbeda dari perilaku repository lain yang selalu memfilter.

**Perbaikan:** tentukan kebijakan. Untuk endpoint manajemen user, filter `notDeleted(employees)` lebih konsisten; untuk audit login, pertahankan nilai historis tetapi beri komentar eksplisit.

---

### USR-09 — Test hanya mencakup diff audit (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `users.service.spec.ts:45-136`

Test yang ada bagus untuk `changedFields`/`auditState` (termasuk "never stores password material"), tetapi tidak mencakup:
- `create` → hash password, transaksi, audit, `departmentIds` tersimpan,
- `setStatus` → audit `USER_ACTIVATED`/`USER_DEACTIVATED`,
- `resetPassword` → hash baru + revokasi sesi (setelah USR-02),
- `remove` → soft delete + audit,
- `findOne` → 404 saat tidak ada,
- aturan admin terakhir (setelah USR-01),
- duplikat `departmentIds` (setelah USR-07).

---

### USR-10 — Audit `create` tidak mencatat departemen (Low)

**Rule:** `devops-use-logging` (kelengkapan audit)
**Lokasi:** `users.service.ts:66-73`

`USER_CREATED` hanya menulis `{ username, role }`, padahal `departmentIds` ikut ditulis pada request. `USER_UPDATED` mencatatnya. Akibatnya rekonstruksi "siapa punya akses departemen apa" dari audit tidak lengkap untuk pembuatan akun.

**Perbaikan:** tambahkan `departmentIds: [...(dto.departmentIds ?? [])].sort()` ke `after`.

---

### USR-11 — File re-export tipis (Low)

**Lokasi:** `enums/user-role.enum.ts:1`, `interfaces/user.interface.ts:1`

Keduanya hanya meneruskan simbol dari `@appraisal/types`. Tidak salah, tetapi menambah lapisan yang harus dirawat; impor langsung dari paket bersama lebih sederhana. Jika tujuannya menjaga jalur impor lokal, beri komentar alasannya.

---

### USR-12 — Username tidak dinormalisasi (Low)

**Rule:** `security-validate-all-input`
**Lokasi:** `dto/create-user.dto.ts:18-21`, `users.service.ts:41-47`

Tidak ada `@Transform(({ value }) => value.trim())` atau penanganan case. `" admin"` dan `"admin"` dianggap username berbeda (unique bersifat case-sensitive). Bisa membingungkan admin dan audit.

**Perbaikan:** trim (dan putuskan apakah case-insensitive) sebelum cek/insert, baik di DTO maupun di query `findByUsernameForAuth` agar konsisten.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Controller tipis**: tidak ada logika bisnis, hanya delegasi + `ParseUUIDPipe`.
- **DTO memakai tipe bersama** (`implements CreateUserRequest`, dst.) sehingga kontrak frontend–backend terikat.
- **Repository menerima `DbExecutor`** (`Database | Transaction`) — semua operasi bisa ikut transaksi tanpa cast.
- **Audit dalam transaksi yang sama** dengan perubahan data (`create`, `update`, `setStatus`, `resetPassword`, `remove`).
- **Tidak ada kebocoran password**: `baseSelect` tidak mengambil `password`, dan audit tidak memuat materi password (diuji).
- **`findAll` menghindari N+1** dengan satu query `departmentsByUserIds` untuk seluruh user.
- **Soft delete konsisten** (`isDeleted` + `deletedAt` ditulis bersama, filter `notDeleted`).
- **`changedFields` membandingkan array departemen setelah di-sort** sehingga reordering tidak menghasilkan entri audit palsu (diuji).
- **`bcrypt` cost 10** konsisten dengan Auth.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | USR-01 | Lockout admin = sistem tidak bisa dikelola |
| 2 | USR-02 | Sesi penyerang bertahan setelah reset password |
| 3 | USR-03 | Kebijakan password lemah & batas bcrypt |
| 4 | USR-07, USR-04 | Input duplikat & race condition menghasilkan error membingungkan |
| 5 | USR-06, USR-08 | Kinerja & konsistensi data |
| 6 | USR-09 | Test untuk alur utama |
| 7 | USR-05, USR-10, USR-11, USR-12 | Kebijakan & kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] USR-01 Cegah penghapusan/penonaktifan admin terakhir (+ test)
- [ ] USR-02 Revokasi refresh token pada reset password, delete, dan deaktivasi
- [ ] USR-03 `@MinLength(8)` + `@MaxLength(72)` (selaraskan dengan Auth)
- [ ] USR-04 Tangani `23505` username di dalam transaksi
- [ ] USR-05 Putuskan kebijakan username bekas akun terhapus
- [ ] USR-06 Pagination + `search` memakai `QueryDto`
- [ ] USR-07 `@ArrayUnique()` + validasi departemen + dedupe
- [ ] USR-08 Filter `notDeleted(employees)` atau dokumentasikan pengecualian
- [ ] USR-09 Tambah spec untuk create/status/reset/remove
- [ ] USR-10 Catat `departmentIds` pada audit `USER_CREATED`
- [ ] USR-11 (opsional) Hapus file re-export tipis
- [ ] USR-12 Normalisasi username (trim, kebijakan case)
