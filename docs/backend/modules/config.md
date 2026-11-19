# Audit: Config (`src/config/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices`
**File yang diperiksa:**
- `src/config/env.validation.ts` (satu-satunya file di folder)
- Rujukan pemakaian: `src/app.module.ts`, `src/main.ts`, `src/auth/auth.service.ts`, `src/auth/jwt.strategy.ts`, `src/auth/auth-cookie.ts`, `src/db/db.module.ts`, `src/imports/import.service.ts`, `src/appraisals/appraisal-scheduler.service.ts`, `src/db/seed.ts`, `src/db/migrate.ts`, `src/db/seed.plan.ts`
- Pembanding dokumentasi: `apps/backend/.env.example`

**Status:** ✅ Selesai di-scan (1 file + seluruh titik pemakaian config)

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 2 | CFG-01, CFG-02 |
| Medium | 5 | CFG-03, CFG-04, CFG-05, CFG-06, CFG-07 |
| Low | 4 | CFG-08, CFG-09, CFG-10, CFG-11 |

Fondasi validasi sudah tepat: `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })` dengan `class-validator`, `skipMissingProperties: false`, dan default value pada properti. Aplikasi gagal cepat saat env wajib hilang. Temuan berpusat pada **penegakan aturan keamanan secret**, **dua sumber kebenaran (`ConfigService` vs `process.env`)**, dan **tipe data yang masih string**.

---

## 2. Temuan & Perbaikan

### CFG-01 — `JWT_REFRESH_SECRET` tidak diwajibkan di produksi (High)

**Rule:** `security-auth-jwt`
**Lokasi:** `env.validation.ts:36-39`, `auth.service.ts:281-284`

`JWT_REFRESH_SECRET` memakai `@IsOptional()`, dan `AuthService.refreshSecret` melakukan fallback:

```ts
return this.configService.get<string>('JWT_REFRESH_SECRET') ?? this.accessSecret;
```

Di produksi, kelalaian mengisi env ini membuat access dan refresh token memakai kunci yang sama — menghapus pemisahan yang menjadi alasan dua token didesain terpisah. Tidak ada peringatan saat startup.

**Perbaikan:** wajibkan saat produksi. Karena `validateEnv` menerima seluruh config, gunakan validasi kondisional:

```ts
@ValidateIf((env) => env.NODE_ENV === 'production')
@IsString()
@MinLength(32)
@IsNotEmpty()
JWT_REFRESH_SECRET?: string;
```

Alternatif: hapus fallback di `auth.service.ts` dan lempar error saat startup bila kosong di produksi.

---

### CFG-02 — `JWT_SECRET` tidak punya batas panjang/entropi (High)

**Rule:** `security-auth-jwt`
**Lokasi:** `env.validation.ts:28-31`, `jwt.strategy.ts:26`, `auth.service.ts:278`

`JWT_SECRET` hanya `@IsString() @IsNotEmpty()`. Nilai seperti `"secret"` atau `"123"` lolos validasi. Padahal `.env.example` sendiri sudah menulis "change-me-to-a-32-char-minimum-secret" — aturan itu tidak ditegakkan di kode.

**Perbaikan:**
```ts
@IsString()
@MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
JWT_SECRET!: string;
```

---

### CFG-03 — Dua sumber kebenaran: `ConfigService` vs `process.env` (Medium)

**Rule:** `devops-use-config-module`, `security-auth-jwt`
**Lokasi:** `auth-cookie.ts:8`, `db/seed.ts:173`, `db/migrate.ts:11`, `db/seed.plan.ts:37`

`validateEnv` mengembalikan objek yang sudah berisi **default**, tetapi tidak menulis balik ke `process.env`. Akibatnya kode yang membaca `process.env` langsung tidak melihat default tersebut.

Contoh nyata: bila `NODE_ENV` tidak ada di `.env`, `ConfigService.get('NODE_ENV')` bernilai `'development'`, sedangkan `process.env.NODE_ENV` bernilai `undefined`. Di `auth-cookie.ts:8`:

```ts
secure: process.env.NODE_ENV != 'development',
```

Hasilnya cookie ditandai `secure` di lingkungan yang oleh aplikasi dianggap development — perilaku berbeda antar-lapisan. `seed.ts`/`migrate.ts` juga melewati validasi (wajar karena script standalone, tetapi perlu disadari: `DATABASE_URL` tidak tervalidasi di sana).

**Perbaikan:** jadikan `ConfigService` satu-satunya sumber untuk kode runtime. Ubah `auth-cookie.ts` menjadi fungsi yang menerima nilai `isProduction`/`secure` dari service, atau pindahkan opsi cookie ke provider yang menyuntik `ConfigService`. Untuk script standalone, tetap boleh `process.env` tetapi tambahkan pengecekan eksplisit.

---

### CFG-04 — Konfigurasi flat dan stringly-typed (Medium)

