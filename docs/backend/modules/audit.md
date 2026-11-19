# Audit: Audit (`src/audit/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`db-*`, `security-*`, `api-*`, `test-*`)
**File yang diperiksa (12):**
- `audit.module.ts`, `audit.controller.ts`, `audit.service.ts`, `audit.repository.ts`, `audit.mask.ts`, `audit.excel.ts`
- `dto/audit-log-query.dto.ts`
- Test: `audit.service.spec.ts`, `audit.repository.spec.ts`, `audit.mask.spec.ts`, `audit.excel.spec.ts`, `dto/audit-log-query.dto.spec.ts`
- Rujukan: `db/audit-logs.schema.ts`, `drizzle/0001_constraints.sql`, `common/utils/excel.util.ts`, `common/utils/audit-actor.util.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | AUD-01 |
| Medium | 6 | AUD-02 … AUD-07 |
| Low | 3 | AUD-08 … AUD-10 |

Module dengan kualitas test merata (lima spec, termasuk kompilasi filter SQL, escaping LIKE, dan pembuatan file Excel). Desainnya tepat: `record(executor, entry)` memaksa audit ikut transaksi perubahan, masking dipusatkan sehingga pemanggil tidak bisa lupa, query membaca kolom yang sudah disanitasi, dan ekspor mencatat dirinya sendiri. Kelemahan utama: **masking merusak nilai non-plain-object (terutama `Date`)** sehingga isi audit bisa hilang diam-diam.

---

## 2. Temuan & Perbaikan

### AUD-01 — `maskSensitive` mengubah `Date` (dan objek kelas lain) menjadi `{}` (High)

**Rule:** `devops-use-logging` (integritas audit), `api-use-dto-serialization`
**Lokasi:** `audit.mask.ts:19-35` (khususnya `:23-30`), dipakai `audit.service.ts:70-72`

```ts
if (value !== null && typeof value === 'object') {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) { ... }
  return result;
}
```

`typeof new Date()` adalah `'object'` dan `Object.entries(new Date())` menghasilkan `[]`, sehingga **setiap `Date` di `before`/`after`/`metadata` berubah menjadi `{}`**.

Dampaknya nyata: `employees.service.ts` mengirim snapshot hasil raw SQL (yang mem-parse kolom `date` menjadi `Date`, lihat `employees.md` EMP-06) ke audit. Field seperti `birthDate`, `joinDate`, dan `contractStartDate` akan tersimpan sebagai `{}` — hilang permanen karena audit append-only. Hal yang sama terjadi untuk `Decimal`, `Buffer`, atau instance kelas lain.

**Perbaikan:** perlakukan leaf non-plain-object sebagai nilai (atau serialisasi eksplisit):
```ts
if (value instanceof Date) return value.toISOString();
if (Buffer.isBuffer(value)) return value.toString('base64');
const proto = Object.getPrototypeOf(value);
if (proto !== Object.prototype && proto !== null) return value; // biarkan tipe lain
```
Tambahkan test `maskSensitive({ at: new Date(...) })` yang memastikan tanggal tidak hilang.

---

### AUD-02 — Masking berbasis nama key saja; nilai sensitif bisa lolos (Medium)

**Rule:** `security-sanitize-output`
**Lokasi:** `audit.mask.ts:3-9`

Deny-list (`/password/`, `/token/`, `/secret/`, `/authorization/`, `/cookie/`) hanya memeriksa **nama key**. Nilai sensitif yang tersimpan di key netral tidak disamarkan, misalnya:

```ts
{ metadata: { headers: 'Bearer eyJ...' } }
{ value: 'eyJhbGciOi...' }              // token di key "value"
{ before: { note: 'password: rahasia' } }
```

Pemanggil saat ini sebagian besar mengirim field yang aman, tetapi `metadata` ekspor dan snapshot bebas bentuknya, sehingga risikonya terbuka untuk kode baru.

**Perbaikan:** tambahkan deteksi pola nilai (JWT `xxx.yyy.zzz`, `Bearer `, `postgres://user:pass@`, email/telepon bila relevan) dan ganti dengan `***`, atau minimalkan `metadata` yang boleh masuk audit. Dokumentasikan allow-list field yang aman untuk `before`/`after`.

---

### AUD-03 — Ekspor mengambil seluruh tabel tanpa batas (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `audit.repository.ts:105-116`, `audit.service.ts:98-118`

