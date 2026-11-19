# Audit: Criteria (`src/criteria/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`arch-*`, `db-*`, `api-*`, `security-*`, `test-*`)
**File yang diperiksa (12):**
- `criteria.module.ts`, `criteria.controller.ts`, `criteria.service.ts`, `criteria.repository.ts`, `criteria.validation.ts`
- `dto/create-criteria-set.dto.ts`, `dto/update-criteria-set.dto.ts`, `dto/criteria-query.dto.ts`
- `interfaces/criteria-set.interface.ts`, `interfaces/criterion.interface.ts`
- `criteria.service.spec.ts`, `criteria.validation.spec.ts`
- Rujukan: `packages/types`, `db/schema.ts`, `migrations/0007`, `0008`, `0009`, `common/utils/field-validation.ts`, `daily-notes/daily-note.validation.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | CRT-01 |
| Medium | 7 | CRT-02 … CRT-08 |
| Low | 4 | CRT-09 … CRT-12 |

Ini module dengan aturan bisnis paling matang: versi per departemen, siklus `DRAFT → ACTIVE → ARCHIVED`, bobot wajib 100 dengan toleransi, deskripsi tiap skor wajib lengkap, update ACTIVE dibatasi ADMIN dan hanya boleh mengubah konten, field form dinamis disinkronkan dengan aman (soft delete bila sudah dipakai, hard delete bila belum), dan validasi dipisah sebagai fungsi murni yang diuji menyeluruh. Satu kelemahan besar: **batas skala (`scaleMin`/`scaleMax`) masih bisa diubah pada set ACTIVE**, yang bisa membuat rating yang sudah ada tidak valid.

---

## 2. Temuan & Perbaikan

### CRT-01 — `scaleMin`/`scaleMax` bisa diubah pada set ACTIVE (High, **Perlu konfirmasi**)

**Rule:** `arch-single-responsibility` (integritas aturan), `db-use-transactions`
**Lokasi:** `criteria.validation.ts:64-101` (`validateActiveCriteriaUpdate`), `criteria.service.ts:262-290`, `criteria.validation.spec.ts:150-166`

`validateActiveCriteriaUpdate` hanya mengunci:
- jumlah & identitas kriteria (`id` harus sama),
- `weight` (tidak boleh berubah).

Yang **tidak** dikunci: `code`, `scaleMin`, `scaleMax`. Test bahkan secara eksplisit menerima perubahan `scaleMax: 5 → 6`.

Padahal `appraisal_ratings.rating` menyimpan angka mentah. Bila set ACTIVE yang sudah dipakai untuk penilaian diubah `scaleMax` dari 5 menjadi 4 (atau `scaleMin` naik), rating lama (mis. 5) menjadi di luar rentang yang dideklarasikan. Perhitungan skor dan validasi lanjutan bisa menghasilkan data tidak konsisten, dan laporan/excel kehilangan makna. Mengubah `code` pada set ACTIVE juga menggeser arti historis laporan yang di-key berdasarkan kode.

**Perbaikan:** kunci struktur pada ACTIVE:
```ts
if (criterion.scaleMin !== current.scaleMin || criterion.scaleMax !== current.scaleMax) {
  throw new BusinessLogicException('Scale bounds are locked on an ACTIVE set', 'CRITERIA_SCALE_LOCKED');
}
```
`code` sebaiknya juga dikunci (atau perubahan `code` dicatat khusus di audit). Jika perubahan batas skala memang dibutuhkan, arah yang benar adalah versi baru (DRAFT → ACTIVE), bukan mengedit yang sedang berlaku. **Perlu konfirmasi** karena test saat ini menyatakan sebaliknya.

---

### CRT-02 — `createDraft` tidak memvalidasi daftar kriteria (Medium)

**Rule:** `security-validate-all-input`
**Lokasi:** `criteria.service.ts:107-186` (khususnya `:157`), `criteria.service.ts:209-212`

```ts
validateFields(fieldList ?? []);
await this.criteriaRepository.replaceCriteria(set.id, criteriaList ?? [], tx);
```

Tidak ada `validateCriteriaSet(criteriaList)`, padahal jalur `update` DRAFT memanggilnya (`:209-212`). Akibatnya `POST /criteria-sets` dapat menyimpan DRAFT dengan:
- total bobot ≠ 100,
- kode kriteria duplikat,
- `scaleMin >= scaleMax`,
- deskripsi skor tidak lengkap.

Aktivasi memang menolak set seperti itu (`activate` memanggil `validateCriteriaSet`), tetapi data invalid tetap tersimpan, bisa dikloning menjadi DRAFT berikutnya, dan memberi pengalaman membingungkan (baru ditolak saat activate).

**Perbaikan:** panggil `validateCriteriaSet(criteriaList ?? [])` setelah menyusun daftar (termasuk hasil clone), sebelum `replaceCriteria`.

---

### CRT-03 — Endpoint baca terbuka untuk semua role dan tanpa scope (Medium)

**Rule:** `security-use-guards`
**Lokasi:** `criteria.controller.ts:30-59` (`GET /criteria-sets`, `/available`, `/active`, `/:id`), `criteria.service.ts:45-105`

Tidak ada `@Roles` pada endpoint GET, sehingga semua user login dapat:
- `GET /criteria-sets` → seluruh versi **termasuk DRAFT** lengkap dengan bobot, deskripsi skala, dan form field,
- `GET /criteria-sets/available?departmentId=...` dan `/active?departmentId=...` untuk departemen mana pun (tanpa cek scope).

Draft kriteria adalah materi internal HR sebelum diaktifkan; menampilkannya ke seluruh karyawan bisa membocorkan rencana penilaian. `findAll` juga mengembalikan isi penuh setiap versi (lihat CRT-07).

**Perbaikan:** batasi `findAll` ke `ADMIN/HR` (atau minimal sembunyikan DRAFT untuk role lain), dan pertimbangkan scope departemen untuk `available`/`active` agar user non-global hanya melihat departemennya.

---

### CRT-04 — Pengecekan ADMIN memakai `roles[0]` (Medium)

**Rule:** `security-use-guards`
**Lokasi:** `criteria.service.ts:193`

```ts
const role = this.requestContext.getUser()?.roles?.[0] ?? null;
...
if (set.status === 'ACTIVE' && role !== UserRole.ADMIN) throw new ForbiddenException(...)
```

User dengan beberapa role (mis. `['HR','ADMIN']`) akan **ditolak** mengedit ACTIVE meskipun ADMIN, karena role pertama bukan ADMIN. Berbeda dengan `RolesGuard` yang memakai `includes`. Sama polanya dengan `common.md` CMM-02.

**Perbaikan:** `const isAdmin = user?.roles?.includes(UserRole.ADMIN) ?? false;`

---

### CRT-05 — Audit tidak menyimpan isi perubahan (Medium)

**Rule:** `devops-use-logging` (kelengkapan audit)
**Lokasi:** `criteria.service.ts:168-177` (create), `:223-233` & `:292-305` (update), `:349-379` (activate)

Audit hanya mencatat `version/status/departmentId` atau *jumlah* kriteria/field:

```ts
after: { note: dto.note, criteriaCount: dto.criteria?.length, fieldsCount: dto.fields?.length, ... }
```

Perubahan bobot, teks skala, atau field form tidak dapat direkonstruksi. Untuk data yang menentukan perhitungan penilaian, ini melemahkan kegunaan audit.

**Perbaikan:** simpan ringkasan terstruktur `before`/`after` (kriteria: `id/code/weight/scaleMin/scaleMax`, fields: `id/fieldKey/label/inputType/required`) atau gunakan diff seperti `users.service.ts` `changedFields`.

---

### CRT-06 — Race condition pada versi & aktivasi menghasilkan error generik (Medium)

**Rule:** `db-use-transactions`
**Lokasi:** `criteria.service.ts:114` (`getMaxVersion + 1`), `:326-379` (`activate`), `db/schema.ts:218-226`

- `createDraft` menghitung `max(version) + 1` di dalam transaksi, tetapi dua request paralel dapat membaca nilai yang sama → keduanya insert → `uq_criteria_sets_department_version` menolak salah satu dengan `23505` generik (409 `UNIQUE_VIOLATION`) alih-alih pesan domain.
- `activate` menjalankan `archiveActive` lalu `activate`; dua aktivasi paralel pada departemen yang sama dapat melanggar `uq_criteria_sets_department_active`.

**Perbaikan:** tangkap `23505` pada kedua constraint dan petakan ke `409` dengan `errorCode` (`CRITERIA_SET_VERSION_CONFLICT`, `CRITERIA_SET_ALREADY_ACTIVE`); atau kunci baris departemen (`SELECT ... FOR UPDATE`) saat menghitung versi/aktivasi.

---

### CRT-07 — `findAll` mengembalikan seluruh versi beserta isi lengkap (Medium)

**Rule:** `perf-optimize-database`, `api-use-dto-serialization`
**Lokasi:** `criteria.service.ts:45-61`, `criteria.repository.ts:59-70`

`GET /criteria-sets` memuat semua set (semua departemen, semua versi, termasuk ARCHIVED) lalu melampirkan semua `criteria`, `scaleDescriptions`, dan `fields`. Jumlah baris tumbuh multiplikatif setiap kali versi baru dibuat. Tidak ada pagination/filter di endpoint.

**Perbaikan:** sediakan daftar ringkas (gunakan `CriteriaSetSummary` yang sudah ada) dan endpoint detail terpisah; atau terima `status`/`departmentId` + `page/limit`.

---

### CRT-08 — Test service hanya mencakup audit aktivasi (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `criteria.service.spec.ts` (3 test), `criteria.validation.spec.ts` (baik)

Validasi murni (bobot, skala, deskripsi, field, lock) sudah teruji sangat baik. Yang belum:
- `createDraft`: validasi kriteria (setelah CRT-02), clone dari ACTIVE saat `criteria`/`fields` tidak dikirim, penomoran versi,
- `update` DRAFT vs ACTIVE: penolakan ARCHIVED, penolakan non-ADMIN, `syncFields` (soft delete vs hard delete berdasarkan `fieldHasValues`),
- `activate`: penolakan set kosong / non-DRAFT,
- error mapping untuk tabrakan versi/aktivasi (CRT-06).

---

### CRT-09 — Join departemen tanpa filter soft delete (Low)

**Rule:** `arch-use-repository-pattern`
**Lokasi:** `criteria.repository.ts:59-88`

`leftJoin(departments, ...)` tanpa `notDeleted(departments)`, sehingga set milik departemen yang sudah dihapus tetap menampilkan nama departemen. Konsisten dengan pola modul lain; putuskan apakah histori harus menampilkan nama lama (idealnya disimpan sebagai snapshot).

---

### CRT-10 — `interfaces/criterion.interface.ts` tidak dipakai (Low)

**Lokasi:** `interfaces/criterion.interface.ts:1`

`CriterionPayload` hanya didefinisikan, tidak diimpor di mana pun (hanya ada satu kemunculan di seluruh backend). Kandidat penghapusan, sesuai kebiasaan proyek menghapus kode mati.

---

### CRT-11 — Pewarisan draft bisa mencampur dua sumber (Low)

**Rule:** `arch-single-responsibility`
**Lokasi:** `criteria.service.ts:129-151`

Bila klien mengirim `criteria` tetapi tidak `fields` (atau sebaliknya), bagian yang kosong di-clone dari **set ACTIVE** (termasuk fallback global). Hasilnya draft yang mencampur konten baru dengan konten set aktif — bisa mengejutkan dan menyulitkan audit. Dokumentasikan perilaku ini di Swagger, atau wajibkan keduanya dikirim untuk draft baru.

---

### CRT-12 — Update DRAFT mengganti ID kriteria setiap kali simpan (Low)

**Rule:** `db-use-transactions`
**Lokasi:** `criteria.repository.ts:294-330` (`replaceCriteria` — hard delete + insert)

Setiap update DRAFT melakukan `DELETE FROM criteria WHERE criteria_set_id = ...` lalu insert ulang, sehingga ID kriteria berubah. Aman untuk DRAFT (belum ada rating/notes yang menunjuk), tetapi klien yang menyimpan ID lama (mis. setelah membuka form) akan gagal pada penyimpanan berikutnya, dan audit tidak bisa mengaitkan kriteria antar-versi. Pertimbangkan sinkronisasi berbasis `id` seperti `syncFields`.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Siklus versi terkunci**: `DRAFT` bebas diedit, `ACTIVE` hanya ADMIN dan hanya konten, `ARCHIVED` read-only.
- **Aktivasi atomik**: mengarsipkan set aktif departemen yang sama dan mengaktifkan set baru dalam satu transaksi; audit arsip ditulis sebelum audit aktivasi.
- **Penomoran versi per departemen** dengan unique index `coalesce(department_id, zero-uuid)` + `version`.
- **Validasi bobot total 100** dengan toleransi 0.01 dan **kelengkapan deskripsi tiap skor** dari `scaleMin` sampai `scaleMax`.
- **`validateActiveCriteriaUpdate`** menolak perubahan jumlah/identitas kriteria dan bobot; menguji `id` asing dan duplikat.
- **`syncFields`** membedakan field yang sudah punya nilai (soft delete, karena FK `daily_note_values` masih menunjuk) dan yang belum (hard delete) — keputusan tepat.
- **`validateFields`** memeriksa duplikat `fieldKey`, duplikat label (case/trim-insensitive), opsi wajib untuk tipe OPTION, dan default value sesuai tipe.
- **Validasi dipisah sebagai fungsi murni** dan diuji menyeluruh (bobot, skala, deskripsi, field, lock).
- **Kode domain error konsisten** (`CRITERIA_*`) untuk semua pelanggaran aturan bisnis.
- **Query batch** (`criteriaBySetIds`, `fieldsBySetIds`) menghindari N+1 saat memuat banyak set.
- **DTO memakai tipe bersama** (`implements CreateCriteriaSetRequest`, dst.).

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | CRT-01 | Rating lama bisa jadi tidak valid bila skala ACTIVE diubah |
| 2 | CRT-02 | Draft invalid tersimpan & bisa dikloning |
| 3 | CRT-03 | Draft kriteria terbuka untuk semua role |
| 4 | CRT-04 | ADMIN bisa terkunci dari edit ACTIVE |
| 5 | CRT-06 | Race versi/aktivasi |
| 6 | CRT-05, CRT-07 | Audit isi & ukuran response |
| 7 | CRT-08 | Test alur utama |
| 8 | CRT-09 … CRT-12 | Kebersihan & konsistensi |

---

## 5. Checklist tindak lanjut

- [ ] CRT-01 Kunci `scaleMin`/`scaleMax` (dan `code`) pada ACTIVE — konfirmasi keputusan
- [ ] CRT-02 `validateCriteriaSet` di `createDraft`
- [ ] CRT-03 Batasi `findAll`/`available`/`active` (role + scope)
- [ ] CRT-04 Ganti `roles[0]` dengan `roles.includes(ADMIN)`
- [ ] CRT-05 Audit `before`/`after` untuk kriteria & field
- [ ] CRT-06 Petakan `23505` versi/aktivasi ke error domain (atau lock baris)
- [ ] CRT-07 Ringkas `findAll` + pagination/filter
- [ ] CRT-08 Tambah test create/update/syncFields/activate
- [ ] CRT-09 Putuskan join departemen terhapus
- [ ] CRT-10 Hapus `criterion.interface.ts`
- [ ] CRT-11 Dokumentasikan/wajibkan sumber warisan draft
- [ ] CRT-12 Sinkronkan kriteria berbasis `id` pada update DRAFT
