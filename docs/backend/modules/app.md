# Audit: AppModule (root `app.*` + `main.ts`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (40 rules, 10 kategori)
**File yang diperiksa:**
- `src/main.ts`
- `src/app.module.ts`
- `src/app.controller.ts`
- `src/app.service.ts`
- Rujukan pendukung: `src/config/env.validation.ts`, `src/common/interceptors/response.interceptor.ts`, `src/common/filters/http-exception.filter.ts`, `src/common/guards/*.ts`, `src/db/db.module.ts`, `src/health/health.controller.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 3 | APP-01, APP-02, APP-03 |
| Medium | 4 | APP-04, APP-05, APP-06, APP-07 |
| Low | 5 | APP-08, APP-09, APP-10, APP-11, APP-12 |

Secara umum fondasi aplikasi sudah benar: guard global terdaftar berurutan (JWT lalu Roles), exception filter dan response interceptor global, `ValidationPipe` ketat (`whitelist` + `forbidNonWhitelisted` + `transform`), validasi env saat startup, `ClsModule` untuk request id, global prefix `api`, CORS, dan Swagger hanya di development. Temuan di bawah ini adalah hardening dan konsistensi, bukan kerusakan struktural — kecuali APP-04 yang berdampak langsung pada response.

---

## 2. Temuan & Perbaikan

### APP-01 — Rate limit tidak berlaku global (High)

**Rule:** `security-rate-limiting`
**Lokasi:** `app.module.ts:49` (konfigurasi) vs `app.module.ts:69-85` (daftar `APP_GUARD`)

`ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])` sudah dikonfigurasi, tetapi `ThrottlerGuard` **tidak** didaftarkan sebagai `APP_GUARD`. Satu-satunya pemakaian ada di `auth.controller.ts:32` (`@UseGuards(ThrottlerGuard)`). Akibatnya semua endpoint selain auth tidak punya batas laju, dan konfigurasi default 20/menit di `forRoot` praktis tidak terpakai.

**Perbaikan:**
```ts
// app.module.ts — tambahkan setelah RolesGuard
import { ThrottlerGuard } from '@nestjs/throttler';

