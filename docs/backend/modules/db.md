# Audit: Db (`src/db/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`db-*`, `arch-use-repository-pattern`, `perf-optimize-database`, `devops-*`)
**File yang diperiksa (12 + migrasi):**

| Kelompok | File |
|----------|------|
| Koneksi | `db.module.ts`, `db.service.ts`, `db.constants.ts`, `db.type.ts` |
| Skema | `schema.ts` (647 baris), `audit-logs.schema.ts` |
| Helper | `helpers/soft-delete.ts` |
| Seed | `seed.ts`, `seed-demo.ts`, `seed.plan.ts`, `seed.plan.spec.ts` |
| Migrasi | `migrate.ts`, `drizzle/0000`–`0014` (termasuk `0001_constraints.sql`, `0002_drop_contract_status.sql`, `0005`, `0007`, `0008`, `0012`, `0014`) |

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 2 | DB-01, DB-02 |
| Medium | 7 | DB-03 … DB-09 |
| Low | 7 | DB-10 … DB-16 |

Skema ini sudah matang: soft delete dengan partial unique index, exclusion constraint anti-overlap kontrak (`btree_gist`), versi kriteria unik per departemen via `coalesce`, audit log terpartisi + grant terbatas, dan snapshot data karyawan pada appraisal (bagus untuk histori). Temuan utama menyangkut **seed produksi yang menulis data placeholder**, **transaksi seed**, dan **konsistensi soft delete**.

---

## 2. Temuan & Perbaikan

### DB-01 — Seed produksi membuat criteria set ACTIVE berisi bobot placeholder (High)

**Lokasi:** `seed.ts:86-128` (khususnya `:100-101`), `seed.ts:177-184`, `seed.plan.ts:100-110`

`resolveSeedPlan` selalu mengembalikan `referenceData: true` (termasuk produksi), dan `main()` menjalankan:

```ts
if (plan.referenceData) {
  await seedCriteriaSet(db);
  if (plan.isProduction) { /* departments & positions skipped */ }
  ...
}
```

`seedCriteriaSet` membuat:

```ts
status: 'ACTIVE',
note: 'Initial criteria set (placeholder weights — confirm with HR)',
...
weight: 20, // 5 kriteria
```

Akibatnya, di **produksi** seed menciptakan satu-satunya criteria set global yang **langsung ACTIVE** dan dipakai scheduler/appraisal, dengan bobot dummy 20%. Sementara departments/positions sengaja dilewati — jadi data referensi yang paling berpengaruh justru yang placeholder.

**Perbaikan (pilih salah satu):**
- Di produksi, buat set sebagai `DRAFT` dan biarkan HR mengaktifkan setelah bobot diisi; atau
- Keluarkan `seedCriteriaSet` dari blok `referenceData` produksi (hanya jalankan di development/test); atau
- Wajibkan flag eksplisit `SEED_REFERENCE_DATA=true` untuk menulis apa pun di produksi.

Sertakan warning pada `SeedPlan` bila tetap membuat set placeholder.

---

### DB-02 — Seed tidak transaksional; kegagalan di tengah meninggalkan state yang tidak bisa pulih otomatis (High)

**Lokasi:** `seed.ts:165-193` (tidak ada `db.transaction`), `seed.ts:87-95` (skip berbasis count)

Seluruh langkah seed berurutan tanpa transaksi. Pola skip-nya berbasis "apakah tabel sudah berisi data":

```ts
const [row] = await db.select({ count: sql`count(*)` }).from(schema.criteriaSets);
if (Number(row?.count ?? 0) > 0) { console.log('... skipped'); return; }
```

Bila proses gagal setelah `criteriaSets.insert` tetapi sebelum semua `criteria`/`criteria_scale_descriptions` selesai (mis. koneksi putus), re-run akan melihat `count > 0` dan **melewati seluruh pembuatan kriteria**. Hasilnya set ACTIVE tanpa 5 kriteria — permanen, sampai ada intervensi manual.

