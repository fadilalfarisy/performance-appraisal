# AGENTS.md

## Proyek
- Backend: NestJS (TypeScript)
- Frontend: React + Ant Design
- Package manager: pnpm
- Perintah: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm build`
<!-- AUTO: perintah dan struktur boleh diperbarui agent -->

## Alur kerja (urutan wajib)
1. **Klarifikasi**: `grill-with-docs` sebelum mulai fitur baru.
2. **Spesifikasi**: `to-spec` untuk menulis spec dari hasil klarifikasi.
3. **Pecah tugas**: `to-tickets` untuk membagi spec jadi tiket kecil.
4. **Implementasi**: per tiket, pakai `tdd` (tulis test dulu), lalu `implement`.
5. **Review**: `code-review` sebelum dianggap selesai.
6. **Retrospektif**: `retro` setelah fitur selesai. Hasilnya masuk ke bagian "Pelajaran" di bawah.

Untuk bug kecil atau perubahan satu file, langkah 1-3 boleh dilewati.

## Skill teknis (dipakai saat implement dan code-review)
| Area | Skill | Kapan |
|---|---|---|
| Backend `src/` / API | `nestjs-best-practices` | Menulis atau mengubah module, controller, service, DTO |
| Frontend React | `react-best-practices` | Menulis atau mengubah komponen, hooks, state |
| UI | `antd` | Memakai komponen Ant Design: form, table, modal, theme |

Aturan gabungan:
- Komponen UI React: terapkan `react-best-practices` dan `antd` bersamaan. Kalau bentrok, prioritaskan API resmi Ant Design.
- Saat `code-review`, cek kode terhadap skill teknis yang relevan di atas.
- Saat `tdd`, test mengikuti konvensi framework (Jest untuk NestJS, sesuai setup proyek untuk React).

## Aturan kode
- TypeScript strict, hindari `any`.
- Jangan ubah `package.json` atau lockfile tanpa diminta.
- Jangan commit sebelum lint dan test lulus.
<!-- MANUAL: aturan di bagian ini ditulis manusia, jangan dihapus agent -->

## Pelajaran (dari retro)
- (isi setelah tiap fitur selesai)

## Sinkronisasi file ini
Jika struktur proyek, perintah, dependensi, atau aturan berubah, jalankan `/sync-agent-custom`.
Agent juga wajib mengusulkan update file ini saat ia menemukan bagian yang sudah tidak sesuai dengan kode.