{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

Lalu kecualikan endpoint operasional agar tidak ikut terblokir:
```ts
// health.controller.ts
@SkipThrottle()
@Public()
@Get()
```

**Catatan:** urutan guard global adalah JWT → Roles → Throttler. Menaruh Throttler paling akhir membuat request tanpa token tetap terkena limit (perlu, untuk mencegah flood ke endpoint 401), tetapi pastikan tracker memakai IP yang benar — lihat APP-06.

---

### APP-02 — Graceful shutdown tidak diaktifkan (High)

**Rule:** `devops-graceful-shutdown`, `perf-async-hooks`
**Lokasi:** `main.ts:7-41`, `db.module.ts:35-40`

`DbModule` sudah mengimplementasikan `OnModuleDestroy` untuk `pool.end()`, tetapi `app.enableShutdownHooks()` tidak pernah dipanggil. Tanpa itu, SIGTERM/SIGINT mematikan proses secara default sehingga hook tidak dijalankan: koneksi PostgreSQL tidak ditutup rapi dan request in-flight terputus saat deploy/restart container.

**Perbaikan:**
```ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
```

Opsional untuk container: batasi waktu tunggu koneksi (`server.setTimeout(30_000)`) dan pastikan orchestrator memberi grace period yang cukup.

---

### APP-03 — Error saat bootstrap tidak tertangani (High)

**Rule:** `error-handle-async-errors`, `devops-use-logging`
**Lokasi:** `main.ts:41`

`void bootstrap();` membuang promise. Bila `listen()` gagal (port terpakai, env tidak valid, pool gagal), Node hanya menghasilkan unhandled rejection tanpa logging terstruktur dan tanpa exit code yang jelas untuk supervisor/CI.

**Perbaikan:**
```ts
bootstrap().catch((error) => {
  Logger.error('Application failed to start', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
```

---

### APP-04 — Response string dari `AppController` hilang dibungkus interceptor (Medium)

**Rule:** `api-use-dto-serialization`, `api-use-interceptors`
**Lokasi:** `app.controller.ts:12-15`, `app.service.ts:5-7`, `response.interceptor.ts:32-36`

`getHello()` mengembalikan `string`, sedangkan `ResponseInterceptor` hanya meneruskan payload berbentuk `{ data, meta }`:

```ts
data: data?.data !== undefined ? data.data : null,
```

Untuk string, `data.data` bernilai `undefined`, sehingga hasil akhir `GET /api/app` adalah `data: null` — isi `"Hello World!"` hilang. Ini contoh konkret bahwa kontrak interceptor (handler wajib mengembalikan `ApiResponse`/`ok()`) tidak ditegakkan oleh tipe.

**Perbaikan (pilih salah satu):**
```ts
// Opsi A — bungkus di controller
@Get('app')
getHello() {
  return ok(this.appService.getHello());
}
```
```ts
// Opsi B — jadikan interceptor defensif
const payload = data as { data?: unknown; meta?: unknown } | null;
data: payload && 'data' in payload ? payload.data : (data ?? null),
```

Jika endpoint ini hanya placeholder, pertimbangkan menghapusnya (tidak ada nilai bisnis dan ikut terekspos publik).

---

### APP-05 — Belum ada structured logging / request logging (Medium)

**Rule:** `devops-use-logging`
**Lokasi:** `main.ts:8` (`NestFactory.create(AppModule)`), `app.module.ts:31-45` (Cls setup)

`ClsModule` sudah membuat request id (`generateId` + `x-request-id`), tetapi:
- id tersebut tidak di-echo ke response header (`x-request-id`),
- tidak dipakai oleh logger mana pun,
- tidak ada log akses per request (method, path, status, durasi).

Logger bawaan hanya dipakai di `HttpExceptionFilter` dan scheduler. Saat debugging produksi, korelasi request antar-log tidak mungkin dilakukan.

**Perbaikan minimum:**
1. Middleware kecil yang menulis `res.setHeader('x-request-id', cls.getId())`.
2. Logger yang menyertakan `requestId` (dan `userId` setelah guard) pada setiap entri.
3. Pertimbangkan `nestjs-pino` + `redact: ['req.headers.authorization', 'req.body.password']`.

---

### APP-06 — `trust proxy` tidak diset (Medium)

**Rule:** `security-rate-limiting`, `security-auth-jwt`
**Lokasi:** `main.ts:7-17`

Di belakang reverse proxy/LB, `req.ip` berisi IP proxy. Nilai ini dipakai untuk rate limit (throttler default tracker) dan untuk kolom `ip` pada `refresh_tokens`, sehingga audit login dan pembatasan laju menjadi tidak akurat.

**Perbaikan:**
```ts
app.set('trust proxy', 1); // sesuaikan jumlah hop proxy
```

---

### APP-07 — Security headers belum dipasang (Medium)

**Rule:** `security-sanitize-output`
**Lokasi:** `main.ts` (tidak ada middleware header)

Belum ada `helmet` (atau set header manual: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP untuk Swagger). Untuk API JSON risikonya lebih kecil daripada aplikasi HTML, tetapi ini hardening standar dan murah.

**Perbaikan:** tambahkan dependency `helmet` (**butuh persetujuan**, sesuai AGENTS.md) lalu `app.use(helmet())`. Bila tidak ingin menambah dependency, set header manual lewat middleware.

---

### APP-08 — Konfigurasi CORS terlalu sempit (Low)

**Rule:** `security-use-guards` (konteks boundary)

**Lokasi:** `main.ts:13-17`

- `origin` hanya menerima satu string dari env; deployment dengan beberapa origin (mis. domain web + domain admin) tidak bisa.
- `methods` tidak menyertakan `OPTIONS` secara eksplisit (umumnya ditangani preflight, tetapi eksplisit lebih aman).
- Jika `CORS_ORIGIN` kosong di produksi, perilaku `origin: undefined` bisa menjadi permisif.

**Perbaikan:**
```ts
const allowed = (configService.get<string>('CORS_ORIGIN') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
app.enableCors({
  origin: allowed.length > 0 ? allowed : false,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
});
```
Jadikan `CORS_ORIGIN` wajib (`@IsNotEmpty`) di `env.validation.ts`, minimal untuk `NODE_ENV=production`.

---

### APP-09 — Belum ada API versioning (Low, opsional)

**Rule:** `api-versioning`
**Lokasi:** `main.ts:11`

Hanya ada prefix `api`. Selama API belum dikonsumsi pihak ketiga, ini wajar. Bila nanti ada perubahan breaking, opsi termurah adalah `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` sehingga route menjadi `/api/v1/...`.

---

### APP-10 — Konfigurasi belum typed & secret belum diperketat (Low)

**Rule:** `devops-use-config-module`, `security-auth-jwt`
**Lokasi:** `config/env.validation.ts`, `app.module.ts:28`

Validasi env sudah bagus (fail-fast via `class-validator`). Yang kurang:
- `JWT_SECRET` hanya `@IsNotEmpty()` — tidak ada panjang minimum. Rule `security-auth-jwt` menyarankan secret kuat (≥32 karakter acak).
- `JWT_REFRESH_SECRET` opsional dan di `auth.service.ts` fallback ke `JWT_SECRET`, sehingga pemisahan access/refresh bisa hilang tanpa peringatan.
- Semua akses memakai `configService.get<string>('KEY')` mentah, tanpa namespace/typed config (`registerAs`), sehingga typo nama key tidak terdeteksi compiler.

**Perbaikan:** tambahkan `@MinLength(32)` pada `JWT_SECRET`, wajibkan `JWT_REFRESH_SECRET` saat `NODE_ENV=production`, dan pertimbangkan `load: [appConfig, jwtConfig, databaseConfig]` dengan `ConfigType<typeof ...>`.

---

### APP-11 — Konsistensi kecil (Low)

- `response.interceptor.ts:35`: typo `'Action completed succesfully'` → `successfully` (pesan ini muncul di semua response sukses yang tidak memberi `@ResponseMessage`).
- `app.controller.ts:11`: `@Get('/app')` memakai leading slash; konvensi Nest tanpa slash (`@Get('app')`).

---

### APP-12 — Semua feature module di-eager load (Low, opsional)

**Rule:** `perf-lazy-loading`
**Lokasi:** `app.module.ts:46-64`

Semua module diimpor langsung. Untuk aplikasi sebesar ini startup masih wajar; jangan diubah tanpa alasan terukur. Catat sebagai opsi bila waktu boot mulai terasa (mis. memisahkan modul berat seperti `appraisals`).

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- Guard global terdaftar dengan urutan benar: `JwtAuthGuard` → `RolesGuard` (`app.module.ts:69-76`).
- `HttpExceptionFilter` global memetakan error PostgreSQL (23505/23503/23502/23P01) ke response yang konsisten.
- `ValidationPipe` global ketat dan `transform` aktif (`main.ts:19-25`).
- `ConfigModule.forRoot({ isGlobal, validate })` + `validateEnv` → gagal cepat saat env salah.
- `ClsModule` global dengan `x-request-id` dan `ip`.
- Swagger hanya di `development`.
- `ScheduleModule` selalu terdaftar, tetapi eksekusi cron dijaga `SCHEDULER_ENABLED` di `appraisal-scheduler.service.ts:18`.
- `DbModule` menutup pool lewat `OnModuleDestroy` (hanya perlu dipicu — lihat APP-02).

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | APP-04 | Berdampak langsung pada data response (bug terlihat) |
| 2 | APP-02 | Mencegah koneksi DB menggantung saat deploy |
| 3 | APP-03 | Startup gagal harus terlihat jelas di log/CI |
| 4 | APP-01 | Membuka proteksi laju untuk seluruh API |
| 5 | APP-06 | Prasyarat agar APP-01 dan audit IP akurat |
| 6 | APP-05 | Observability |
| 7 | APP-07, APP-08, APP-10 | Hardening |
| 8 | APP-09, APP-11, APP-12 | Kebersihan/opsional |

---

## 5. Checklist tindak lanjut

- [ ] APP-01 Daftarkan `ThrottlerGuard` sebagai `APP_GUARD`; `@SkipThrottle()` di health
- [ ] APP-02 `app.enableShutdownHooks()`
- [ ] APP-03 `bootstrap().catch(...)` + `process.exit(1)`
- [ ] APP-04 Bungkus response `AppController` dengan `ok()` atau buat interceptor defensif
- [ ] APP-05 Echo `x-request-id` + logger berkonteks
- [ ] APP-06 `app.set('trust proxy', 1)`
- [ ] APP-07 Security headers (`helmet` perlu persetujuan dependency)
- [ ] APP-08 CORS allowlist + wajib di produksi
- [ ] APP-09 (opsional) URI versioning
- [ ] APP-10 `JWT_SECRET` min length, `JWT_REFRESH_SECRET` wajib di produksi
- [ ] APP-11 Perbaiki typo & leading slash
- [ ] APP-12 Catat opsi lazy-loading sebagai technical debt
