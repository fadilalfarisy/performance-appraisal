# Audit: Common (`src/common/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices`
**File yang diperiksa (20):**

| Kelompok | File |
|----------|------|
| Context | `context/context.module.ts`, `context/request-context.service.ts` |
| Decorators | `decorators/current-user.decorator.ts`, `decorators/public.decorator.ts`, `decorators/response.decorator.ts`, `decorators/roles.decorator.ts` |
| Exceptions | `exceptions/custom.exceptions.ts` |
| Filters | `filters/http-exception.filter.ts`, `filters/http-exception.filter.spec.ts` |
| Guards | `guards/jwt-auth.guard.ts`, `guards/roles.guard.ts` |
| Interceptors | `interceptors/response.interceptor.ts` |
| Permissions | `permissions/permissions.ts`, `permissions/permissions.spec.ts` |
| Query | `query/query.dto.ts`, `query/query.dto.spec.ts` |
| Scope | `scope/scope.module.ts`, `scope/scope.service.ts` |
| Utils | `utils/audit-actor.util.ts`, `utils/audit-actor.util.spec.ts`, `utils/excel.util.ts`, `utils/field-validation.ts`, `utils/period.util.ts`, `utils/string.util.ts` |

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 2 | CMM-01, CMM-02 |
| Medium | 6 | CMM-03, CMM-04, CMM-05, CMM-06, CMM-07, CMM-08 |
| Low | 6 | CMM-09, CMM-10, CMM-11, CMM-12, CMM-13, CMM-14 |

Common adalah fondasi lintas-module: guard global, filter error, interceptor response, matriks izin, scope departemen, dan util. Struktur dan DI-nya rapi (constructor injection, module global untuk context/scope, util murni tanpa efek samping). Masalah terbesar bukan kerusakan, melainkan **otorisasi yang punya dua sumber kebenaran** dan **bentuk response sukses vs error yang berbeda**.

---

## 2. Temuan & Perbaikan

### CMM-01 — Matriks izin tidak dipakai; otorisasi aktual ada di `@Roles` literal (High)

**Rule:** `security-use-guards`, `arch-single-responsibility`
**Lokasi:** `permissions/permissions.ts:30` (`PERMISSIONS`), `:47` (`can`), `roles.guard.ts:10-24`, `roles.decorator.ts:3`

Komentar di `permissions.ts` menyatakan:

> "Controllers and services read this instead of scattering role checks through their code."

Faktanya `can()` dan `PERMISSIONS` **hanya** dipakai oleh `permissions.spec.ts`. Seluruh controller memakai `@Roles(UserRole.ADMIN, UserRole.HR)` literal (mis. `employees.controller.ts:49-112`, `contracts.controller.ts:52-119`, `criteria.controller.ts:63-88`), dan `RolesGuard` hanya membaca metadata itu. Artinya:
- matriks izin tidak menegakkan apa pun — mengubah `PERMISSIONS` tidak mengubah perilaku aplikasi,
- aturan izin tersebar di 40+ titik decorator,
- bypass ADMIN ditulis dua kali (`roles.guard.ts:18` dan `permissions.ts:52`),
- test `permissions.spec.ts` memberi rasa aman palsu: ia menguji fungsi yang tidak dieksekusi di produksi.

**Perbaikan (pilih satu arah, jangan dua-duanya):**
1. **Jadikan matriks sebagai sumber utama** — buat decorator `@RequirePermission('employee:manage')` + guard yang memanggil `can(role, permission)`, lalu ganti `@Roles(...)` di controller. Ini yang dimaksud komentar file.
2. **Hapus matriks** bila `@Roles` literal memang keputusan final, dan pindahkan ADMIN bypass ke satu helper yang dipakai guard.

Opsi 1 lebih sesuai PRD 5.8 dan lebih mudah diaudit. Catat bahwa perubahan ini menyentuh hampir semua controller — sebaiknya satu tiket tersendiri.