**Perbaikan:**
1. Bungkus seluruh seeding dalam satu transaksi:
```ts
await db.transaction(async (tx) => { /* semua langkah memakai tx */ });
```
2. Ubah skip-check menjadi per-entitas, bukan per-count tabel (mis. "exists code QUALITY di set ini?").
3. Tambahkan validasi akhir: set ACTIVE harus punya kriteria dengan total bobot 100; jika tidak, gagalkan seed dengan pesan jelas.

---

### DB-03 — Soft delete punya dua kolom dan dua predikat yang berbeda (Medium)

**Lokasi:** `schema.ts:23-31` (`isDeleted` + `deletedAt`), `helpers/soft-delete.ts:9`, index parsial di `schema.ts:160-162, 186-188, 304-309, 336-338, 398-400` vs `schema.ts:434-437, 456-459`

`baseFields` menyediakan **dua** penanda: `is_deleted` dan `deleted_at`.

- Helper `notDeleted()` memfilter `deleted_at IS NULL` dan docstring-nya melarang menulis filter manual.
- Sebagian partial unique index memakai `deleted_at is null` (employees, contracts, daily_notes, appraisals).
- Sebagian lagi memakai `is_deleted = false` (criteria_fields, criteria label).
- Repository saat ini selalu menulis keduanya (`isDeleted: true, deletedAt: new Date()`), jadi belum ada bug — tetapi tidak ada constraint yang memaksa keduanya konsisten.

Jika suatu saat hanya satu kolom yang di-update (script manual, migrasi, query baru), maka:
- `notDeleted()` bisa mengembalikan baris yang "terhapus" (kebocoran data), atau
- partial unique index memblokir pembuatan data baru padahal baris lama tidak terlihat.

**Perbaikan:** pilih satu sumber kebenaran. Rekomendasi: `deleted_at` saja (timestamp memberi informasi kapan), lalu:
- hapus `is_deleted` dari `baseFields` dan semua query/index (perubahan besar, perlu migrasi), atau
- tambahkan `CHECK ((is_deleted = (deleted_at IS NOT NULL)))` agar keduanya tidak bisa divergen.

Opsi kedua lebih murah dan langsung menutup risiko.

---

### DB-04 — `created_at`/`updated_at` tanpa timezone, tidak konsisten dengan tabel lain (Medium)

**Lokasi:** `schema.ts:23-28` vs `schema.ts:53, 73, 214, 473`

`baseFields` memakai `timestamp('created_at')` (timestamp **without** time zone), sedangkan `users.lastLoginAt`, `refresh_tokens.expires_at`, `criteria_sets.activated_at`, dan `appraisal_status_history.created_at` memakai `withTimezone: true` (timestamptz). Audit log juga timestamptz.

Di server dengan TZ berbeda (atau setelah pindah region), nilai tanpa timezone diinterpretasikan memakai zona koneksi — membandingkan `created_at`/`updated_at` antar tabel bisa bergeser beberapa jam.

**Perbaikan:** ubah `baseFields` ke `{ withTimezone: true }`. Perlu migrasi `ALTER COLUMN ... TYPE timestamptz USING ... AT TIME ZONE 'UTC'` untuk data lama; jadwalkan bersama migrasi lain.

---

### DB-05 — Konfigurasi pool PostgreSQL minimal (Medium)

**Lokasi:** `db.module.ts:16-20`

```ts
new Pool({ connectionString: configService.get<string>('DATABASE_URL') })
```

Tidak ada `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`, maupun `statement_timeout`. Default `pg` adalah `max: 10` per proses. Konsekuensi:
- dengan beberapa instance aplikasi, jumlah koneksi ke PostgreSQL cepat habis,
- query yang macet tidak pernah diputus (tidak ada `statement_timeout`), sehingga satu request dapat menahan koneksi selamanya,
- `connectionTimeoutMillis` default `0` (menunggu tanpa batas).

**Perbaikan:**
```ts
new Pool({
  connectionString,
  max: Number(configService.get('DB_POOL_MAX') ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 15_000,
});
```
Tambahkan key baru di `env.validation.ts` (lihat `config.md` CFG-06).

---

### DB-06 — Partial unique index tidak konsisten pada tabel soft-deletable (Medium)

**Lokasi:** `schema.ts:252` (`criteria`), `:434-437` (`appraisal_employees`), `:456-459` (`appraisal_ratings`)

