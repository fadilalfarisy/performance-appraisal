# Audit: Imports (`src/imports/`)

**Tanggal audit:** 2026-11-18
**Acuan:** skill `nestjs-best-practices` (`security-validate-all-input`, `db-use-transactions`, `arch-*`, `test-*`)
**File yang diperiksa (3):**
- `imports.module.ts`
- `import.service.ts`
- `import.types.ts`
- Rujukan: pemakai `employees/employees.importer.ts`, `contracts/contracts.importer.ts`, `employees/employees.controller.ts`, `contracts/contracts.controller.ts`, `config/env.validation.ts`, `audit/audit.service.ts`
- Catatan: **tidak ada file `*.spec.ts`** di module ini (test ada di masing-masing importer).

**Status:** ✅ Selesai di-scan

---

## 1. Ringkasan

| Severity | Jumlah | ID temuan |
|----------|--------|-----------|
| High | 1 | IMP-01 |
| Medium | 5 | IMP-02 … IMP-06 |
| Low | 5 | IMP-07 … IMP-11 |

Pipeline ini adalah salah satu desain terbaik di repo: **validasi seluruh file sebelum menulis**, commit di dalam satu transaksi pemanggil, audit ditulis pada transaksi yang sama, `ImportStrategy` bersih (header wajib, validate, commit), dan semua error validasi memakai format `details: {row, column, message}` dengan HTTP 422. Kelemahan utamanya bersifat **batas resource**: parsing dilakukan sebelum batas baris diperiksa, dan tipe file hanya dicek dari ekstensi.

---

## 2. Temuan & Perbaikan

### IMP-01 — Batas baris diperiksa setelah seluruh workbook di-parse; file hanya divalidasi dari ekstensi (High)

**Rule:** `security-validate-all-input`, `perf-optimize-database`
**Lokasi:** `import.service.ts:40-56` (`workbook.xlsx.load`), `:71-84` (iterasi + `maxRows`), `:110-139` (`assertFile`)

Urutan eksekusi:

```ts
this.assertFile(file);                       // hanya ekstensi + file.size (terkompresi)
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(file.buffer);       // dekompresi & parse penuh
...
for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) { ... } // semua baris dibaca
const maxRows = Number(this.configService.get('IMPORT_MAX_ROWS') ?? 5000);
if (rows.length > maxRows) throw ...         // batas dicek SETELAH semuanya di memori
```

`.xlsx` adalah arsip ZIP. File 5 MB dapat berisi XML yang membengkak hingga ratusan MB–GB (zip bomb), dan `rowCount` bisa sangat besar. Karena `IMPORT_MAX_ROWS` baru diperiksa **setelah** semua baris dikonversi menjadi objek, batas itu tidak melindungi memori/CPU. Selain itu tidak ada pengecekan MIME (`file.mimetype`) atau magic bytes `PK\x03\x04`, sehingga file non-xlsx yang di-rename akan membuat ExcelJS mengonsumsi resource lalu melempar error tak tertangani (lihat IMP-02).

**Perbaikan:**
1. Batasi jumlah baris **selama** iterasi (`if (rows.length > maxRows) { throw IMPORT_TOO_MANY_ROWS }`) lalu berhenti membaca.
2. Validasi magic bytes sebelum `load`:
   ```ts
   if (!file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) throw new HttpException({...}, 400);
   ```
   dan tolak `file.mimetype` yang tidak sesuai.
3. Pertimbangkan batas ukuran hasil dekompresi (mis. total shared strings / worksheet XML) atau proses streaming, dan turunkan `limits.fileSize` Multer agar sama dengan `IMPORT_MAX_FILE_SIZE_MB` (lihat `employees.md` EMP-08, `contracts.md` CTR-11).

---

### IMP-02 — Error parsing file tidak dipetakan ke 400 (Medium)

**Rule:** `error-throw-http-exceptions`
**Lokasi:** `import.service.ts:47`

`await workbook.xlsx.load(...)` tidak dibungkus `try/catch`. File rusak, bukan ZIP, atau XML invalid menghasilkan error library (bukan `HttpException`), sehingga `HttpExceptionFilter` mengembalikan **500 INTERNAL_SERVER_ERROR**. Pengguna tidak mendapat pesan "file tidak valid".

**Perbaikan:**
```ts
try { await workbook.xlsx.load(...); }
catch {
  throw new HttpException(
    { message: 'The file is not a valid .xlsx workbook', errorCode: 'IMPORT_INVALID_FILE' },
    HttpStatus.BAD_REQUEST,
  );
}
```

---

### IMP-03 — Header dicocokkan case-sensitive dan peka spasi (Medium)

**Rule:** `api-use-pipes` (normalisasi input)
**Lokasi:** `import.service.ts:57-69`

