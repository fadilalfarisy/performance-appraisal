# Audit: Dashboard (`src/dashboard/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`security-*`, `perf-*`, `db-*`, `api-*`, `test-*`)
**File yang diperiksa (5):**
- `dashboard.module.ts`, `dashboard.controller.ts`, `dashboard.service.ts`, `dashboard.repository.ts`
- `dashboard.service.spec.ts`
- Rujukan: `common/scope/scope.service.ts`, `common/context/request-context.service.ts`, `daily-notes/daily-notes.service.ts` (perbandingan scope), `db/schema.ts`

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 0 | — |
| Medium | 5 | DSH-01 … DSH-05 |
| Low | 3 | DSH-06 … DSH-08 |

Module read-only yang ringkas dan benar secara dasar: tiga query dijalankan paralel, scope departemen diterapkan ke ketiganya, `1 = 0` dipakai untuk scope kosong, status appraisal diisi nol untuk kelima nilai, dan `count(employees.id)` pada left join menghitung 0 untuk departemen kosong dengan benar. Temuan berpusat pada **definisi metrik** (periode, status karyawan, konsistensi total vs per-departemen) dan **role tanpa scope**.

---

## 2. Temuan & Perbaikan

### DSH-01 — `employees.total` tidak sama dengan jumlah `byDepartment` (Medium)

**Rule:** `api-use-dto-serialization` (konsistensi data)
**Lokasi:** `dashboard.repository.ts:34-50` (`employeeTotal`), `:52-92` (`employeesByDepartment`), `dashboard.service.ts:24-27`

Kedua metrik memakai filter berbeda:

| Metrik | Filter |
|--------|--------|
| `employees.total` | `notDeleted(employees)` + `department_id IN scope` |
| `employees.byDepartment` | `notDeleted(departments)` **+ `departments.isActive = true`** + `departments.id IN scope`, join karyawan `notDeleted` |

Akibatnya dashboard dapat menampilkan `total: 120` tetapi jumlah seluruh `byDepartment` hanya `100` karena:
- karyawan dengan `department_id = NULL` dihitung di `total` tetapi tidak muncul di departemen mana pun,
- karyawan di departemen **nonaktif** dihitung di `total` tetapi departemennya tidak ditampilkan,
- untuk role scoped, departemen nonaktif dalam scope juga dihilangkan dari `byDepartment`.

**Perbaikan:** samakan definisi. Pilih salah satu:
- `total` dihitung dari `SUM(byDepartment)` (paling konsisten dengan tampilan), atau
- `byDepartment` juga menyertakan departemen nonaktif (dengan penanda) dan entri `Tanpa departemen` untuk `NULL`, sehingga total = jumlah baris.

Tambahkan test yang memastikan `total === sum(byDepartment)` untuk data dengan departemen nonaktif dan karyawan tanpa departemen.

---

### DSH-02 — `appraisalsByStatus` menghitung seluruh histori, bukan periode berjalan (Medium, **Perlu konfirmasi**)

**Rule:** `arch-single-responsibility` (definisi metrik)
**Lokasi:** `dashboard.repository.ts:12-32`

Tidak ada filter `period`, sehingga hitungan status mencampur **semua** bulan: appraisal `DRAFT` dari tahun lalu tetap dihitung bersama appraisal bulan ini, dan angkanya akan terus bertambah. Dashboard operasional biasanya menampilkan periode berjalan (atau periode yang dipilih).

**Perbaikan:** tambahkan parameter periode (default: `currentPeriod()`) pada service/controller dan filter `eq(appraisals.period, period)`; atau tampilkan label jelas "sepanjang waktu" bila memang itu yang diinginkan. **Perlu konfirmasi** ke PRD/UI.

---

### DSH-03 — `employeeTotal` menghitung karyawan nonaktif (Medium, **Perlu konfirmasi**)

**Rule:** `arch-single-responsibility`
**Lokasi:** `dashboard.repository.ts:34-50`

`employeeTotal` hanya memfilter soft delete, sehingga karyawan berstatus `INACTIVE` ikut dihitung. `byDepartment` juga menghitung mereka (hanya departemen yang difilter aktif). Jika dashboard dimaksudkan menampilkan "karyawan aktif", angkanya melebih-lebihkan.

**Perbaikan:** putuskan definisi. Jika aktif: `eq(employees.status, 'ACTIVE')` pada kedua query. Jika total keseluruhan, beri label eksplisit dan pertimbangkan memecah `{active, inactive}`.

---

### DSH-04 — Role tanpa scope (SUPERVISOR) melihat dashboard kosong (Medium, **Perlu konfirmasi**)

**Rule:** `security-use-guards`
**Lokasi:** `dashboard.service.ts:16-22`, `common/scope/scope.service.ts:33-39`, bandingkan `daily-notes/daily-notes.service.ts:250-271`

`ScopeService.getDepartmentScope` mengembalikan `'ALL'` hanya untuk ADMIN/HR/GENERAL_MANAGER; role lain memakai `user_departments`. `SUPERVISOR` tidak ada di `GLOBAL_SCOPE_ROLES` dan biasanya tidak punya baris `user_departments`, sehingga scope-nya `[]` → ketiga query memakai `1 = 0` → dashboard semua nol.

