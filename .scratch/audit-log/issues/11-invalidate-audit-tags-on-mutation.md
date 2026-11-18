# 11: Invalidasi cache audit setelah setiap mutation

**What to build:** Setelah aksi apa pun yang menulis audit (create/update/delete, transisi, import, export, login/logout), daftar Audit Trail yang sedang terbuka langsung memuat data baru tanpa refresh manual.

**Blocked by:** None (can start immediately) — bergantung pada tiket 04 yang sudah selesai.

**Status:** ready-for-agent

- [ ] Setiap mutation RTK Query yang berhasil (POST/PUT/PATCH/DELETE) menginvalidasi tag `AuditLogs`.
- [ ] Mutation yang gagal tetap menginvalidasi, karena login gagal pun menulis `AUTH_LOGIN_FAILED`.
- [ ] `/auth/refresh` tidak menginvalidasi (tidak menulis audit) agar token refresh tidak memicu refetch.
- [ ] Import lewat `ImportModal` (fetch mentah) menginvalidasi `AuditLogs` setelah sukses.
- [ ] Unduhan/export lewat `downloadFile` menginvalidasi `AuditLogs` setelah sukses, karena setiap export menulis entri.
- [ ] Aturan "request mana yang dianggap mutation" adalah fungsi murni dan dites.
- [ ] Halaman audit yang tidak sedang terbuka tidak memicu request tambahan (RTK hanya refetch query yang aktif).
