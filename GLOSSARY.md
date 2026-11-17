# Employee Performance Appraisal

Sistem penilaian kinerja bulanan per departemen: kriteria berbobot dinilai untuk setiap karyawan, lalu appraisal melewati alur persetujuan bertingkat sampai COMPLETE.

## Language

### Audit

**Audit trail**:
Catatan lengkap dan append-only atas aksi yang terjadi di sistem; tidak dapat diubah atau dihapus lewat aplikasi.
_Avoid_: Log, system log, history

**Audit entry**:
Satu catatan dalam audit trail: pelaku, aksi, entity, waktu, dan asal request.
_Avoid_: Audit log row, event, record

**Audit trail page**:
Tampilan ADMIN atas audit trail, dioptimalkan untuk aktivitas terbaru.
_Avoid_: Activity feed, log viewer, audit screen

**Actor**:
Pihak yang melakukan sebuah aksi: pengguna (dengan role) atau SYSTEM.
_Avoid_: User (ketika bisa berarti SYSTEM)

**SYSTEM**:
Identitas pelaku untuk aksi terjadwal, bukan manusia.

**Entity**:
Jenis record yang dikenai aksi, misalnya employee atau appraisal.
_Avoid_: Table, resource

**Before/after snapshot**:
Nilai record sebelum dan sesudah aksi, hanya untuk field yang berubah.
_Avoid_: Diff, changeset, patch

**Masking**:
Penggantian nilai sensitif sebelum disimpan ke audit trail.
_Avoid_: Redaction, sanitization

### Appraisal workflow

**Appraisal**:
Penilaian satu departemen untuk satu period, berisi daftar karyawan dan rating per kriteria.
_Avoid_: Assessment, evaluation

**Period**:
Bulan yang dicakup sebuah appraisal.
_Avoid_: Cycle, term

**Criteria set**:
Sekumpulan kriteria berbobot (total 100) yang menjadi dasar penilaian; versinya utuh, bukan per kriteria.
_Avoid_: Criteria, rubric, template

**Send back**:
Mengembalikan appraisal ke status sebelumnya; komentar wajib.
_Avoid_: Reject, return

**Reopen**:
Membuka kembali appraisal COMPLETE ke APPROVED; hanya ADMIN, komentar wajib.
_Avoid_: Restart, unlock
