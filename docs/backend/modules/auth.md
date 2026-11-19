# Audit: Auth (`src/auth/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`security-auth-jwt`, `security-use-guards`, `security-rate-limiting`, `error-*`, `test-*`)
**File yang diperiksa (9):**
- `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, `jwt.strategy.ts`, `auth-cookie.ts`
- `dto/signin.dto.ts`, `interfaces/auth-user.interface.ts`
- `auth.service.spec.ts` (407 baris)
- Rujukan: `users/users.repository.ts`, `db/schema.ts` (`refreshTokens`), `config/env.validation.ts`, `common/guards/jwt-auth.guard.ts`, `common/exceptions/*`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | AUTH-01 |
| Medium | 9 | AUTH-02 … AUTH-10 |
| Low | 3 | AUTH-11 … AUTH-13 |

Auth adalah module dengan kualitas test terbaik sejauh audit ini: rotasi refresh yang memang dihapus didokumentasikan dan diuji (termasuk concurrent refresh), audit login/logout ditulis dalam transaksi yang sama, kegagalan audit tidak mengubah respons, dan token disimpan sebagai hash. Temuan utama: **`refresh` menganggap sesi sah selama token belum dicabut, tanpa memeriksa status user** — kontras dengan komentar di kode dan bertentangan dengan kebijakan nonaktif/hapus.

---

## 2. Temuan & Perbaikan

### AUTH-01 — `refresh` tidak memeriksa keberadaan/nonaktifnya user (High)

**Rule:** `security-auth-jwt`, `security-use-guards`
**Lokasi:** `auth.service.ts:104-131` (khususnya `:118-129`), `users.repository.ts:40-48`, `jwt.strategy.ts:43-46`

```ts
const user = await this.usersRepository.findById(stored.userId);
const accessToken = await this.signAccessToken(
  stored.userId,
  user?.username ?? payload.username,
  user?.role ?? null,
);
```

`findById` memfilter soft-deleted, jadi `user` bisa `null` (akun dihapus) atau berstatus `isActive: false` (dinonaktifkan). Dalam kedua kasus, method tetap **menandatangani access token dan mengembalikan 200**. Padahal komentar tepat di atasnya berbunyi:

> "Revoked means revoked: logout, deactivation, and admin actions must not be undone by refreshing."

Kenyataannya deaktivasi **tidak** mencabut token (lihat `users.md` USR-02), jadi satu-satunya yang mencegah akses adalah `JwtStrategy.validate` di request berikutnya — yang lalu mengembalikan 401. Pola ini menghasilkan loop di klien: request → 401 → refresh (200, token tidak berguna) → retry → 401 → refresh … tanpa pernah keluar.

**Perbaikan:** di `refresh`, perlakukan user yang tidak ada/nonaktif sebagai sesi tidak valid:
```ts
const user = await this.usersRepository.findById(stored.userId);
if (!user || !user.isActive) {
  throw this.invalidRefreshToken();
}
```
(Sekaligus cabut token tersebut secara best-effort agar klien berhenti mengulang.) Tambahkan test: user `null`, `isActive: false`, dan `isActive: true`.

---

### AUTH-02 — Tidak ada pembersihan refresh token kedaluwarsa/dicabut (Medium)

**Rule:** `perf-optimize-database`, `db-use-migrations`
**Lokasi:** `db/schema.ts:64-80` (`refreshTokens`), tidak ada job pembersihan

Setiap login menambah satu baris di `refresh_tokens`; baris kedaluwarsa/dicabut tidak pernah dihapus. Tabel akan tumbuh tanpa batas dan memperlambat query `findById` (walau PK, tetap menambah biaya storage/backup). Tidak ada index pada `expires_at` (lihat `db.md` DB-07).

**Perbaikan:** job harian (`@Cron`) yang menghapus `expires_at < now() - interval '30 days'` atau `revoked_at < now() - interval '30 days'`, dijalankan dengan batch (`DELETE ... LIMIT`) agar tidak mengunci tabel. Lindungi dengan advisory lock seperti scheduler appraisal (lihat `appraisals.md`).

---

### AUTH-03 — `refreshSecret` fallback ke access secret (Medium)

**Rule:** `security-auth-jwt`
**Lokasi:** `auth.service.ts:283-287`, `jwt.strategy.ts:51`

```ts
return this.configService.get<string>('JWT_REFRESH_SECRET') ?? this.accessSecret;
```

Di produksi, env yang lupa diisi membuat access & refresh memakai kunci yang sama — padahal `JwtStrategy` dan `refresh` sama-sama menerima `algorithms: ['HS256']`. Sudah dicatat di `config.md` CFG-01; jangan diperbaiki dua kali — cukup dijadikan satu tiket bersama validasi env.

**Perbaikan:** hapus fallback di produksi dan wajibkan `JWT_REFRESH_SECRET` (lihat CFG-01). Jika fallback dipertahankan untuk dev, batasi eksplisit pada `NODE_ENV !== 'production'`.

---

### AUTH-04 — Default masa berlaku token berbeda antara service dan validasi env (Medium)

**Rule:** `devops-use-config-module`
**Lokasi:** `auth.service.ts:289-299` vs `config/env.validation.ts:32-43`

| Setting | Fallback di `auth.service.ts` | Default di `env.validation.ts` |
|---------|-------------------------------|-------------------------------|
| `JWT_ACCESS_EXPIRES_IN` | `'15m'` | `'5m'` |
| `JWT_REFRESH_EXPIRES_IN` | `'7d'` | `'1d'` |

Karena `ConfigModule` memakai hasil `validateEnv` (yang sudah mengisi default), fallback di service **tidak pernah** terpakai di aplikasi — tetapi menyesatkan pembaca dan berbeda dari dokumentasi. Nilai efektif saat ini adalah 5 menit/1 hari.

**Perbaikan:** hapus fallback di service dan gunakan `configService.getOrThrow(...)`; biarkan satu tempat (env validation) yang memutuskan default.

---

### AUTH-05 — `JwtStrategy` tidak punya test (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `src/auth/` (tidak ada `jwt.strategy.spec.ts`)

`JwtStrategy.validate` adalah gerbang setiap request terproteksi. Yang belum diuji:
- `payload.typ !== 'access'` → 401 (mencegah refresh token dipakai sebagai access),
- user tidak ada / `isActive: false` → 401,
- pemetaan `AuthenticatedUser` (userId, username, employeeId, employeeNumber, roles),
- `requestContext.setUser` dipanggil.

Test ini murah (mock `UsersRepository` + `RequestContextService`) dan melindungi dari regresi keamanan.

---

### AUTH-06 — DTO login memvalidasi kebijakan password, bukan hanya keberadaan (Medium)

**Rule:** `security-validate-all-input`, `api-use-pipes`
**Lokasi:** `dto/signin.dto.ts:12-16`

```ts
@MinLength(6)
password!: string;
```

Login seharusnya hanya memeriksa bahwa password diisi. Menegakkan panjang minimum di DTO membuat:
- perubahan kebijakan password (mis. menjadi 8 — lihat `users.md` USR-03) langsung menolak **login** user lama dengan 400 "Validation failed", bukan 401 yang jelas,
- informasi kebijakan bocor lewat pesan validasi.

**Perbaikan:** hapus `@MinLength` dari `SignInDto`, sisakan `@IsString() @IsNotEmpty()` (dan `@MaxLength(72)` untuk mencegah payload berlebihan).

---

### AUTH-07 — Rate limit login berbasis IP; tanpa `trust proxy` kuota bisa dibagi seluruh kantor (Medium)

**Rule:** `security-rate-limiting`
**Lokasi:** `auth.controller.ts:27-31, 46-50`, `app.module.ts:49`, `main.ts` (tidak ada `trust proxy`)

`@Throttle({ default: { limit: 5 } })` memakai tracker default (`req.ip`). Bila aplikasi berada di belakang reverse proxy/NAT dan `trust proxy` belum diset (lihat `app.md` APP-06), semua pengguna terlihat satu IP → **hanya 5 percobaan login per menit untuk seluruh organisasi**. Sebaliknya, penyerang yang memutar IP dapat menghindari batas.

**Perbaikan:** set `app.set('trust proxy', 1)` (APP-06) dan pertimbangkan tracker kustom: `username` untuk login (mencegah brute force akun tertentu) + IP untuk endpoint lain.

---

### AUTH-08 — Error dari `JwtStrategy` tidak memakai `errorCode` (Medium)

**Rule:** `error-use-exception-filters`, `api-use-dto-serialization`
**Lokasi:** `jwt.strategy.ts:39-41, 44-46`

```ts
throw new UnauthorizedException('Invalid token type. Please login again.');
throw new UnauthorizedException('Invalid token. Please login again.');
```

Berbeda dari error Auth lain yang memakai `{ message, errorCode }` (`AUTH_INVALID_CREDENTIALS`, `AUTH_USER_INACTIVE`, `AUTH_INVALID_REFRESH_TOKEN`), dua error ini dikirim sebagai string sehingga `HttpExceptionFilter` memberi `code: 'UNAUTHORIZED'`. Frontend yang membedakan penanganan berdasarkan `errorCode` harus menangani dua bentuk.

**Perbaikan:**
```ts
throw new UnauthorizedException({
  message: 'Invalid token. Please login again.',
  errorCode: 'AUTH_INVALID_ACCESS_TOKEN',
});
```

---

### AUTH-09 — `logout` menelan semua error tanpa log (Medium)

**Rule:** `devops-use-logging`
**Lokasi:** `auth.service.ts:133-181` (blok `catch {}`)

Perilaku "logout selalu sukses" benar dari sisi pengguna dan sudah diuji. Namun kegagalan nyata (DB down, bug di audit, token rusak) hilang tanpa jejak, sehingga tidak bisa didiagnosis dari produksi.

**Perbaikan:** tambahkan `Logger.warn`/`debug` dengan `requestId` di blok catch (tanpa menyertakan token). Jangan ubah respons.

---

### AUTH-10 — `user_agent`/`ip` bisa melebihi panjang kolom (Medium)

**Rule:** `security-validate-all-input`, `db-use-migrations`
**Lokasi:** `auth.service.ts:78-84`, `db/schema.ts:76-77`

`ip` = `varchar(64)`, `userAgent` = `varchar(255)`. `req.headers['user-agent']` tidak dibatasi dan bisa lebih dari 255 karakter (beberapa bot/klien mengirim UA sangat panjang). PostgreSQL akan menolak insert (`22001 value too long`) → login gagal 500 untuk klien tersebut, dan `meta()` juga meneruskan `req.ip` apa adanya.

**Perbaikan:** potong sebelum insert:
```ts
userAgent: meta.userAgent?.slice(0, 255) ?? null,
ip: meta.ip?.slice(0, 64) ?? null,
```
Lebih baik lagi, ubah kolom menjadi `text` jika ingin menyimpan UA utuh.

---

### AUTH-11 — `decode` hasil `signAsync` diasumsikan selalu ada `exp` (Low)

**Rule:** `error-handle-async-errors`
**Lokasi:** `auth.service.ts:223-225`

```ts
const decoded = this.jwtService.decode(refreshToken) as { exp: number };
expiresAt: new Date(decoded.exp * 1000),
```

`decode` bisa mengembalikan `null`/string; cast `as` menutupi risiko. Nilai `exp` sebenarnya juga sudah diketahui dari konfigurasi — bisa dihitung dari `refreshExpiresIn` atau dibaca dengan pemeriksaan eksplisit (`if (!decoded || typeof decoded === 'string' || !decoded.exp) throw ...`).

---

### AUTH-12 — Konfigurasi cookie membaca `process.env` dan belum mempertimbangkan CSRF (Low)

**Rule:** `devops-use-config-module`, `security-use-guards`
**Lokasi:** `auth-cookie.ts:5-11`

`secure: process.env.NODE_ENV != 'development'` — duplikasi sumber konfigurasi (lihat `config.md` CFG-03) dan memakai `!=` longgar. `sameSite: 'lax'` sudah tepat untuk mitigasi CSRF dasar (cookie tidak dikirim pada POST lintas situs), tetapi `refresh` yang menerima cookie dan mengembalikan access token tetap layak dipertimbangkan untuk proteksi CSRF eksplisit (double-submit token) bila nanti ada kebutuhan lintas domain.

**Perbaikan:** suntikkan `isProduction`/`sameSite` dari service; putuskan kebutuhan CSRF bersama tim frontend.

---

### AUTH-13 — Guard throttle ganda setelah APP-01 (Low)

**Lokasi:** `auth.controller.ts:26`

`@UseGuards(ThrottlerGuard)` di level controller berguna sekarang (karena belum global), tetapi akan menjadi redundan begitu `ThrottlerGuard` didaftarkan sebagai `APP_GUARD` (`app.md` APP-01). Tidak berbahaya, tetapi hapus saat APP-01 dikerjakan agar konfigurasi rate limit hanya punya satu sumber.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Dua token dengan `typ` eksplisit** dan pengecekan tipe di `JwtStrategy` serta `verifyRefreshToken` — refresh token tidak bisa dipakai sebagai access.
- **Refresh token disimpan sebagai SHA-256 hash**, token asli tidak pernah masuk DB; `jti` menjadi PK sehingga bisa dicabut per sesi.
- **Refresh tanpa rotasi** adalah keputusan sadar (dokumentasi + test concurrent refresh) — jangan "perbaiki" menjadi rotasi tanpa keputusan produk, karena akan mengubah perilaku multi-tab.
- **Audit dalam transaksi yang sama** dengan penulisan token; kegagalan audit tidak mengubah 401/200 (`recordFailedLogin` best-effort, diuji).
- **Tidak ada materi sensitif di audit** — test memastikan password, hash, dan refresh token tidak tersimpan.
- **Logout idempoten**: token tidak valid/sudah dicabut tidak diaudit dua kali, tetapi tetap merespons sukses (diuji).
- **`recordFailedLogin` mencatat username & userId** sehingga percobaan brute force bisa diinvestigasi.
- **`bcrypt.compare` dijalankan di luar transaksi**, sehingga koneksi DB tidak tertahan selama operasi CPU.
- **`@Throttle` per-endpoint** (5 login/menit, 10 refresh/menit) jauh lebih ketat dari default.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | AUTH-01 | Sesi user nonaktif/terhapus seolah sah; memicu loop 401↔refresh |
| 2 | AUTH-03 | Ikut CFG-01 (pemisahan secret) |
| 3 | AUTH-07 | Prasyarat APP-06; tanpa itu login seluruh kantor bisa terblokir |
| 4 | AUTH-10 | Login bisa gagal 500 karena UA panjang |
| 5 | AUTH-08, AUTH-04 | Konsistensi kontrak error & konfigurasi |
| 6 | AUTH-02 | Housekeeping tabel token |
| 7 | AUTH-05, AUTH-06, AUTH-09 | Test & observability |
| 8 | AUTH-11, AUTH-12, AUTH-13 | Detail & kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] AUTH-01 Tolak refresh untuk user tidak ada/nonaktif + test
- [ ] AUTH-02 Job pembersihan refresh token kedaluwarsa
- [ ] AUTH-03 Wajibkan `JWT_REFRESH_SECRET` di produksi (bersama CFG-01)
- [ ] AUTH-04 Hapus fallback expiry; pakai `getOrThrow`
- [ ] AUTH-05 Tambah `jwt.strategy.spec.ts`
- [ ] AUTH-06 Longgarkan `SignInDto` (tanpa `@MinLength`)
- [ ] AUTH-07 `trust proxy` + pertimbangkan tracker per-username
- [ ] AUTH-08 Gunakan `errorCode` pada error strategy
- [ ] AUTH-09 Log kegagalan logout (tanpa token)
- [ ] AUTH-10 Potong `userAgent`/`ip` sebelum insert (atau ubah tipe kolom)
- [ ] AUTH-11 Validasi hasil `decode`
- [ ] AUTH-12 Suntik konfigurasi cookie; putuskan kebutuhan CSRF
- [ ] AUTH-13 Hapus guard throttle controller setelah APP-01