**Rule:** `devops-use-config-module`
**Lokasi:** `env.validation.ts` (seluruh file), `main.ts:14,27,39`, `db.module.ts:19`, `import.service.ts:84,126`, `appraisal-scheduler.service.ts:18`

Semua akses memakai key string mentah + generic manual, misalnya:

```ts
configService.get<string>('PORT')            // lalu Number(...)
configService.get<string>('JWT_SECRET')!     // non-null assertion
Number(this.configService.get('IMPORT_MAX_ROWS') ?? 5000)
```

Konsekuensinya:
- typo nama key tidak terdeteksi compiler (hanya menghasilkan `undefined` di runtime),
- tidak ada tipe hasil yang konsisten (`get<string>` untuk nilai numerik),
- `!` menandakan invariant yang sebenarnya sudah dijamin validator, tetapi tersebar di banyak file.

**Perbaikan:** gunakan namespace + typed config:
```ts
export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '5m',
}));
```
lalu `configService.getOrThrow<string>('jwt.secret')` atau `@Inject(jwtConfig.KEY)`. Ini juga menghapus `!` dan `Number(...)` berulang.

---

### CFG-05 — `NODE_ENV` default `development` membuka Swagger bila env lupa diisi (Medium)

**Rule:** `devops-use-config-module`, `security-sanitize-output`
**Lokasi:** `env.validation.ts:12-15`, `main.ts:27-35`

`NODE_ENV` punya default `'development'`. Bila deployment produksi lupa menetapkannya, aplikasi berjalan dalam mode development: dokumentasi Swagger aktif di `/api` dan `ConfigModule` berperilaku dev. Ini kegagalan yang "tidak terlihat" (tidak ada error startup).

**Perbaikan:** jangan beri default untuk `NODE_ENV` (wajib), atau minimal log peringatan keras saat `NODE_ENV !== 'production'` di lingkungan container/CI. Untuk Swagger, whitelist eksplisit tetap boleh, tetapi sumbernya harus env yang tegas.

---

### CFG-06 — Validasi rentang untuk nilai numerik belum ada (Medium)

**Rule:** `devops-use-config-module`, `security-validate-all-input`
**Lokasi:** `env.validation.ts:16-19, 52-59`

`@IsNumberString()` menerima `'0'`, `'-5'`, atau angka di luar rentang wajar. Yang terdampak:
- `PORT` — tidak dibatasi 1–65535,
- `IMPORT_MAX_FILE_SIZE_MB` — nilai `0`/negatif membuat semua upload ditolak,
- `IMPORT_MAX_ROWS` — nilai `0`/negatif membuat semua impor ditolak.

**Perbaikan:** ubah ke tipe angka dan beri batas:
```ts
@Type(() => Number)
@IsInt()
@Min(1)
@Max(65535)
PORT: number = 3000;
```
dengan `transformOptions: { enableImplicitConversion: false }` agar konversi eksplisit lewat `@Type`.

---

### CFG-07 — Format masa berlaku JWT tidak divalidasi (Medium)

**Rule:** `security-auth-jwt`, `devops-use-config-module`
**Lokasi:** `env.validation.ts:32-43`, `auth.service.ts:286-295`

`JWT_ACCESS_EXPIRES_IN` dan `JWT_REFRESH_EXPIRES_IN` hanya `@IsString()`. Nilai yang tidak dikenali `jsonwebtoken`/`ms` (mis. `'lima menit'`) baru gagal saat login diterbitkan — bukan saat startup. Gejalanya menjadi error 500 pada request, bukan kegagalan deploy.

**Perbaikan:** validasi dengan pola yang diterima `ms`, misalnya:
```ts
@Matches(/^\d+(ms|s|m|h|d|w|y)$/, { message: 'JWT_ACCESS_EXPIRES_IN must look like 5m, 1d, 30s' })
```
atau konversi ke detik saat startup (`ms(value)`) sehingga nilai tidak valid menggagalkan boot.

---

### CFG-08 — Tidak ada layering env file / cache (Low)

**Rule:** `devops-use-config-module`
**Lokasi:** `app.module.ts:28`

Hanya `.env` default yang dibaca; tidak ada `envFilePath` berlapis (`.env.${NODE_ENV}.local`, `.env.${NODE_ENV}`, `.env.local`, `.env`) dan tidak ada `cache: true`. Untuk aplikasi satu lingkungan ini cukup, tetapi menyulitkan penerapan config per-environment tanpa mengubah proses deploy.

**Perbaikan (opsional):**
```ts
ConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
  validate: validateEnv,
});
```

---

### CFG-09 — `.env.example` tidak sinkron dengan validator (Low)

**Rule:** `devops-use-config-module` (dokumentasi konfigurasi)