`findForExport` tidak memakai `limit`/`offset` dan tidak membatasi jumlah baris, lalu seluruh hasil dibangun menjadi workbook di memori. `audit_logs` adalah tabel append-only yang tumbuh terus; ekspor tanpa filter tanggal akan memuat seluruh riwayat.

**Perbaikan:** wajibkan rentang `occurredFrom`/`occurredTo` (atau default 30 hari), dan/atau batasi `LIMIT` dengan pemberitahuan "gunakan filter untuk mempersempit". Pertimbangkan streaming workbook (`ExcelJS.stream.xlsx`) untuk data besar.

---

### AUD-04 — Partisi bulanan tidak pernah dibuat; semua data masuk default partition (Medium)

**Rule:** `db-use-migrations`, `perf-optimize-database`
**Lokasi:** `drizzle/0001_constraints.sql:19-31`, `db/audit-logs.schema.ts:10-15`

Tabel dideklarasikan `PARTITION BY RANGE (occurred_at)`, tetapi satu-satunya partisi yang dibuat adalah `audit_logs_default`. Tidak ada migrasi/job yang membuat partisi per bulan (`FOR VALUES FROM ... TO ...`). Akibatnya:
- semua baris masuk ke `audit_logs_default` (partisi tumbuh tanpa batas),
- manfaat partisi (pruning, detach/arsip, vacuum per partisi) tidak didapat,
- retensi/penghapusan data lama tidak bisa dilakukan lewat `DROP PARTITION`.

**Perbaikan:** buat job (cron/admin) yang memastikan partisi bulan berjalan dan bulan berikutnya ada, mis. `CREATE TABLE IF NOT EXISTS audit_logs_2026_11 PARTITION OF audit_logs FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');`. Tambahkan kebijakan retensi (detach partisi > N bulan, arsipkan). Catat juga bahwa `id` identity tidak unik lintas partisi (PK gabungan `id, occurred_at`) — sudah sesuai DDL.

---

### AUD-05 — Kegagalan audit dapat membatalkan transaksi bisnis (Medium)

**Rule:** `error-handle-async-errors`
**Lokasi:** `audit.service.ts:63-79`, `db/audit-logs.schema.ts:20-32`

`record` menulis dengan executor yang sama. Ini benar untuk konsistensi, tetapi beberapa field kolomnya berbatas panjang (`actor_type` 20, `role` 50, `employee_number` 50, `action` 100, `entity` 100, `entity_id` 100, `ip_address` 64, `request_id` 100). Nilai yang melebihi batas memicu `22001 value too long` dan **membatalkan seluruh transaksi bisnis** (mis. gagal menyimpan catatan hanya karena `request_id` panjang).

**Perbaikan:** potong nilai sebelum insert (seperti rekomendasi `auth.md` AUTH-10) atau ubah kolom yang tidak terikat kontrak menjadi `text`. Tambahkan test untuk nilai maksimum.

---

### AUD-06 — Query count berjalan berurutan dan mahal di tabel terpartisi (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `audit.repository.ts:84-103`

Data dan `count(*)` dijalankan berurutan. Untuk `audit_logs` yang besar, `count(*)` dengan filter `ilike` pada tiga kolom tanpa index bisa menjadi query paling mahal di halaman ini.

**Perbaikan:** jalankan paralel (`Promise.all`) atau gunakan `COUNT(*) OVER ()` pada query data. Untuk pencarian berbasis `ilike`, pertimbangkan index trigram (`gin_trgm_ops`) pada `username`/`employee_number`/`entity_id`.

---

### AUD-07 — Tidak ada index untuk filter `action` dan `actor_type` (Medium)

**Rule:** `perf-optimize-database`
**Lokasi:** `drizzle/0001_constraints.sql:30-32`, `audit.repository.ts:52-58`

Index yang tersedia: `occurred_at`, `(entity, entity_id)`, `(user_id, occurred_at)`. Filter `action` dan `actor_type` (dipakai UI audit) tidak terindeks, sehingga pada rentang waktu lebar query memindai partisi penuh. Filter `action` cukup umum untuk investigasi.

**Perbaikan:** tambahkan index `(action, occurred_at)` (atau `(action)` parsial bila action tertentu dominan) dan pertimbangkan `(actor_type, occurred_at)`.

---

### AUD-08 — Rekursi masking tanpa batas kedalaman/siklus (Low)

**Rule:** `error-handle-async-errors`
**Lokasi:** `audit.mask.ts:19-35`

