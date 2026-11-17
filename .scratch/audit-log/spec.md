# Spec: Audit Trail (activity feed)

Status: agreed (grilling selesai)
Target PRD: v0.10 (naik dari v0.9)
Berdasarkan: PRD v0.9 §5.6, §5.8, §2; DESIGN-BACKEND v0.7 §7.2, §12, §13.3, §14; DESIGN-FRONTEND v1.0 §7.1, §7.4, §10.8

## 1. Tujuan

Memberi ADMIN satu halaman untuk melihat aktivitas sistem terbaru di atas audit trail yang sudah ada. Ini **operational activity feed**: dibaca rutin untuk menjawab "apa yang terjadi belakangan ini", bukan alat forensik jangka panjang. Trail-nya sendiri tetap append-only dan tidak berubah.

Bukan bagian fitur ini: riwayat tertanam di layar detail (appraisal/employee), job partisi bulanan, dan audit per baris hasil import.

## 2. Keputusan yang disepakati

| # | Keputusan |
|---|---|
| 1 | Pembaca: **ADMIN saja**. Ini menyimpang dari PRD v0.9 §5.8 (ADMIN + HR) dan harus tercermin di PRD v0.10. |
| 2 | Satu halaman global `/audit-logs`. Tidak ada riwayat per-record di fitur ini. |
| 3 | Bentuk tampilan: tabel audit terstruktur (bukan feed naratif, bukan timeline). |
| 4 | Default window: **7 hari terakhir**. |
| 5 | Filter: date range, user, entity, action, actor type (`USER`/`SYSTEM`), free-text. |
| 6 | Free-text mencari `username`, `employee_number`, `entity_id`. Tidak mencari isi `before_data`/`after_data`. |
| 7 | Coverage write path diperbaiki di fitur ini (lihat §5), kecuali audit per baris import dan seed script. |
| 8 | `APPRAISAL_RATINGS_SAVED` tetap menyimpan count, tanpa diff per sel. |
| 9 | Export hasil audit dibangun dan **diaudit**; membaca daftar audit **tidak** diaudit. |
| 10 | Retensi 12 bulan dan partisi bulanan di luar scope; dicatat sebagai known gap. |
| 11 | `QueryDto` global: `limit` default 10, `@Max` 50 → 100. |
| 12 | Filter audit memakai `AuditLogQueryDto extends QueryDto` (satu file DTO baru). |

## 3. Backend

### 3.1 Modul

Semua di `apps/backend/src/audit/`, mengikuti pola modul lain (controller HTTP saja, service aturan, repository query Drizzle):

- `audit.controller.ts` — `@Roles(UserRole.ADMIN)`, terdokumentasi `@nestjs/swagger`.
- `audit.service.ts` — tambah method baca; `record()` tidak berubah.
- `audit.repository.ts` — tambah `findAllWithCount(query)` dan `findForExport(query)`. Hanya repository yang menyentuh `auditLogs`.
- `dto/audit-log-query.dto.ts` — `AuditLogQueryDto extends QueryDto`:

| Field | Validasi |
|---|---|
| `occurredFrom`, `occurredTo` | `@IsDateString()` |
| `userId` | `@IsUUID()` |
| `entity` | `@IsString()` |
| `entityId` | `@IsString()` |
| `action` | `@IsString()` |
| `actorType` | `@IsIn(['USER', 'SYSTEM'])` |

`search` dari `QueryDto` dipetakan ke `or(ilike(username), ilike(employeeNumber), ilike(entityId))`.