Padahal modul Daily Notes secara eksplisit memberi SUPERVISOR akses ke data **subordinatnya**. Ketidakkonsistenan ini membuat supervisor melihat dashboard kosong meski punya bawahan.

**Perbaikan:** definisikan scope dashboard per role. Bila supervisor harus melihat subordinat, tambahkan cabang khusus (mis. hitung karyawan dengan `supervisor_id = user.employeeId`) atau isi `user_departments` untuk supervisor saat dibuat. Konfirmasi ke PRD.

---

### DSH-05 — Tiga query agregat tanpa cache (Medium)

**Rule:** `perf-use-caching`, `perf-optimize-database`
**Lokasi:** `dashboard.service.ts:24-27`

Setiap request dashboard menjalankan tiga agregasi (dua di antaranya `GROUP BY`) pada tabel `appraisals`/`employees`/`departments`. Dashboard biasanya di-poll berkala oleh setiap pengguna; tanpa cache, beban berulang dan hasilnya bisa berbeda antar-request.

**Perbaikan:** cache singkat (mis. 30–60 detik) per `scope` (key dari daftar departmentIds) dengan `@nestjs/cache-manager` atau cache in-memory sederhana; invalidasi saat ada perubahan appraisal/employee. Jika tidak ingin dependency baru, minimal dokumentasikan bahwa endpoint ini mahal dan batasi frekuensi poll di frontend.

---

### DSH-06 — Fallback `user` kosong diperlakukan sebagai akses penuh (Low)

**Rule:** `security-use-guards`
**Lokasi:** `dashboard.service.ts:17-22`

```ts
const user = this.requestContext.getUser();
let departmentIds: string[] | undefined;
if (user) { ... }
```

Bila `user` tidak ada, `departmentIds` tetap `undefined` → **semua departemen**. Route dilindungi `JwtAuthGuard` global, jadi saat ini tidak dapat terjadi; namun pola "tanpa user = ALL" berbahaya bila suatu saat route ditandai `@Public()` atau dipanggil dari job. Bandingkan `daily-notes.service.ts` yang melempar `ForbiddenException` saat user kosong.

**Perbaikan:** lempar `ForbiddenException` bila `user` kosong, atau gunakan `scope = user ? ... : []` (fail-closed).

---

### DSH-07 — Test belum mencakup kasus scope & konsistensi (Low)

**Rule:** `test-use-testing-module`
**Lokasi:** `dashboard.service.spec.ts` (2 test)

Sudah diuji: zero-fill lima status dan penerusan scope ke repository. Belum:
- scope kosong (`[]`) diteruskan apa adanya (bukan `undefined`),
- `user` null → perilaku yang diharapkan (setelah DSH-06),
- konsistensi `total` vs `byDepartment` (DSH-01),
- departemen nonaktif/karyawan tanpa departemen,
- filter periode (setelah DSH-02).

---

### DSH-08 — `DashboardModule` tidak mengimpor `DbModule` (Low)

**Lokasi:** `dashboard.module.ts:3-9`

Sama seperti Health/Departments/Positions: bekerja karena `DbModule` `@Global()`. Bukan bug; konsistenkan kebijakan `imports: [DbModule]` di seluruh module bila ingin dependensi eksplisit.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Tiga query dijalankan paralel** (`Promise.all`) sehingga latensi = query terlambat, bukan jumlah.
- **Scope diterapkan konsisten** ke ketiga metrik, termasuk `1 = 0` untuk scope kosong (fail-closed).
- **Zero-fill status**: `Object.values(AppraisalStatus)` memastikan kelima status selalu muncul dengan `count: 0`.
- **`count(employees.id)` pada LEFT JOIN** menghitung 0 untuk departemen tanpa karyawan (bukan 1 karena `count(*)`).
- **`GROUP BY` + `ORDER BY`** pada departemen menghasilkan urutan stabil.
- **Repository terpisah** dari service; service hanya menyusun bentuk response.
- **Semua query memakai `notDeleted`** sesuai helper proyek.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | DSH-01 | Angka total vs per-departemen saling bertentangan di UI |
| 2 | DSH-02 | Status appraisal mencampur seluruh histori |
| 3 | DSH-04 | Supervisor melihat dashboard kosong |
| 4 | DSH-03 | Total karyawan bisa menyesatkan |
| 5 | DSH-05 | Beban query berulang |
| 6 | DSH-06 … DSH-08 | Ketahanan & test |

---

## 5. Checklist tindak lanjut

- [ ] DSH-01 Samakan definisi `total` dengan `byDepartment` (+ test konsistensi)
- [ ] DSH-02 Konfirmasi & tambahkan filter periode pada status appraisal
- [ ] DSH-03 Konfirmasi definisi "total karyawan" (aktif vs semua)
- [ ] DSH-04 Definisikan scope dashboard untuk SUPERVISOR (subordinat) atau isi `user_departments`
- [ ] DSH-05 Cache singkat per scope / batasi polling
- [ ] DSH-06 Fail-closed saat user kosong
- [ ] DSH-07 Tambah test scope kosong, nonaktif, tanpa departemen
- [ ] DSH-08 (opsional) `imports: [DbModule]`