`mask` menelusuri objek tanpa batas kedalaman dan tanpa penanganan referensi siklik. Payload audit berasal dari row DB/JSON (asiklik), sehingga risiko saat ini rendah; tetapi pemanggil baru bisa mengirim objek dengan referensi melingkar → stack overflow yang menggagalkan transaksi.

**Perbaikan:** tambahkan `depth` maksimum (mis. 6) dan `WeakSet` untuk mendeteksi siklus.

---

### AUD-09 — `search` tanpa batas panjang (Low)

**Rule:** `security-validate-all-input`
**Lokasi:** `common/query/query.dto.ts` (`search`), `audit.repository.ts:63-71`

`search` berasal dari `QueryDto` yang hanya `@IsString()`. Nilai sangat panjang diteruskan menjadi `%...%` di tiga kolom, memperberat query. Tambahkan `@MaxLength(100)` (berlaku untuk semua modul yang memakai `QueryDto`).

---

### AUD-10 — `actorType` hasil query di-cast tanpa validasi (Low)

**Rule:** `api-use-dto-serialization`
**Lokasi:** `audit.service.ts:119-135`

`toResponse` melakukan `row.actorType as AuditActorType`. Kolomnya `varchar(20)` bebas; nilai di luar `USER|SYSTEM` (dari seed/insert manual) akan lolos ke response dengan tipe yang salah. Tambahkan validasi/mapping ke `UNKNOWN` atau batasi kolom dengan CHECK/enum.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **`record(executor, entry)`** memaksa pemanggil menyertakan transaksi perubahan, sehingga audit dan data commit/rollback bersama.
- **Masking dipusatkan di service** (`before`/`after`/`metadata`) sehingga caller tidak bisa lupa.
- **Escaping LIKE** pada `toSearchPattern` (diuji: `_`, `%`, `\`) mencegah wildcard tak disengaja.
- **`endOfDayIfDateOnly`** memastikan batas `occurredTo` mencakup seluruh hari (diuji), mengingat kolom `timestamptz`.
- **Ekspor memakai `sanitizeCell`** dari util bersama (bukan salinan), dan men-sanitasi JSON `before`/`after`/`metadata` (diuji termasuk `=budi`, `=1+1`).
- **Audit mencatat ekspor dirinya sendiri** (`AUDIT_LOG_EXPORTED`) dengan filter yang dipakai dan jumlah baris (diuji).
- **`buildAuditFilters` diuji** per filter dan kombinasinya; DTO query diuji untuk UUID/actorType/tanggal invalid.
- **Append-only by design**: tidak ada endpoint update/delete audit.
- **Read tidak menghasilkan audit** (diuji) — menghindari banjir log.
- **`AuditModule` @Global** tetapi hanya mengekspor `AuditService`; repository/Excel tetap internal.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | AUD-01 | Isi audit (tanggal) hilang permanen |
| 2 | AUD-02 | Nilai sensitif bisa lolos ke log |
| 3 | AUD-04 | Partisi tidak berfungsi; tabel default tumbuh tanpa batas |
| 4 | AUD-03 | Ekspor tanpa batas berisiko OOM |
| 5 | AUD-05 | Audit bisa membatalkan transaksi bisnis |
| 6 | AUD-06, AUD-07 | Performa list/filter |
| 7 | AUD-08 … AUD-10 | Kebersihan |

---

## 5. Checklist tindak lanjut

- [ ] AUD-01 Tangani `Date`/`Buffer`/non-plain-object di `maskSensitive` + test
- [ ] AUD-02 Deteksi pola nilai sensitif (JWT/Bearer/DSN) atau allow-list metadata
- [ ] AUD-03 Wajibkan rentang tanggal / batasi baris ekspor (pertimbangkan streaming)
- [ ] AUD-04 Job pembuatan partisi bulanan + kebijakan retensi
- [ ] AUD-05 Potong nilai sesuai panjang kolom (atau ubah ke `text`)
- [ ] AUD-06 Paralelkan count / gunakan window count; index trigram untuk search
- [ ] AUD-07 Index `(action, occurred_at)` dan `(actor_type, occurred_at)`
- [ ] AUD-08 Batas kedalaman + deteksi siklus pada masking
- [ ] AUD-09 `@MaxLength` pada `QueryDto.search`
- [ ] AUD-10 Validasi/mapping `actorType` saat membaca
