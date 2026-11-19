# Audit: Health (`src/health/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`micro-use-health-checks`, `error-handle-async-errors`, `security-rate-limiting`)
**File yang diperiksa:**
- `health.module.ts` (7 baris)
- `health.controller.ts`
- Rujukan: `app.module.ts` (Throttler), `interceptors/response.interceptor.ts`, `filters/http-exception.filter.ts`, `db/db.service.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 0 | — |
| Medium | 5 | HLT-01 … HLT-05 |
| Low | 2 | HLT-06, HLT-07 |

Module terkecil di backend dan sudah memenuhi tujuan dasarnya: endpoint `@Public()` yang mengecek koneksi DB. Temuan di sini bukan tentang struktur, melainkan **semantik health check untuk orchestrator** dan satu bug response yang sama polanya dengan `AppController`.

---

## 2. Temuan & Perbaikan

### HLT-01 — Payload `{ status: 'ok' }` hilang di response interceptor (Medium)

**Rule:** `api-use-interceptors`
**Lokasi:** `health.controller.ts:16`, `interceptors/response.interceptor.ts:32-36`

```ts
return { status: 'ok' };
```

`ResponseInterceptor` hanya meneruskan payload yang memiliki properti `data`:

```ts
data: data?.data !== undefined ? data.data : null,
```

Objek `{ status: 'ok' }` tidak punya `data`, sehingga response sebenarnya menjadi:

```json
{ "status": 200, "message": "Action completed succesfully", "data": null, "meta": null }
```

Probe yang hanya melihat HTTP status tetap bekerja, tetapi body-nya menyesatkan (dan siapa pun yang membaca `data.status` akan mendapat `null`). Ini akar yang sama dengan `app.md` APP-04 dan `common.md` CMM-04.

**Perbaikan (setelah CMM-04 diputuskan):**
```ts
return ok({ status: 'ok' });
```
atau perbaiki interceptor agar meneruskan payload non-envelope.

---

### HLT-02 — Kegagalan DB menghasilkan 500, bukan 503 (Medium)

**Rule:** `micro-use-health-checks`, `error-throw-http-exceptions`
**Lokasi:** `health.controller.ts:14-17`, `filters/http-exception.filter.ts:110-118`

Jika `SELECT 1` gagal, error PostgreSQL yang dilempar berupa objek tanpa `HttpException`, sehingga filter mengembalikan `500 INTERNAL_SERVER_ERROR`. Untuk health/readiness, status yang benar adalah **503 Service Unavailable** — membedakan "aplikasi rusak" dari "dependensi belum siap". Orchestrator modern memperlakukan keduanya sebagai tidak sehat, tetapi 500 juga memicu alert error-rate dan menyamakan DB down dengan bug aplikasi.

**Perbaikan:**
```ts
try {
  await this.dbService.client.execute(sql`SELECT 1`);
} catch {
  throw new ServiceUnavailableException('Database is not reachable');
}
```

---

### HLT-03 — Tidak ada timeout pada query health (Medium)

**Rule:** `perf-optimize-database`, `error-handle-async-errors`
**Lokasi:** `health.controller.ts:15`

`await dbService.client.execute(sql\`SELECT 1\`)` tanpa batas waktu. Saat pool habis atau DB macet, request health menggantung dan **menahan koneksi** yang seharusnya dipakai request bisnis. Probe yang datang tiap beberapa detik akan menumpuk dan memperparah kehabisan pool — tepat pada kondisi ketika health check seharusnya memberi sinyal cepat.

**Perbaikan:** gunakan batas waktu, mis.:
```ts
await Promise.race([
  this.dbService.client.execute(sql`SELECT 1`),
  new Promise((_, reject) => setTimeout(() => reject(new ServiceUnavailableException('Database check timed out')), 2_000)),
]);
```
Pelengkap: `statement_timeout` di pool (lihat `db.md` DB-05).

---

### HLT-04 — Belum ada pemisahan liveness vs readiness (Medium)

**Rule:** `micro-use-health-checks`
**Lokasi:** `health.controller.ts:11-17`, `health.module.ts:4-6`

Saat ini hanya ada satu endpoint `GET /api/health` yang **selalu** menyentuh database. Bila orchestrator memakai endpoint ini sebagai **liveness** probe, gangguan DB sesaat akan membuat container di-restart — padahal proses Node-nya sehat dan restart tidak memperbaiki DB.

**Perbaikan:** pisahkan dua makna:

| Endpoint | Cek | Dipakai untuk |
|----------|-----|---------------|
| `GET /health/live` | proses hidup saja (tanpa DB) | liveness probe |
| `GET /health/ready` | `SELECT 1` + dependensi lain | readiness probe / load balancer |

`/health` yang sekarang bisa dipertahankan sebagai alias `/health/ready` agar tidak breaking. `@nestjs/terminus` opsional; dua handler sederhana sudah cukup untuk kebutuhan ini (**dependency baru butuh persetujuan**).

---

### HLT-05 — Endpoint health belum dikecualikan dari rate limit (Medium)

**Rule:** `security-rate-limiting`
**Lokasi:** `app.module.ts:49` (konfigurasi), `health.controller.ts:11-13`

`ThrottlerModule` dikonfigurasi `limit: 20` per menit. Begitu `app.md` APP-01 diterapkan (ThrottlerGuard global), probe yang berjalan tiap 5–10 detik akan melewati kuota dan menerima **429**, yang oleh orchestrator dianggap tidak sehat → restart loop.

**Perbaikan (wajib dikerjakan bersamaan dengan APP-01):**
```ts
@SkipThrottle()
@Public()
@Get()
```
Pertimbangkan juga `@SkipThrottle()` hanya untuk `/health/live` dan membiarkan readiness tetap dibatasi longgar.

---

### HLT-06 — Tidak ada test untuk health endpoint (Low)

**Rule:** `test-use-testing-module`
**Lokasi:** `src/health/` (tidak ada `.spec.ts`)

Health adalah endpoint yang menentukan uptime; test-nya murah: mock `DbService` sukses → 200; mock gagal → 503 (setelah HLT-02). Tambahkan juga test bahwa route tetap `@Public()` (tidak 401) agar perubahan guard global tidak diam-diam memutus probe.

---

### HLT-07 — Detail kecil (Low)

- `HealthModule` tidak mengimpor `DbModule` dan hanya bekerja karena `DbModule` bertanda `@Global()`. Ini sah, tetapi dependensi menjadi implisit; menyebut `imports: [DbModule]` membuat keterkaitan terbaca (opsional, bukan bug).
- Response health sebaiknya `Cache-Control: no-store` bila berada di belakang CDN/proxy, supaya status tidak di-cache.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- `@Public()` sudah dipasang — probe tidak memerlukan token.
- Pengecekan benar-benar menyentuh database (`SELECT 1`), bukan hanya mengembalikan `ok` buta.
- Controller tipis dan hanya bergantung pada `DbService` (mudah di-mock).
- Module minimal tanpa provider tak perlu — tidak ada over-engineering.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | HLT-05 | Prasyarat APP-01; tanpa ini health probe bisa kena 429 |
| 2 | HLT-02 | Semantik 503 untuk kegagalan dependensi |
| 3 | HLT-03 | Mencegah penumpukan koneksi saat DB bermasalah |
| 4 | HLT-04 | Liveness vs readiness (mencegah restart loop) |
| 5 | HLT-01 | Ikut keputusan CMM-04 (envelope response) |
| 6 | HLT-06, HLT-07 | Test & detail |

---

## 5. Checklist tindak lanjut

- [ ] HLT-01 Bungkus response dengan `ok()` / perbaiki interceptor (lihat CMM-04)
- [ ] HLT-02 Lempar `ServiceUnavailableException` saat DB gagal
- [ ] HLT-03 Tambahkan timeout pada pengecekan DB
- [ ] HLT-04 Pisahkan `/health/live` dan `/health/ready`
- [ ] HLT-05 `@SkipThrottle()` pada endpoint health (bersamaan dengan APP-01)
- [ ] HLT-06 Tambah spec health (200/503/public)
- [ ] HLT-07 (opsional) `imports: [DbModule]`, `Cache-Control: no-store`