Beberapa unique index **tidak** memakai filter `deleted_at IS NULL` / `is_deleted = false`, berbeda dari pola tabel lain:

| Tabel | Unique index | Filter | Akibat |
|-------|--------------|--------|--------|
| `employees` | `employeeNumber` | `deleted_at is null` | ✅ nomor bisa dipakai ulang |
| `contracts` | `(employeeId, startDate)` | `deleted_at is null` | ✅ |
| `criteria` | `(criteriaSetId, code)` | **tidak ada** | kode tidak bisa dipakai ulang setelah soft delete |
| `appraisal_employees` | `(appraisalId, employeeId)` | **tidak ada** | peserta yang dihapus tidak bisa ditambahkan kembali |
| `appraisal_ratings` | `(appraisalEmployeeId, criterionId)` | **tidak ada** | idem |

**Perbaikan:** seragamkan. Untuk `appraisal_employees`/`appraisal_ratings` kemungkinan filter `deleted_at is null` yang benar (mengikuti pola tabel lain), lalu buat migrasi index. Untuk `criteria`, putuskan apakah kode harus unik lintas versi termasuk yang terhapus.

---

### DB-07 — Index hilang pada kolom FK yang sering dibaca (Medium)

**Lokasi:** `schema.ts:463-476` (`appraisalStatusHistory`), `:64-80` (`refreshTokens`)

PostgreSQL **tidak** otomatis membuat index untuk FK. Yang belum terindeks:
- `appraisal_status_history.appraisal_id` — dipakai untuk menampilkan riwayat transisi per appraisal; tanpa index, setiap detail appraisal memindai seluruh tabel yang terus bertambah.
- `refresh_tokens.expires_at` — untuk pembersihan token kedaluwarsa (job/manual).
- `refresh_tokens.revoked_at` (opsional, bila ada query pembersihan).

**Perbaikan:**
```ts
index('idx_appraisal_status_history_appraisal').on(table.appraisalId),
index('idx_refresh_tokens_expires').on(table.expiresAt),
```
Buat melalui migrasi; untuk tabel riwayat yang sudah besar pertimbangkan `CREATE INDEX CONCURRENTLY`.

---

### DB-08 — `numeric` dengan `mode: 'number'` untuk bobot & skor (Medium)

**Lokasi:** `schema.ts:243-247` (`criteria.weight`), `:430` (`appraisal_employees.totalScore`)

Drizzle memetakan `numeric` menjadi `number` JS (floating point). Untuk bobot yang harus berjumlah tepat 100 dan skor akhir, representasi biner dapat menghasilkan `99.99999999` atau `84.99999999`; perbandingan `totalWeight === 100` dan pembulatan laporan bisa meleset.

**Perbaikan:** pilih salah satu:
- `mode: 'string'` dan lakukan aritmetika dengan desimal (mis. `decimal.js`), atau
- simpan sebagai integer basis poin (mis. bobot `2000` = 20.00%), atau
- tetap `number` tetapi selalu bandingkan dengan toleransi (`Math.abs(sum - 100) < 0.01`) dan bulatkan saat menulis.

Konsistenkan juga aturan "total bobot = 100" antara validasi aplikasi (criteria) dan constraint DB (saat ini hanya `weight > 0`).

---

### DB-09 — `migrationsFolder` relatif terhadap working directory (Medium)

**Lokasi:** `migrate.ts:12`

```ts
await migrate(db, { migrationsFolder: './drizzle' });
```

`./drizzle` diresolusi dari CWD. Menjalankan `node dist/db/migrate.js` dari root monorepo, systemd, atau image dengan `WORKDIR` berbeda akan gagal "folder not found" — padahal script produksi justru dipanggil dari konteks yang tidak seragam.

**Perbaikan:**
```ts
import { join } from 'path';
await migrate(db, { migrationsFolder: join(__dirname, '../../drizzle') });
```
atau jadikan env (`MIGRATIONS_DIR`) dengan default yang aman.

---

### DB-10 — `updated_at` hanya diperbarui oleh Drizzle (Low)

