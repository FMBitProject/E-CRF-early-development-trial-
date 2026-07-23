# Checklist Kesiapan Go-Live — E-CRF System

Daftar item **wajib tuntas sebelum meng-enroll subjek/pasien nyata** pada
instance produksi (pilot study, RCT, atau uji klinis apa pun yang datanya
dipakai secara regulasi). Selama item di bawah belum lengkap, sistem hanya
boleh dipakai untuk **uji internal / demo / dry-run**, bukan pasien nyata.

Isi kolom **Status** (☐ belum / ◐ berjalan / ☑ selesai), **PIC**, dan
**Bukti/Lokasi** saat mengerjakan. Simpan seluruh bukti di TMF (Trial Master File).

| # | Item | Wajib | Status | PIC | Bukti / Lokasi |
|---|------|:---:|:---:|-----|----------------|
| 1 | Eksekusi & tanda tangan **IQ/OQ/PQ** di instance Docker | ✅ | ☐ | QA / Tester | [validation/IQ_OQ_PQ.md](validation/IQ_OQ_PQ.md) (terisi + paraf) |
| 2 | **Validation Summary Report** ditandatangani | ✅ | ☐ | System Owner + QA | Lampiran TMF |
| 3 | **Pen-test independen** atas instance yang ter-deploy | ✅ | ☐ | Security vendor | Laporan pen-test + remediasi |
| 4 | Isi placeholder `[…]` di **dokumen legal** + **review hukum** | ✅ | ☐ | Vendor + Legal | [legal/](legal/) |
| 5 | Backup/restore **diuji** + kebijakan retensi (11.10(c)) | ✅ | ☐ | Infrastruktur | [ONPREM_INSTALL.md §8](ONPREM_INSTALL.md), [DEPLOYMENT_OPERATIONS.md](DEPLOYMENT_OPERATIONS.md) |
| 6 | Freeze **git tag** rilis yang divalidasi | ✅ | ☐ | System Owner | Tag di repo (IQ-07) |

---

## 1. Eksekusi & tanda tangan IQ/OQ/PQ

Jalankan protokol pada instance Docker pelanggan (validasi hanya sah bila
dieksekusi di lingkungan nyata, bukan di dokumen).

- **IQ** (7 langkah): OS/Node, `npm ci`, cek `.env`, migrasi, seed, health, tag rilis.
- **OQ** (per modul): sebagian **sudah otomatis** lewat `npm test` (OQ-A1, RBAC,
  site-scoping); sisanya skrip manual (auth, audit, e-sign, data capture, workflow).
- **PQ** (5 proses end-to-end): enroll→consent→entry→query→SDV→sign→lock oleh user terlatih.

Tiap langkah: catat **Actual Result**, **Pass/Fail**, paraf tester + tanggal,
lampirkan bukti (screenshot/ekspor/audit extract). Log kegagalan sebagai deviasi.
Protokol lengkap: [validation/IQ_OQ_PQ.md](validation/IQ_OQ_PQ.md).

> Butuh tester per peran (admin/PI/investigator/CRA/CRC/DM). Untuk pilot kecil,
> satu orang boleh memerankan beberapa peran — dokumentasikan.

## 2. Validation Summary Report

Deliverable penutup (Validation Plan §5): disposisi seluruh deviasi + pernyataan
rilis. Ditandatangani **System Owner + QA**. Tanpa ini, validasi belum resmi selesai.

## 3. Pen-test independen

Uji keamanan oleh pihak ketiga atas instance yang sudah ter-deploy (bukan hanya
kode). Simpan laporan + bukti remediasi temuan. Tercatat sebagai open item di
[validation/PART11_ASSESSMENT.md](validation/PART11_ASSESSMENT.md).

## 4. Dokumen legal — isi placeholder + review hukum

Lengkapi semua `[…]` (nama badan hukum, alamat, NPWP, narahubung, harga, waktu
SLA, forum sengketa) lalu **tinjau bersama penasihat hukum**, khususnya klausul
batas tanggung jawab & jaminan.

- [ ] [legal/TERMS_AND_CONDITIONS.md](legal/TERMS_AND_CONDITIONS.md)
- [ ] [legal/PRIVACY_POLICY.md](legal/PRIVACY_POLICY.md)
- [ ] [legal/ORDER_FORM_TEMPLATE.md](legal/ORDER_FORM_TEMPLATE.md)
- [ ] [legal/SLA.md](legal/SLA.md)
- [ ] DPA terpisah (bila pelanggan meminta)

## 5. Backup/restore & retensi

Uji **restore** dari backup (bukan hanya backup jalan). Tetapkan jadwal (cron)
dan kebijakan retensi rekaman uji klinis. Panduan: [ONPREM_INSTALL.md §8](ONPREM_INSTALL.md).

## 6. Freeze versi

Beri **git tag** pada commit yang divalidasi dan kunci lewat change control, agar
IQ-07 dan Validation Plan merujuk versi yang pasti.

---

## Sign-off go-live

Sistem dinyatakan **siap untuk data subjek/pasien nyata** setelah seluruh item ✅
di atas selesai dan blok ini ditandatangani.

| Peran | Nama | Tanda tangan | Tanggal |
|-------|------|--------------|---------|
| System Owner | | | |
| QA | | | |
| Sponsor / PI | | | |
