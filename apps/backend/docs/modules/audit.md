# Module: AuditModule (Jejak Audit)

**Dibuat:** 2026-10-11
**File sumber yang dianalisis:**
- `audit/audit.module.ts`, `audit/audit.service.ts`, `audit/audit.repository.ts`
- `audit/audit.mask.ts`, `audit/audit.mask.spec.ts`
- Rujukan: `db/audit-logs.schema.ts`, `drizzle/0001_constraints.sql`

## Daftar Isi
1. [Ringkasan Module](#1-ringkasan-module)
2. [Peta File di Module Ini](#2-peta-file-di-module-ini)
3. [Penjelasan Kode per File](#3-penjelasan-kode-per-file)
4. [Alur Kerja Lengkap](#4-alur-kerja-lengkap)
5. [Hubungan dengan Module Lain](#5-hubungan-dengan-module-lain)
6. [Kesalahan Umum & Tips Pemula](#6-kesalahan-umum--tips-pemula)
7. [Catatan Kualitas Kode](#7-catatan-kualitas-kode)
8. [Rangkuman & Cek Pemahaman](#8-rangkuman--cek-pemahaman)

---

## 1. Ringkasan Module

**AuditModule** mencatat jejak semua perubahan penting ke tabel `audit_logs`: siapa yang melakukan, aksi apa, entitas mana, nilai sebelum/sesudah, dari IP mana. Tabel ini **append-only** (hanya boleh ditambah dan dibaca; tidak boleh diubah/dihapus). Nilai sensitif (password, token, dsb.) otomatis disamarkan.

Analogi: ini seperti **buku catatan notaris** yang mencatat setiap transaksi penting di kantor. Halamannya tidak bisa dihapus atau ditimpa, dan rahasia (seperti password) ditulis dalam bentuk "***" agar tidak bocor.

**Istilah baru:**
- **Audit log** = catatan kronologis kejadian/perubahan.
- **Append-only** = hanya bisa menambah, tidak bisa mengubah/menghapus.
- **Masking** = menyamarkan nilai sensitif.

---

## 2. Peta File di Module Ini

| Nama file | Jenis | Peran singkat |
|-----------|-------|---------------|
| `audit.module.ts` | Module (`@Global`) | Menyediakan `AuditService` global |
| `audit.service.ts` | Service | `record()` — menyusun & menyimpan entri audit (dengan masking) |
| `audit.repository.ts` | Repository | `insert()` ke `audit_logs` (hanya insert) |
| `audit.mask.ts` | Pure function | `maskSensitive()` menyamarkan kunci sensitif secara rekursif |
| `audit.mask.spec.ts` | Test | Uji penyamaran |

Diagram alur:

```mermaid
flowchart LR
    A["Service fitur (mis. UsersService)"] -->|record(tx, entry)| B["AuditService"]
    B --> C["maskSensitive(before/after/metadata)"]
    B --> D["AuditRepository.insert(tx, row)"]
    D --> E["DB: audit_logs (partitioned, append-only)"]
```

Versi teks:

```
Fitur (transaksi tx) → AuditService.record(tx, entry) → mask → AuditRepository.insert → audit_logs
```

---

## 3. Penjelasan Kode per File

### `audit.module.ts`

```ts
@Global()
@Module({
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
```

- **Fungsinya:** Menjadikan `AuditService` tersedia di seluruh aplikasi (`@Global`), sehingga module lain bisa langsung menyuntikkannya.
- **Kenapa dibuat seperti ini:** Karena hampir semua module fitur perlu menulis audit, jadikan global agar tidak perlu impor berulang.
- **Dampaknya:** Menghapus `exports` → semua service yang memanggil `audit.record` gagal DI. Menghapus module dari `AppModule` → audit tak bisa dipakai.
- **Analogi:** Menempatkan satu buku notaris di lobi untuk semua divisi.

### `audit.service.ts`

```ts
export type AuditActorType = 'USER' | 'SYSTEM';

export interface AuditEntry {
  actorType?: AuditActorType;
  userId?: string | null; username?: string | null; role?: string | null; employeeNumber?: string | null;
  action: string;
  entity?: string | null; entityId?: string | null;
  before?: unknown; after?: unknown; metadata?: Record<string, unknown> | null;
  ipAddress?: string | null; requestId?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async record(executor: DbExecutor, entry: AuditEntry): Promise<void> {
    await this.repository.insert(executor, {
      actorType: entry.actorType ?? 'USER',
      userId: entry.userId ?? null,
      username: entry.username ?? null,
      role: entry.role ?? null,
      employeeNumber: entry.employeeNumber ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      beforeData: maskSensitive(entry.before ?? null),
      afterData: maskSensitive(entry.after ?? null),
      metadata: maskSensitive(entry.metadata ?? null),
      ipAddress: entry.ipAddress ?? null,
      requestId: entry.requestId ?? null,
    });
  }
}
```

- **Fungsinya:** `record()` menerima `executor (tx)` + `AuditEntry`, mengisi nilai default, **menyamarkan** `before`/`after`/`metadata`, lalu menyimpan.
- **Kenapa dibuat seperti ini (keputusan desain kunci):**
  - **Wajib menerima `executor`**: pemanggil harus mengoper transaksi yang sama dengan perubahan yang dicatat, sehingga tulisan & audit **commit/gagal bersama**. Ini memenuhi aturan AGENTS.md.
  - **Masking terpusat**: dilakukan di satu tempat, sehingga pemanggil tak bisa lupa.
  - `actorType` default `'USER'` (sedangkan scheduler memakai `'SYSTEM'`).
- **Dampaknya:** Bila `record` dipanggil dengan `db` (bukan `tx`), audit tidak atomik dengan perubahan — bila proses gagal, bisa terjadi perubahan tanpa audit (atau sebaliknya). Bila masking dihapus, password/token bisa tersimpan di audit.
- **Analogi:** Notaris yang menulis catatan **di lembar yang sama** dengan surat transaksi (supaya tak bisa terpisah), dan selalu menyensor rahasia sebelum mencatat.
- **Istilah baru:** **Executor** = koneksi DB biasa atau transaksi; di sini memaksa pemakaian transaksi yang sama.

### `audit.repository.ts`

```ts
@Injectable()
export class AuditRepository {
  async insert(executor: DbExecutor, values: AuditLogInsert): Promise<void> {
    await executor.insert(auditLogs).values(values);
  }
}
```

- **Fungsinya:** Satu-satunya operasi: `INSERT` ke `audit_logs`.
- **Kenapa dibuat seperti ini:** **Tidak ada** `update`/`delete`. Ini menegakkan sifat append-only di tingkat aplikasi, selaras dengan grant DB (`app_user` hanya `SELECT`+`INSERT`). Sesuai AGENTS.md "audit rows are never updated or deleted by the app".
- **Dampaknya:** Kalau ada kebutuhan koreksi audit, **tidak bisa** lewat aplikasi (memang disengaja). Menambah method update/delete akan melanggar aturan.
- **Analogi:** Pena permanen, bukan pensil; tidak ada penghapus di meja notaris.
- **Istilah baru:** `auditLogs` didefinisikan di `db/audit-logs.schema.ts` (bukan `schema.ts`) karena tabelnya dibuat via migrasi SQL kustom (berpartisi + grant terbatas).

### `audit.mask.ts`

```ts
export const MASKED = '***';

const DENY_LIST = [/password/i, /token/i, /secret/i, /authorization/i, /cookie/i];

export function maskSensitive<T>(value: T): T { return mask(value) as T; }

function mask(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => mask(item));
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = DENY_LIST.some((pattern) => pattern.test(key)) ? MASKED : mask(val);
    }
    return result;
  }
  return value;
}
```

- **Fungsinya:** Menelusuri struktur data (objek/array/nested) dan mengganti nilai kunci yang **cocok** dengan daftar terlarang menjadi `'***'`. Kunci yang cocok (case-insensitive): mengandung `password`, `token`, `secret`, `authorization`, atau `cookie`.
- **Kenapa dibuat seperti ini:** Pendekatan deny-list sederhana & rekursif, dijalankan terpusat. Menangani nested object & array (mis. `profile.refreshToken`, `items[].accessToken`).
- **Dampaknya:** Jika ada kunci sensitif baru yang tidak cocok pola ini (mis. `pin`, `otp`, `cardNumber`), nilainya **tidak** akan disamarkan. Perlu memperbarui `DENY_LIST`.
- **Analogi:** Sensor yang mencoret kolom berlabel "rahasia" di mana pun kolom itu berada (termasuk di dalam lampiran).
- **Istilah baru:** **Deny-list** = daftar yang dilarang/ditolak. **Regex (pola)** = pola pencocokan teks; `i` = tidak peka huruf besar/kecil.

### `audit.mask.spec.ts`

```ts
it('masks deny-listed keys at any depth', ...);   // password, profile.refreshToken, items[0].accessToken
it('leaves primitives and null untouched', ...);  // null, 42, 'plain'
```

- **Fungsinya:** Menguji bahwa masking berjalan di semua kedalaman dan tidak merusak nilai primitif.
- **Kenapa:** Masking adalah kontrol keamanan; test menjaganya dari regresi.
- **Analogi:** Daftar periksa audit yang memastikan sensor benar-benar bekerja.

---

## 4. Alur Kerja Lengkap

Skenario: **UsersService membuat user baru.**

1. `UsersService.create` memulai `dbService.transaction(async (tx) => { ... })`.
2. Di dalam transaksi yang sama: insert user → set departemen → `this.audit.record(tx, { action: 'USER_CREATED', entity: 'user', entityId, after: { username, role }, ...this.actor() })`.
3. `AuditService.record` mengisi default, menyamarkan `after` (bila ada kunci sensitif), lalu `AuditRepository.insert(tx, row)`.
4. Karena memakai `tx` yang sama, entri audit ikut ter-commit hanya bila seluruh transaksi sukses; bila gagal, semuanya rollback.
5. Entri tersimpan di `audit_logs` (partisi bulanan). Aplikasi tidak pernah mengubah/menghapusnya.

Skenario sistem: **Scheduler appraisal.** `runScheduler` memanggil `audit.record(tx, { actorType: 'SYSTEM', action: 'APPRAISAL_CREATED'/'SCHEDULER_RUN', ... })` — pelaku adalah sistem, bukan user.

---

## 5. Hubungan dengan Module Lain

**Tidak bergantung pada module fitur apa pun** (hanya `db` & common types). Ini module yayasan.

**Dipakai oleh (hampir semua):** Users, Auth (perlu konfirmasi—lihat bagian 7), Departments, Positions, Employees, Contracts, Criteria, Appraisals, Imports — semuanya memanggil `AuditService.record`. `AuditService` diekspos (juga global).

**Dampak jika diubah/dihapus:**
- Menghapus module/service → semua service yang audit gagal DI; aplikasi mungkin tak bisa start.
- Mengubah `maskSensitive` → bisa membocorkan atau menyembunyikan berlebihan.
- Menambah operasi update/delete di repository → melanggar sifat append-only.

---

## 6. Kesalahan Umum & Tips Pemula

1. **Memanggil `audit.record(this.db, ...)` alih-alih `record(tx, ...)`.** Audit jadi tidak atomik dengan perubahannya.
2. **Lupa mengoper aktor** (`...this.actor()`) → audit tanpa pelaku/IP.
3. **Menambah kunci sensitif baru tanpa memperbarui `DENY_LIST`.** Rahasia bisa tersimpan.
4. **Mencoba "memperbaiki" entri audit lewat kode.** Tidak ada method-nya (dan DB pun menolak update/delete untuk peran aplikasi).
5. **Mengandalkan audit untuk data yang tak pernah dipanggil `record`.** Contoh: modul yang tidak memanggil audit tidak tercatat.

**Pesan error yang mungkin muncul:**
- `permission denied for table audit_logs` → peran DB mencoba `UPDATE`/`DELETE` (memang tidak diizinkan).
- `relation "audit_logs" does not exist` → migrasi `0001` belum dijalankan.
- `Nest can't resolve dependencies of AuditService` → AuditModule tidak terdaftar/lupa export.

---

## 7. Catatan Kualitas Kode

- **Belum ada endpoint baca audit.** Meskipun ada izin `'audit:read'` ([ADMIN, HR]) di matriks `permissions.ts`, **tidak ada controller** untuk membaca `audit_logs`. *Perlu konfirmasi:* apakah pembacaan audit akan ditambahkan nanti atau memang diakses lewat alat lain (mis. query DB langsung).
- **Auth tidak menulis audit.** `AuthService`/`JwtStrategy` tidak memanggil `AuditService` (mis. login/logout tak tercatat). Padahal peristiwa autentikasi biasanya penting untuk audit keamanan. *Perlu konfirmasi.*
- **`DailyNotesService` tidak menulis audit** (lihat module `daily-notes`). Ini celah kepatuhan dibanding aturan "every write creates an audit entry".
- **Deny-list berbasis pola nama kunci.** Kunci sensitif yang tak mengandung kata kunci (mis. `pin`, `otp`, `cvv`, `nid`) akan lolos. Saran: perluas `DENY_LIST` sesuai daftar PII proyek.
- **Tidak ada masalah keamanan kritis pada mekanismenya.** Masking terpusat + tabel append-only + grant DB adalah praktik yang baik.

---

## 8. Rangkuman & Cek Pemahaman

**Poin kunci:**
1. AuditModule mencatat jejak perubahan ke `audit_logs` yang append-only.
2. `AuditService.record(executor, entry)` **wajib** dijalankan dalam transaksi yang sama dengan perubahan, agar atomic.
3. Masking nilai sensitif dilakukan terpusat (`maskSensitive`) berdasarkan deny-list (password/token/secret/authorization/cookie).
4. Repository hanya menyediakan `insert` — tidak ada update/delete.
5. Dipakai hampir semua module fitur (juga oleh scheduler dengan `actorType: 'SYSTEM'`).

**Pertanyaan latihan:**

1. *Kenapa `record` menerima `executor` (transaksi), bukan memakai koneksi biasa?*
   → Agar entri audit dan perubahan datanya commit/gagal bersamaan (atomic); tidak ada perubahan tanpa jejak.

2. *Di mana pengamanan agar password/token tidak masuk audit?*
   → Di `maskSensitive` (audit.mask.ts), dijalankan otomatis dalam `AuditService.record` — pemanggil tak bisa lupa.

3. *Bagaimana sifat append-only ditegakkan di dua lapisan?*
   → Di aplikasi: `AuditRepository` hanya punya `insert`. Di database: grant `app_user` hanya `SELECT`+`INSERT` (migrasi 0001).