**Lokasi:** `schema.ts:25-28`

`$onUpdateFn(() => new Date())` adalah fitur sisi klien Drizzle: hanya berjalan saat update lewat query builder Drizzle. Update via SQL mentah (migrasi backfill, perbaikan manual, job external) tidak menyentuh `updated_at`.

**Perbaikan:** pertimbangkan trigger `BEFORE UPDATE` di database untuk `updated_at`, atau dokumentasikan bahwa semua penulisan harus lewat repository Drizzle.

---

### DB-11 — `migrate.ts` tidak memvalidasi `DATABASE_URL` dan tidak mengunci eksekusi (Low)

**Lokasi:** `migrate.ts:8-10`

`new Pool({ connectionString: process.env.DATABASE_URL })` dengan `undefined` menghasilkan error koneksi yang membingungkan. Juga tidak ada advisory lock, sehingga dua instance yang start bersamaan dapat menjalankan migrasi paralel (drizzle membungkus per-migrasi dalam transaksi, tetapi tidak mengoordinasikan antar-proses).

**Perbaikan:** tolak start bila `DATABASE_URL` kosong, dan bungkus dengan `pg_advisory_lock(<konstanta>)` / `pg_try_advisory_lock`.

---

### DB-12 — Definisi `audit_logs` terduplikasi antara schema dan migrasi SQL (Low)

**Lokasi:** `audit-logs.schema.ts:10-33` vs `drizzle/0001_constraints.sql:19-39`

Tabel audit didefinisikan dua kali: objek Drizzle (untuk tipe & query) dan DDL manual (untuk partisi + grant). Keduanya harus dijaga sinkron secara manual; perubahan kolom di satu sisi tanpa sisi lain baru terasa saat runtime (query menyebut kolom yang tidak ada).

**Perbaikan:** tambahkan test/migrasi yang membandingkan `information_schema.columns` dengan definisi Drizzle, atau minimal komentar silang di kedua file yang menyebut pasangannya (sudah ada sebagian di `audit-logs.schema.ts`).

---

### DB-13 — Kolom `refresh_tokens.replaced_by` tidak dipakai (Low)

**Lokasi:** `schema.ts:74`

Rotasi refresh token sudah dihapus (lihat dokumentasi Auth), sehingga `replaced_by` selalu NULL dan tidak pernah dibaca. Kandidat penghapusan end-to-end (schema + migrasi + tipe) sesuai kebiasaan proyek menghapus kode/kolom mati.

---

### DB-14 — `employees.supervisor_id` tanpa foreign key (Low)

**Lokasi:** `schema.ts:156`

```ts
supervisorId: uuid('supervisor_id'), // self-reference configured in relations
```

Relasi Drizzle hanya untuk query; tidak ada constraint DB. Nilai supervisor yang menunjuk ke karyawan yang tidak ada (atau terhapus keras) bisa masuk.

**Perbaikan:** tambahkan FK self-reference (`references((): AnyPgColumn => employees.id)`) dengan `onDelete: 'set null'`, atau dokumentasikan alasan tidak memakainya.

---

### DB-15 — Seed menyisipkan kriteria satu per satu (Low)

**Lokasi:** `seed.ts:104-128`

Untuk setiap kriteria ada `insert ... returning` lalu satu insert tambahan untuk scale descriptions (10 insert untuk 5 kriteria). `seed-demo.ts` sudah memakai batch insert. Tidak masalah untuk 5 baris, tetapi pola ini mudah tersalin ke data yang lebih besar.

**Perbaikan:** kumpulkan dalam array lalu satu `insert(...).values(rows)` per tabel (memakai id yang sudah di-generate atau `returning` batch).

---

### DB-16 — Aturan periode dan FK yang perlu dipastikan (Low, **Perlu konfirmasi**)