---

### CMM-02 — Scope departemen hanya melihat role pertama (High)

**Rule:** `security-use-guards`, `di-interface-segregation`
**Lokasi:** `scope/scope.service.ts:19-22`

```ts
const role = user.roles[0];
if (role && GLOBAL_SCOPE_ROLES.includes(role as never)) return 'ALL';
```

`AuthenticatedUser.roles` adalah array. Bila user memiliki lebih dari satu role (mis. `['HEAD_DEPARTMENT', 'HR']`) dan role global bukan elemen pertama, user diperlakukan sebagai scoped — semua data di luar departemennya menjadi 404 (`assertDepartmentAccess`). Ini kegagalan otorisasi yang bergantung pada urutan data, bukan pada kebijakan.

**Perbaikan:**
```ts
if (user.roles.some((role) => GLOBAL_SCOPE_ROLES.includes(role))) return 'ALL';
```
Sekaligus hapus cast `as never` (lihat CMM-12). Tambahkan unit test untuk user multi-role — saat ini `scope.service.ts` tidak punya spec sama sekali.

---

### CMM-03 — Bentuk response sukses dan error tidak seragam (Medium)

**Rule:** `api-use-dto-serialization`, `error-use-exception-filters`
**Lokasi:** `interceptors/response.interceptor.ts:32-36`, `filters/http-exception.filter.ts:24-26`

Sukses:
```json
{ "status": 200, "message": "...", "data": ..., "meta": ... }
```

Error (dari filter):
```json
{ "statusCode": 409, "code": "UNIQUE_VIOLATION", "message": "...", "details": {} }
```

Perbedaan `status` vs `statusCode`, `data` vs `details`, dan tidak adanya `meta` di error memaksa setiap consumer menangani dua kontrak. Ini juga menyulitkan tipe bersama di `@appraisal/types` (satu `ApiResponse`, bukan dua bentuk).

**Perbaikan:** tentukan satu envelope, mis.:
```json
{ "status": 409, "code": "UNIQUE_VIOLATION", "message": "...", "data": null, "errors": [] }
```
lalu selaraskan filter dan interceptor. **Perlu konfirmasi** karena frontend mungkin sudah bergantung pada `statusCode`/`details`; perubahan ini breaking dan harus dikoordinasikan dengan `apps/frontend`.

---

### CMM-04 — Interceptor membuang payload non-`ApiResponse` (Medium)

**Rule:** `api-use-interceptors`, `api-use-dto-serialization`
**Lokasi:** `interceptors/response.interceptor.ts:32-36`

```ts
data: data?.data !== undefined ? data.data : null,
meta: data?.meta !== undefined ? data.meta : null,
```

Handler yang mengembalikan nilai langsung (`string`, array, entity) kehilangan isinya — contoh nyata `AppController.getHello()` (lihat `app.md` APP-04 → `data: null`). Kontrak "handler wajib mengembalikan `{ data, meta }`" tidak ditegakkan tipe dan tidak didokumentasikan di signature interceptor.

**Perbaikan:** buat interceptor defensif:
```ts
const isEnvelope = typeof data === 'object' && data !== null && 'data' in data;
data: isEnvelope ? (data as ApiResponse<unknown>).data : (data ?? null),
```
atau wajibkan semua controller memakai `ok()`/`paginated()` dan tambahkan lint/test yang menangkap handler yang melanggar.

---

### CMM-05 — `@Roles` tidak type-safe dan key metadata berupa magic string (Medium)

**Rule:** `di-use-interfaces-tokens`, `arch-module-sharing`
**Lokasi:** `decorators/roles.decorator.ts:3`, `guards/roles.guard.ts:10`

```ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

- `string[]` membuang `UserRole`; typo seperti `'ADMN'` lolos compiler dan menghasilkan 403 yang membingungkan.
- Key `'roles'` ditulis literal di decorator **dan** guard — dua tempat yang bisa berbeda tanpa error.
- ADMIN bypass ada di guard (bukan di satu helper izin), sehingga aturan "ADMIN boleh semua" tersebar.

**Perbaikan:**
```ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```
lalu guard memakai `ROLES_KEY` dan `ReadonlyArray<UserRole>`.

---

### CMM-06 — Beberapa komponen shared tanpa test (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `scope/scope.service.ts`, `guards/roles.guard.ts`, `guards/jwt-auth.guard.ts`, `interceptors/response.interceptor.ts`, `utils/field-validation.ts`, `utils/period.util.ts`, `utils/excel.util.ts`, `utils/string.util.ts`

Sudah ada spec yang baik untuk `http-exception.filter`, `permissions`, `query.dto`, dan `audit-actor`. Yang belum: komponen otorisasi (roles guard, scope), bentuk response (interceptor), dan util yang dipakai lintas module (field-validation, period).

Prioritas test mengikuti risiko:
1. `scope.service` — multi-role, `ALL` vs daftar departemen, 404 pada out-of-scope (terkait CMM-02).
2. `roles.guard` — tanpa metadata, role cocok, ADMIN bypass, user tanpa roles.
3. `response.interceptor` — payload `{data,meta}`, payload primitif, `@HttpCode` override.
4. `period.util` — peralihan Desember→Januari, akhir bulan, input tidak valid.
5. `field-validation` — semua `FieldInputType`, nilai kosong, pattern invalid.

---

### CMM-07 — `sanitizeCell` bisa dilewati dengan whitespace/tab (Medium)

**Rule:** `security-sanitize-output`
**Lokasi:** `utils/excel.util.ts:5-7`

```ts
return /^[=+\-@]/.test(value) ? `'${value}` : value;
```

Excel menganggap sel berisi `\t=cmd...` atau ` =SUM(...)` masih berpotensi dieksekusi/diinterpretasikan sebagai formula pada sebagian versi/format. Karakter `\r`, `\n`, dan `|` (DDE lama) juga tidak ditangani. Saat ini hanya dipakai oleh `audit.excel.ts`, tetapi util ini akan dipakai lebih luas saat modul lain mengekspor Excel.

**Perbaikan:** periksa karakter berbahaya setelah trim di depan:
```ts
export function sanitizeCell(value: string): string {
  const needsPrefix = /^[=+\-@\t\r|]/.test(value.trimStart());
  return needsPrefix ? `'${value}` : value;
}
```
Tambahkan test untuk `=`, `+`, `-`, `@`, `\t=`, ` =`.

---

### CMM-08 — Validasi field: regex dari config dikompilasi per panggilan & tanggal tidak dicek validitasnya (Medium)

**Rule:** `security-validate-all-input`, `security-sanitize-output`
**Lokasi:** `utils/field-validation.ts:60-79`

```ts
if (rules?.pattern) {
  try {
    if (!new RegExp(rules.pattern).test(value)) return 'has an invalid format';
  } catch { ... }
}
```

- Pattern berasal dari set kriteria yang dapat dikonfigurasi. `new RegExp` dijalankan **setiap** validasi nilai. Pattern dengan catastrophic backtracking berpotensi membebani event loop (ReDoS), dan panjang pattern tidak dibatasi.
- `DATE` hanya memeriksa format `YYYY-MM-DD`; `2026-02-31` atau `9999-99-99` lolos.

**Perbaikan:**
- Batasi panjang pattern (mis. ≤200 karakter) dan validasi/compile sekali saat set kriteria disimpan (simpan versi hasil compile atau minimal cache per pattern).
- Untuk tanggal, cocokkan format lalu cek `!Number.isNaN(Date.parse(value))` dan round-trip (`new Date(value).toISOString().slice(0,10) === value`).

Catatan: saat ini `rules.pattern` diisi oleh HR (bukan user publik), jadi risikonya terbatas — tetapi validasi ini juga dipakai untuk input penilaian, sehingga tetap layak diperketat.

---

### CMM-09 — Scope departemen di-query ulang berkali-kali (Low)

**Rule:** `perf-optimize-database`, `perf-use-caching`
**Lokasi:** `scope/scope.service.ts:33-40, 42-48`

`canAccessDepartment` selalu memanggil `getDepartmentScope` (satu query). Bila satu request memeriksa banyak departemen dalam loop, terjadi query berulang untuk data yang sama.

**Perbaikan:** cache hasil per request lewat `RequestContextService`/`ClsService`:

```ts
const cached = this.cls.get<DepartmentScope>('departmentScope');
if (cached) return cached;
```

Tidak perlu cache lintas request (scope bisa berubah saat role user diubah).

---

### CMM-10 — `ScopeService` mengakses DB langsung, melewati `DbService` (Low)

**Rule:** `arch-use-repository-pattern`
**Lokasi:** `scope/scope.service.ts:3-13`

Service ini menyuntik `DB_CONNECTION` dan mengimpor schema langsung, sementara module lain memakai `DbService`. Untuk query sederhana ini wajar, tetapi menambah titik akses DB di luar abstraksi yang sudah ada.

**Perbaikan:** gunakan `DbService.client` atau pindahkan query ke `users`/repository yang memang memiliki `user_departments`.

---

### CMM-11 — Kode mati: dua exception & satu util duplikat (Low)

**Rule:** `arch-single-responsibility` (kebersihan)
**Lokasi:** `exceptions/custom.exceptions.ts:3, 9`, `utils/string.util.ts:1`

- `DatabaseException` dan `ValidationException` tidak dipakai di mana pun (hanya `BusinessLogicException` yang dipakai; `HttpException` dipakai langsung untuk kasus lain). Dokumentasi lama di `apps/backend/docs/FLOW.md:485` juga mencatat hal ini.
- `capitalizeString` di backend tidak dipakai; versi identik ada di `apps/frontend/src/utils/stringUtils.ts:1` (duplikasi lintas app).

**Perbaikan:** hapus dua exception dan util backend yang tidak terpakai (atau pindahkan util ke `packages/` bila memang ingin dipakai dua app). Sesuai preferensi proyek: kode mati dihapus, bukan dibiarkan.

---

### CMM-12 — Cast `as never` mematikan type-check (Low)

**Rule:** `di-liskov-substitution` (tipe)
**Lokasi:** `scope/scope.service.ts:21`

```ts
GLOBAL_SCOPE_ROLES.includes(role as never)
```

`as never` menghindari error tipe alih-alih memperbaiki tipenya. Setelah CMM-02 diperbaiki, cast ini tidak diperlukan sama sekali.

---

### CMM-13 — `CurrentUser` mengembalikan nilai yang bisa `undefined` (Low)

**Rule:** `security-use-guards`
**Lokasi:** `decorators/current-user.decorator.ts:6-9`

```ts
export const CurrentUser = createParamDecorator(
  (_data, ctx): AuthenticatedUser => ctx.switchToHttp().getRequest().user,
);
```

Tipe menjanjikan `AuthenticatedUser`, tetapi pada route `@Public()` nilai ini `undefined`. Pemakai bisa crash saat mengakses `.userId`.

**Perbaikan:** lempar `UnauthorizedException` bila `request.user` kosong, atau ubah tipe menjadi `AuthenticatedUser | undefined` agar pemanggil dipaksa memeriksa. Opsi pertama lebih aman untuk decorator yang tujuannya mengambil user login.

---

### CMM-14 — Detail kecil pada DTO & util (Low)

**Rule:** `api-use-dto-serialization`, `security-validate-all-input`

- `query/query.dto.ts:28-32` — `search` tidak punya batas panjang (`@MaxLength`). Nilai sangat panjang diteruskan ke query `LIKE`, berpotensi membebani DB. Tambahkan mis. `@MaxLength(100)`.
- `utils/period.util.ts:13-18, 24-31` — `addMonths`, `periodStart`, `periodEnd` menerima string apa pun; input tidak valid menghasilkan `NaN-NaN-NaN` yang lolos ke query. Tambahkan guard format `^\d{4}-\d{2}-\d{2}$` di batas fungsi.
- `filters/http-exception.filter.ts` — error 4xx tidak dilog, dan log 5xx tidak menyertakan `requestId` (terkait `app.md` APP-05). Pertimbangkan menyertakan `requestId` di response error agar bisa dikorelasikan.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- `JwtAuthGuard` memakai `getAllAndOverride` untuk `@Public()` — perilaku handler menimpa class, sesuai standar Nest.
- `HttpExceptionFilter` menangani error PostgreSQL berlapis (`findDatabaseError` menelusuri `cause` hingga 4 level), termasuk `23P01` → 422 `CONTRACT_OVERLAP`.
- `RequestContextService` tipis dan hanya membungkus `ClsService` — mudah di-mock (dibuktikan `audit-actor.util.spec.ts`).
- `ScopeService.assertDepartmentAccess` sengaja memakai 404 untuk menyembunyikan keberadaan record — keputusan keamanan yang benar.
- `period.util` memakai `Date.UTC` secara konsisten sehingga tidak terpengaruh zona waktu server.
- `QueryDto` memakai `@Type(() => Number)` + `@Min/@Max`, dan `implements PaginationQuery` dari paket bersama.
- `sanitizeCell` sudah mencegah formula injection untuk kasus umum; tinggal diperketat.
- `auditActor` mengembalikan `null` saat tanpa user sehingga job terjadwal bisa memakai `actorType: 'SYSTEM'`.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | CMM-02 | Potensi kehilangan akses/scope salah untuk user multi-role |
| 2 | CMM-01 | Matriks izin menyesatkan; keputusan arsitektur perlu diambil |
| 3 | CMM-04 | Bug response yang sudah nyata pada `AppController` |
| 4 | CMM-03 | Kontrak API konsisten (perlu koordinasi frontend) |
| 5 | CMM-07, CMM-08 | Keamanan input/output |
| 6 | CMM-06 | Test untuk komponen otorisasi & response |
| 7 | CMM-05, CMM-09, CMM-10 | Kualitas & performa |
| 8 | CMM-11, CMM-12, CMM-13, CMM-14 | Kebersihan & detail |

---

## 5. Checklist tindak lanjut

- [ ] CMM-01 Putuskan: pakai matriks izin (`@RequirePermission`) atau hapus matriks
- [ ] CMM-02 `user.roles.some(...)` di `getDepartmentScope` + test multi-role
- [ ] CMM-03 Selaraskan envelope sukses/error (**perlu konfirmasi frontend**)
- [ ] CMM-04 Interceptor defensif untuk payload non-envelope
- [ ] CMM-05 `Roles` bertipe `UserRole` + konstanta `ROLES_KEY`
- [ ] CMM-06 Tambah spec: scope, roles guard, response interceptor, period, field-validation
- [ ] CMM-07 Perketat `sanitizeCell` (whitespace/tab/`|`) + test
- [ ] CMM-08 Batasi & cache regex; validasi tanggal nyata
- [ ] CMM-09 Cache scope per request
- [ ] CMM-10 (opsional) Lewatkan akses DB via `DbService`/repository
- [ ] CMM-11 Hapus `DatabaseException`, `ValidationException`, `capitalizeString` backend
- [ ] CMM-12 Hapus cast `as never`
- [ ] CMM-13 `CurrentUser` melempar 401 bila tidak ada user (atau tipe opsional)
- [ ] CMM-14 `@MaxLength` pada `search`; guard format `period.util`