`columnIndex` diisi dari `cellText` (hanya `trim`), lalu `strategy.expectedHeaders` dicari persis. Variasi umum dari pengguna — `Employee_Number`, `employee number`, spasi ganda, atau huruf besar — dianggap "Missing column". `cellText` sudah men-trim, tetapi tidak menormalkan case/spasi internal.

**Perbaikan:** normalisasi header (`trim().toLowerCase().replace(/\s+/g, '_')`) di kedua sisi, atau berikan pesan error yang menampilkan header yang ditemukan. Dokumentasikan format di worksheet Notes (sudah ada) dan terapkan normalisasi yang sama.

---

### IMP-04 — Tidak ada test untuk pipeline inti (Medium)

**Rule:** `test-use-testing-module`
**Lokasi:** `src/imports/` (0 spec)

Yang diuji hanya masing-masing importer (`employees.importer` tidak punya spec; `contracts.importer.spec.ts` menguji `validate`). Yang **belum** diuji sama sekali:
- `assertFile`: tidak ada file, ekstensi salah, ukuran melebihi batas,
- header wajib hilang → 422 dengan `details.row/column`,
- baris kosong dilewati, baris berisi diambil,
- batas `IMPORT_MAX_ROWS`,
- audit `*_IMPORTED` ditulis dengan metadata hasil,
- rollback: `commit` melempar → tidak ada audit dan tidak ada data.

Test ini murah dengan buffer Excel yang dibuat via `ExcelJS` di test.

---

### IMP-05 — `IMPORT_MAX_FILE_SIZE_MB` 0/negatif melumpuhkan impor (Medium)

**Rule:** `devops-use-config-module`
**Lokasi:** `import.service.ts:125-137`, `config/env.validation.ts:52-55`

`@IsNumberString()` menerima `'0'` dan `'-5'` (lihat `config.md` CFG-06). Nilai `0` membuat `maxBytes = 0` sehingga **semua** file ditolak; nilai negatif juga. Sebaliknya, string non-numerik sudah dicegah validator.

**Perbaikan:** tambahkan `@Min(1)` pada `IMPORT_MAX_FILE_SIZE_MB` dan `IMPORT_MAX_ROWS` (atau validasi di `ImportService` saat startup), lalu gunakan `getOrThrow` dengan tipe angka.

---

### IMP-06 — Duplikasi header & header dengan nama sama tidak ditangani (Medium)

**Rule:** `security-validate-all-input`
**Lokasi:** `import.service.ts:58-63`

`columnIndex.set(header, index)` membuat header duplikat **menimpa** yang pertama (kolom terakhir menang), tanpa peringatan. Bila pengguna menyalin kolom di Excel, data bisa terbaca dari kolom yang salah tanpa error. `strategy.expectedHeaders` juga tidak divalidasi unik.

**Perbaikan:** deteksi duplikat (`columnIndex.has(header)`) dan lempar 422 `IMPORT_DUPLICATE_COLUMN`; atau gunakan kemunculan pertama secara eksplisit dan dokumentasikan.

---

### IMP-07 — Hanya error pertama yang dilaporkan (Low)

**Rule:** `api-use-dto-serialization` (UX), **Perlu konfirmasi**
**Lokasi:** `import.types.ts:24-35`, pemakaian di `employees.importer.ts:74-111` dan `contracts.importer.ts:44-99`

`importError()` melempar pada error pertama dan `IMPLEMENTS` step pertama adalah satu error. Pengguna file 300 baris harus mengulang unggah-validasi satu error per kali. Format `details` sudah mendukung satu baris saja.

**Perbaikan:** bila diinginkan, ubah kontrak menjadi `validate(rows): Promise<ImportError[]>` dan kumpulkan hingga batas (mis. 50) error, lalu kirim semuanya pada `details.errors`. Ini keputusan produk; saat ini konsisten dan didokumentasikan.

---

### IMP-08 — TOCTOU antara `validate` dan `commit` (Low)

**Rule:** `db-use-transactions`
**Lokasi:** `import.service.ts:92-107`

Validasi membaca state DB **di luar** transaksi commit. Antara validate dan commit, master data bisa berubah (departemen dihapus, kontrak baru dibuat, employee number dipakai). Commit hanya bergantung pada constraint DB dan pengecekan ulang sebagian. Untuk file besar, jendela waktunya cukup panjang.

**Perbaikan:** dokumentasikan bahwa constraint DB adalah pengaman akhir (sudah ada), atau jalankan `validate` dengan transaksi yang sama seperti commit (read-only validation dalam satu `REPEATABLE READ`). Minimal, tangani error constraint di commit menjadi 409/422 yang ramah.

---

### IMP-09 — Metadata audit hanya berisi file + jumlah (Low)