- `appraisals.period` memiliki CHECK "harus tanggal 1" (`0001_constraints.sql:8`), tetapi `daily_notes.period` (`schema.ts:329`) tidak. Jika aturan yang sama berlaku, tambahkan CHECK serupa.
- `daily_note_values.field_id` memakai `ON DELETE NO ACTION` (`0005_daily_note_dynamic_form.sql`), sedangkan `criteria_fields` di-cascade dari `criteria_sets`. Menghapus set kriteria yang sudah dipakai catatan harian akan gagal dengan FK violation generik. Pastikan ini memang pengaman yang diinginkan (konsisten dengan aturan "versi ACTIVE tidak boleh dihapus"), dan petakan error-nya di exception filter.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Soft delete + partial unique index** pada `employees`, `contracts`, `daily_notes`, `appraisals` memungkinkan nomor/kode/period dipakai ulang setelah penghapusan logis.
- **Exclusion constraint** `contracts_no_overlap` memakai `daterange(..., 'infinity')` dan `btree_gist` — anti-tumpang-tindih ditegakkan di DB, bukan hanya di aplikasi; filter error `23P01` sudah dipetakan ke 422.
- **Versi kriteria unik per departemen** memakai `coalesce(department_id, zero-uuid)` sehingga set global (`NULL`) tetap unik.
- **Audit log append-only terpartisi** per bulan dengan grant `SELECT, INSERT` saja untuk `app_user`, plus index `(entity, entity_id)` dan `(user_id, occurred_at)`.
- **Snapshot karyawan pada `appraisal_employees`** (nomor, nama, departemen, posisi, kontrak) — data historis tidak berubah saat master data berubah.
- **`seed.plan.ts` murni dan diuji menyeluruh** (`seed.plan.spec.ts`), termasuk menolak password placeholder `.env.example` di produksi.
- **`db.type.ts`** menurunkan tipe `Transaction` dari `Database['transaction']` sehingga repository bisa menerima `tx` tanpa `any`.
- **Constraint aplikasi di DB** untuk `criteria` (`scale_min < scale_max`, `weight > 0`) dan `appraisals` (periode tanggal 1).
- **Backfill migration** (`0014`) mendokumentasikan alasan dan mengisi data lama sebelum kolom dipakai.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | DB-01 | Data produksi bisa langsung memakai bobot placeholder |
| 2 | DB-02 | Kegagalan seed meninggalkan state permanen yang salah |
| 3 | DB-03 | Mencegah kebocoran data terhapus / blokir unik di masa depan |
| 4 | DB-05 | Stabilitas koneksi DB di produksi |
| 5 | DB-06, DB-07 | Integritas & performa query |
| 6 | DB-04, DB-08, DB-09 | Konsistensi waktu, presisi nilai, operasional migrasi |
| 7 | DB-10 … DB-16 | Kebersihan & kesiapan jangka panjang |

---

## 5. Checklist tindak lanjut

- [ ] DB-01 Seed produksi: jangan buat criteria set ACTIVE placeholder (DRAFT atau skip)
- [ ] DB-02 Bungkus seed dalam transaksi + skip per-entitas + validasi total bobot
- [ ] DB-03 Pilih satu penanda soft delete atau tambahkan CHECK konsistensi
- [ ] DB-04 Migrasi `baseFields` ke `timestamptz`
- [ ] DB-05 Konfigurasi pool (`max`, timeout, `statement_timeout`) + env baru
- [ ] DB-06 Seragamkan partial unique index (`appraisal_employees`, `appraisal_ratings`, `criteria`)
- [ ] DB-07 Tambah index `appraisal_status_history.appraisal_id`, `refresh_tokens.expires_at`
- [ ] DB-08 Putuskan strategi presisi bobot/skor (`string`, integer, atau toleransi)
- [ ] DB-09 Resolusi `migrationsFolder` lewat `__dirname`/env
- [ ] DB-10 (opsional) Trigger `updated_at`
- [ ] DB-11 Validasi `DATABASE_URL` + advisory lock di `migrate.ts`
- [ ] DB-12 Tambahkan pengaman sinkronisasi `audit_logs` schema vs DDL
- [ ] DB-13 Hapus `replaced_by` (schema + migrasi + tipe)
- [ ] DB-14 Tambah FK `supervisor_id` atau dokumentasikan alasannya
- [ ] DB-15 Batch insert pada seed kriteria
- [ ] DB-16 Konfirmasi CHECK `daily_notes.period` & perilaku FK `daily_note_values.field_id`