### 3.2 Endpoint

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/api/audit-logs` | List berpaginasi, envelope `paginated(...)` |
| `GET` | `/api/audit-logs/export` | `.xlsx`, filter sama, memakai `exceljs` + sanitasi sel |

- Urutan selalu `occurred_at DESC, id DESC`. Klien tidak mengirim `orderBy`.
- Tidak ada `GET /api/audit-logs/:id`; row expandable sudah membawa seluruh isi.
- Export menulis satu audit entry (`action: AUDIT_LOG_EXPORTED`, `entity: audit_log`, metadata berisi filter yang dipakai) di dalam transaksi yang sama.
- Membaca list tidak menulis audit entry.

### 3.3 Response item

`AuditLogResponse`: `id`, `occurredAt`, `actorType`, `userId`, `username`, `role`, `employeeNumber`, `action`, `entity`, `entityId`, `before`, `after`, `metadata`, `ipAddress`, `requestId`. Nilai sudah termasking oleh `AuditService.record`.

## 4. Frontend

- Route `audit-logs` sebagai child `dashboard` di `src/app/router.tsx`, page lazy-loaded.
- Menu item "Audit Trail" di `src/constants/dashboard-link.tsx`, `roles: [ADMIN]`, key `/audit-logs`.
- Tag RTK Query baru `AuditLog` di `src/api/apiSlice.ts`; endpoint di `src/features/audit/auditApi.ts` (query list + export via `downloadFile`).
- Halaman `src/features/audit/pages/AuditTrail.tsx`, pola sama dengan `Employee.tsx`:
  - Filter component `AuditTrailSearch.tsx`: `DatePicker.RangePicker` (default 7 hari terakhir), `Select` user, `Input` entity, `Select` action, `Select` actor type, `Input.Search`.
  - Kolom: waktu (`formatDateTime`), aktor (`username`, `SYSTEM` bila `userId` null), role, action, entity, entity id.
  - Row expandable: before, after, metadata, IP, request id sebagai `<pre>` read-only.
  - `pageSizeOptions` menyertakan `100`.
- Map label action di `src/features/audit/actionLabels.ts`; action tak dikenal jatuh ke kode mentah.

## 5. Coverage write path (checklist)

| Write path | Lokasi | Tindakan |
|---|---|---|
| Login | `auth/auth.service.ts` | Tambah `AUTH_LOGIN` |
| Logout | `auth/auth.service.ts` | Tambah `AUTH_LOGOUT` |
| Login gagal | `auth/auth.service.ts` | Tambah `AUTH_LOGIN_FAILED` (tanpa password) |
| Export employees + template | `employees.service.ts:241-248` | Tambah `EMPLOYEES_EXPORTED` + filter di `metadata` |
| Export contracts + template | `contracts.service.ts:126-133` | Tambah `CONTRACTS_EXPORTED` + filter |
| Export appraisal result | `appraisals.service.ts:232-264` | Tambah `APPRAISAL_RESULT_EXPORTED` |
| Criteria archive side-effect | `criteria.service.ts:337` | Tambah `CRITERIA_SET_ARCHIVED` |
| `USER_UPDATED` | `users.service.ts:98` | Lengkapi `before` + `after` |
| `USER_DELETED` | `users.service.ts:152` | Lengkapi `before` |
| Import | `imports/import.service.ts:99` | Tidak diubah: tetap satu row per file |
| Seed scripts | `db/seed*.ts` | Tidak diaudit |

Catatan: `apps/backend/docs/modules/audit.md` menyatakan daily notes tidak diaudit dan tidak ada endpoint baca — keduanya sudah tidak benar dan harus diperbarui.

## 6. Dokumen yang harus berubah

| Dokumen | Perubahan |
|---|---|
| `docs/PRD.md` | v0.10 + change log: §5.6 dan §5.8 akses audit jadi ADMIN saja; §5.6 sebut aktivitas auth masuk cakupan |
| `docs/DESIGN-BACKEND.md` | §14 endpoint audit (ADMIN), §12.1 auth audit, §13.3 export audit |
| `docs/DESIGN-FRONTEND.md` | §7.1, §7.4, §10.8: role ADMIN, default window 7 hari, isi kolom/panel |
| `docs/CONVENTIONS.md` | Batas `limit` 100 |
| `apps/backend/docs/modules/audit.md`, `docs/FLOW.md` | Read path, auth audit, koreksi daily notes |
| `apps/frontend/docs/FLOW.md` | Route dan feature audit |

## 7. Test

- Backend: spec untuk `AuditLogQueryDto`; service spec untuk filter dan pemetaan search; assertion audit terpanggil di auth/export/criteria (pola `employees.service.spec.ts:118-127`); test bahwa list read tidak memanggil `record`.
- Frontend: perbarui `constants/role-access.spec.ts` (jumlah menu per role naik untuk ADMIN); spec `actionLabels` untuk fallback kode tak dikenal.
- Jalankan `pnpm -r lint && pnpm -r build` plus test kedua app.

## 8. Urutan implementasi

1. Dokumen (PRD v0.10 → design → CONVENTIONS → module docs).
2. `QueryDto` limit 10 / max 100.
3. Backend read API (repository → service → DTO → controller → Swagger).
4. Backend coverage (§5) + export endpoint beserta audit-nya.
5. Frontend (tag, api, filter, page, menu, route, label map).
6. Test dan verifikasi.

## 9. Known gaps (di luar fitur ini)

- Job pembuat partisi bulanan `audit_logs` belum ada; database hanya punya `audit_logs_default`.
- Retensi 12 bulan belum diotomatiskan (prosedur manual per PRD §5.6).
- Audit per baris hasil import tidak ada dan tidak akan ditambahkan.