**Rule:** `devops-use-logging`
**Lokasi:** `import.service.ts:99-105`

Audit `*_IMPORTED` menyimpan `{ file: originalname, ...result }` (created/updated/skipped). Tidak ada checksum file, ukuran, atau ringkasan baris gagal. Untuk investigasi "file mana yang mengubah data", `originalname` saja tidak cukup (bisa sama untuk file berbeda).

**Perbaikan:** simpan `sha256` buffer, `size`, `rows`, dan (bila ada) daftar baris yang dilewati. Hash juga memungkinkan deteksi impor ganda.

---

### IMP-10 — Workbook tanpa baris data tetap dianggap impor sukses (Low, **Perlu konfirmasi**)

**Rule:** `security-validate-all-input`
**Lokasi:** `import.service.ts:69-83`, `:98-107`

File yang hanya berisi header (atau semua baris kosong) menghasilkan `rows = []`, `strategy.validate([])` biasanya lolos, `commit` menulis nol baris, dan audit mencatat impor `{created: 0, updated: 0, skipped: 0}`. Pengguna bisa mengira datanya terimpor.

**Perbaikan:** tolak file tanpa baris data dengan `IMPORT_NO_ROWS` (400), atau tampilkan peringatan eksplisit di UI.

---

### IMP-11 — `file.buffer` diasumsikan ada (Low)

**Rule:** `error-handle-async-errors`
**Lokasi:** `import.types.ts:8-13`, `import.service.ts:47`

Kontrak `UploadedFileLike` mewajibkan `buffer`, dan saat ini Multer dipakai dengan memory storage (default). Jika suatu saat storage diubah ke disk, `buffer` menjadi `undefined` dan `xlsx.load(undefined)` gagal dengan error tidak jelas. Tambahkan pemeriksaan eksplisit di `assertFile` (`if (!file.buffer?.length) throw 400`) agar kontraknya ditegakkan di runtime.

---

## 3. Yang sudah baik (jangan diubah tanpa alasan)

- **Validate-then-commit dalam transaksi**: tidak ada data yang ditulis saat validasi, dan commit + audit berada di transaksi yang sama (`import.service.ts:92-107`).
- **Kontrak `ImportStrategy` minimal dan jelas**: `expectedHeaders`, `validate` (tidak menulis), `commit(rows, tx)`.
- **Format error konsisten** (`IMPORT_VALIDATION_FAILED`, HTTP 422, `details {row, column, message}`) sehingga UI bisa menyorot sel.
- **Batas jumlah baris dikonfigurasi** (`IMPORT_MAX_ROWS`) dan ukuran file (`IMPORT_MAX_FILE_SIZE_MB`).
- **Hanya `.xlsx`** yang diterima (cek ekstensi case-insensitive).
- **Baris kosong dilewati** berdasarkan ada/tidaknya nilai.
- **`cellText` menangani** string, number, Date, rich text, formula cached result, dan objek lain dengan aman.
- **Strategi terpisah per entitas** (employees/contracts) sehingga pipeline tidak tahu detail domain; test importer kontrak menguji aturan domain.
- **Audit ditulis dengan `auditActor`** dari request context.

---

## 4. Prioritas perbaikan

| Urutan | ID | Alasan |
|--------|----|--------|
| 1 | IMP-01 | Zip bomb / memori habis sebelum batas baris dicek |
| 2 | IMP-02 | File invalid menghasilkan 500 |
| 3 | IMP-05 | Env `0`/negatif melumpuhkan impor |
| 4 | IMP-06, IMP-03 | Data terbaca dari kolom salah / header ditolak |
| 5 | IMP-04 | Tidak ada test pipeline |
| 6 | IMP-07 … IMP-11 | UX & observability |

---

## 5. Checklist tindak lanjut

- [ ] IMP-01 Batasi baris selama iterasi, cek magic bytes/MIME, sinkronkan limit Multer
- [ ] IMP-02 Bungkus `xlsx.load` → 400 `IMPORT_INVALID_FILE`
- [ ] IMP-03 Normalisasi header (case/spasi)
- [ ] IMP-04 Tambah `import.service.spec.ts` (file, header, limit, audit, rollback)
- [ ] IMP-05 `@Min(1)` untuk `IMPORT_MAX_*`
- [ ] IMP-06 Deteksi kolom duplikat + validasi `expectedHeaders` unik
- [ ] IMP-07 (opsional) Kumpulkan beberapa error validasi
- [ ] IMP-08 Tangani error constraint di commit / validasi dalam snapshot yang sama
- [ ] IMP-09 Tambahkan hash + ukuran file pada audit impor
- [ ] IMP-10 Konfirmasi perilaku file tanpa baris data
- [ ] IMP-11 Cek `file.buffer` di `assertFile`