- `.env.example` memuat `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_EMPLOYEE_COUNT` yang **tidak** dideklarasikan di `EnvironmentVariables`.
- Variabel `IMPORT_MAX_FILE_SIZE_MB` dan `IMPORT_MAX_ROWS` yang divalidasi **tidak** ada di `.env.example`.
- `JWT_SECRET` di `.env.example` mengandung catatan "32-char minimum", tetapi aturan itu tidak ditegakkan (lihat CFG-02).

**Perbaikan:** samakan daftar key. Untuk key seed, dokumentasikan sebagai khusus script seed agar tidak dikira dibaca aplikasi.

---

### CFG-10 — `TZ` divalidasi tetapi tidak pernah diterapkan eksplisit (Low, **Perlu konfirmasi**)

**Rule:** `devops-use-config-module`
**Lokasi:** `env.validation.ts:20-23`

`TZ=Asia/Jakarta` divalidasi sebagai string, tetapi tidak ada kode yang memakai nilainya. Bila `.env` dimuat oleh `ConfigModule` (bukan oleh proses Node sebelum start), penetapan zona waktu bergantung pada urutan inisialisasi `process.env.TZ` sebelum penggunaan `Date` pertama. Perilaku ini rapuh dan tidak eksplisit.

**Perbaikan:** konfirmasi apakah zona waktu memang target perilaku. Jika ya, set `process.env.TZ` di titik paling awal (`main.ts` sebelum `NestFactory.create`, atau lewat `import 'dotenv/config'` + pengecekan), lalu tambahkan test tanggal yang peka zona waktu.

---

### CFG-11 — `SCHEDULER_ENABLED` masih dibandingkan sebagai string (Low)

**Rule:** `devops-use-config-module`
**Lokasi:** `appraisal-scheduler.service.ts:18`

```ts
if (this.configService.get<string>('SCHEDULER_ENABLED') === 'false') return;
```

Nilai lain apa pun (`'False'`, `'0'`, `''`) akan **mengaktifkan** scheduler. Validator `@IsIn(['true','false'])` saat ini menyelamatkan dari typo, tetapi ketergantungan pada representasi string membuat pemakaian di tempat lain rawan.

**Perbaikan:** jadikan boolean di config:
```ts
@Transform(({ value }) => value === 'true')
@IsBoolean()
SCHEDULER_ENABLED: boolean = true;
```
lalu `if (!this.configService.get<boolean>('SCHEDULER_ENABLED')) return;`.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- `ConfigModule` global + `validate` → satu titik validasi untuk seluruh aplikasi (`app.module.ts:28`).
- `validateSync(..., { skipMissingProperties: false })` memastikan env wajib benar-benar ada.
- Default aman untuk nilai non-secret (`PORT`, `JWT_ACCESS_EXPIRES_IN`, `IMPORT_*`).
- `DATABASE_URL` dan `JWT_SECRET` wajib (`@IsNotEmpty`).
- `NODE_ENV` dibatasi `@IsIn(['development','test','production'])`.
- Pesan error validasi sudah menyebut nama properti (class-validator default) sehingga bisa langsung ditindak.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | CFG-01 | Pemisahan access/refresh token adalah kontrol keamanan inti |
| 2 | CFG-02 | Secret lemah tidak terdeteksi sama sekali |
| 3 | CFG-03 | Perbedaan perilaku dev/prod antar-lapisan (cookie, Swagger) |
| 4 | CFG-05 | Swagger terbuka jika `NODE_ENV` lupa diisi |
| 5 | CFG-06 | Nilai `0`/negatif dapat melumpuhkan impor |
| 6 | CFG-07 | Gagal saat runtime, bukan saat deploy |
| 7 | CFG-04 | Refactor bertahap, manfaat jangka panjang |
| 8 | CFG-08, CFG-09, CFG-10, CFG-11 | Kebersihan & konsistensi |

---

## 5. Checklist tindak lanjut

- [ ] CFG-01 Wajibkan `JWT_REFRESH_SECRET` di produksi (validator atau startup check)
- [ ] CFG-02 `@MinLength(32)` untuk `JWT_SECRET`
- [ ] CFG-03 Hilangkan `process.env` di kode runtime (`auth-cookie.ts`)
- [ ] CFG-04 (opsional) Namespace config + `getOrThrow` / typed `registerAs`
- [ ] CFG-05 Wajibkan `NODE_ENV` atau peringatkan saat bukan production
- [ ] CFG-06 Validasi rentang `PORT`, `IMPORT_MAX_FILE_SIZE_MB`, `IMPORT_MAX_ROWS`
- [ ] CFG-07 Validasi format masa berlaku JWT
- [ ] CFG-08 (opsional) `envFilePath` berlapis + `cache`
- [ ] CFG-09 Sinkronkan `.env.example` dengan `EnvironmentVariables`
- [ ] CFG-10 Konfirmasi perilaku `TZ`; set eksplisit bila memang diinginkan
- [ ] CFG-11 Ubah `SCHEDULER_ENABLED` menjadi boolean
