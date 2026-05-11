# Panduan Penggunaan E-CRF
### Electronic Case Report Form — Early Development Trial

> Panduan ini mengikuti standar **ICH GCP E6(R3)**, **21 CFR Part 11**, dan **UU PDP Indonesia**.

<!-- AUTO-GENERATED:UPDATED-AT-START -->
_Panduan ini terakhir diperbarui otomatis: **11/5/2026, 16.35.00 WIB**_
<!-- AUTO-GENERATED:UPDATED-AT-END -->

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Role & Hak Akses](#2-role--hak-akses)
3. [Memulai Aplikasi](#3-memulai-aplikasi)
4. [Dashboard](#4-dashboard)
5. [Subjects (Subjek Penelitian)](#5-subjects)
6. [Adverse Events (AE)](#6-adverse-events)
7. [Protocol Deviations](#7-protocol-deviations)
8. [Informed Consent](#8-informed-consent)
9. [Randomization](#9-randomization)
10. [Data Queries](#10-data-queries)
11. [Data Entry (CRF Forms)](#11-data-entry-crf-forms)
12. [e-Signature](#12-e-signature)
13. [Audit Trail](#13-audit-trail)
14. [Database Lock](#14-database-lock)
15. [Delegation Log & Training](#15-delegation-log--training)
16. [SAE Reports](#16-sae-reports)
17. [Monitoring Visits & SDV](#17-monitoring-visits--sdv)
18. [Data Status](#18-data-status)
19. [Site Management](#19-site-management)
20. [Study Management](#20-study-management)
21. [Alur Kerja Lengkap](#21-alur-kerja-lengkap)
22. [FAQ](#22-faq)

---

## 1. Pendahuluan

E-CRF adalah platform pengelolaan data uji klinis berbasis web yang memungkinkan tim penelitian untuk:

- Memasukkan dan memvalidasi data pasien secara elektronik
- Mengelola query data antara CRA dan investigator
- Melakukan Source Data Verification (SDV) oleh monitor
- Menandatangani formulir secara elektronik (e-Signature sesuai 21 CFR Part 11)
- Mengunci database setelah semua data bersih (Database Lock)

**Akun:** Semua akun dibuat oleh Administrator. Tidak ada registrasi mandiri.

---

## 2. Role & Hak Akses

### 2.1 Deskripsi Role

| Role | ID | Deskripsi |
|------|----|-----------|
| Administrator | `admin` | Data Manager — akses penuh, kelola study/site/user, inisiasi DB Lock |
| Principal Investigator | `pi` | PI situs — baca/tulis/tanda tangan, kelola delegasi |
| Investigator | `investigator` | Sub-investigator — entry data klinis di situs sendiri |
| CRA / Monitor | `cra` | Clinical Research Associate — verifikasi data (SDV), raise query, monitoring visit |
| Study Coordinator | `crc` | CRC — entry data utama (subjek, AE, deviasi, consent), jawab query |

### 2.2 Akses Navigasi per Role

<!-- AUTO-GENERATED:NAV-ACCESS-START -->
| Modul | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|-------|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Subjects | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adverse Events | ✓ | ✓ | ✓ | ✓ | ✓ |
| Deviations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Consent | ✓ | ✓ | ✓ | ✓ | ✓ |
| Randomization | ✓ | ✓ | ✓ | — | — |
| Queries | ✓ | ✓ | ✓ | ✓ | ✓ |
| Audit Trail | ✓ | ✓ | — | ✓ | — |
| DB Lock | ✓ | ✓ | — | ✓ | — |
| Delegation | ✓ | ✓ | — | ✓ | — |
| SAE Reports | ✓ | ✓ | — | ✓ | — |
| Monitoring | ✓ | ✓ | — | ✓ | — |
| Data Status | ✓ | ✓ | — | ✓ | — |
| Sites | ✓ | — | — | — | — |
| Studies | ✓ | — | — | — | — |
<!-- AUTO-GENERATED:NAV-ACCESS-END -->

---

## 3. Memulai Aplikasi

### 3.1 Login

1. Buka URL aplikasi di browser
2. Masukkan **Email** dan **Password** yang diberikan oleh Administrator
3. Klik **Sign In** — langsung masuk tanpa kode verifikasi

> Jika login gagal 5× berturut-turut, akun akan terkunci otomatis. Hubungi Administrator untuk membuka kunci.

### 3.2 Pilih Study

Setelah login, halaman **Study Management** muncul otomatis (untuk Admin). Pilih study yang akan dikerjakan dari daftar yang tersedia. Study yang dipilih ditampilkan di sidebar kiri.

> Untuk role selain Admin: sistem akan menampilkan study yang tersedia. Klik study untuk memilih.

### 3.3 Pilih Site

Setelah study dipilih, pilih **site** (lokasi penelitian) tempat Anda bertugas. Sidebar lengkap baru muncul setelah site dipilih.

---

## 4. Dashboard

Menampilkan ringkasan studi secara real-time:

- **Subjects:** Total terdaftar, aktif, selesai, withdrew
- **Adverse Events:** Total AE, AE serius (SAE), AE terbuka
- **Queries:** Total query, query terbuka (butuh tindakan)
- **Consent Coverage:** Persentase subjek yang sudah consent
- **Recent Activity:** 10 aktivitas audit terakhir

Klik angka pada kartu untuk langsung menuju modul terkait.

---

## 5. Subjects

Modul untuk mendaftarkan dan mengelola subjek penelitian.

### Hak Akses

<!-- AUTO-GENERATED:PERM-SUBJECTS-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `GET /status-overview` | ✓ | ✓ | — | ✓ | — |
| `POST /` | ✓ | ✓ | ✓ | — | ✓ |
| `PATCH /:id/status` | ✓ | ✓ | ✓ | — | — |
| `POST /:id/ie-assessment` | ✓ | ✓ | ✓ | — | — |
<!-- AUTO-GENERATED:PERM-SUBJECTS-END -->

### Cara Penggunaan

**Daftarkan subjek baru:**
1. Klik **+ Enroll Subject**
2. Isi Subject Code (unik per studi), Initials, Date of Birth, Sex, Site
3. Klik **Enroll** — kunjungan (visits) otomatis dibuat sesuai jadwal protokol

**Lihat detail subjek:**
- Klik kode subjek untuk melihat semua kunjungan dan status formulir

**Ubah status subjek:**
- Gunakan tombol **Change Status** untuk: Completed / Withdrawn / Screen Failed
- Penarikan (Withdrawal) memerlukan alasan

---

## 6. Adverse Events

Pencatatan kejadian tidak diinginkan selama studi.

### Hak Akses

<!-- AUTO-GENERATED:PERM-AE-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `POST /` | ✓ | ✓ | ✓ | — | — |
| `PATCH /:id` | ✓ | ✓ | ✓ | — | — |
| `PATCH /:id/report` | ✓ | ✓ | ✓ | — | — |
| `PATCH /:id/close` | ✓ | ✓ | — | — | — |
<!-- AUTO-GENERATED:PERM-AE-END -->

### Cara Penggunaan

1. Klik **+ Report AE**
2. Pilih subjek, isi tanggal onset, deskripsi, tingkat keparahan (Mild/Moderate/Severe/Life-threatening/Fatal), dan apakah SAE
3. **SAE (Serious AE):** Wajib dilaporkan ke Sponsor/IRB dalam 24–72 jam sesuai ICH E2A
4. Gunakan **Close AE** (PI/Admin) setelah AE selesai ditangani

---

## 7. Protocol Deviations

Pencatatan penyimpangan dari protokol.

### Hak Akses

<!-- AUTO-GENERATED:PERM-DEVIATIONS-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `POST /` | ✓ | ✓ | ✓ | — | — |
| `PATCH /:id` | ✓ | ✓ | ✓ | — | — |
| `PATCH /:id/report-irb` | ✓ | ✓ | ✓ | — | — |
| `PATCH /:id/status` | ✓ | ✓ | — | — | — |
<!-- AUTO-GENERATED:PERM-DEVIATIONS-END -->

### Cara Penggunaan

1. Klik **+ Report Deviation**
2. Isi subjek, tanggal, deskripsi deviasi, dan tipe (Protocol/Consent/GCP/Other)
3. Alur status: `Open → CAPA → Closed`
4. Advance status (CAPA/Close) hanya bisa dilakukan oleh PI atau Admin

---

## 8. Informed Consent

Pencatatan persetujuan subjek sesuai ICH GCP dan UU PDP Indonesia.

### Hak Akses

<!-- AUTO-GENERATED:PERM-CONSENTS-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `POST /` | ✓ | ✓ | ✓ | — | ✓ |
| `PATCH /:id/withdraw` | ✓ | ✓ | ✓ | — | — |
<!-- AUTO-GENERATED:PERM-CONSENTS-END -->

### Cara Penggunaan

1. Klik **+ Record Consent**
2. Pilih subjek, isi versi formulir consent, tanggal, tipe (Initial / Re-consent / Withdrawal), dan bahasa
3. **Penarikan consent:** Gunakan tombol **Withdraw** — memerlukan alasan

---

## 9. Randomization

Pengelolaan alokasi perlakuan subjek.

### Hak Akses

<!-- AUTO-GENERATED:PERM-RANDOMIZATION-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `GET /list` | ✓ | — | — | — | — |
| `POST /list` | ✓ | — | — | — | — |
| `POST /` | ✓ | ✓ | ✓ | — | — |
| `PATCH /:id/unblind` | ✓ | — | — | — | — |
<!-- AUTO-GENERATED:PERM-RANDOMIZATION-END -->

### Cara Penggunaan

- **Admin:** Upload daftar randomisasi (CSV) terlebih dahulu
- **PI/Investigator:** Klik **Randomize** pada subjek yang memenuhi syarat — sistem mengalokasikan kode randomisasi berikutnya secara berurutan
- **Unblind:** Hanya Admin. Digunakan untuk keadaan darurat medis

---

## 10. Data Queries

Komunikasi formal antara CRA dan tim situs mengenai inkonsistensi data.

### Hak Akses

<!-- AUTO-GENERATED:PERM-QUERIES-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `POST /` | ✓ | — | — | ✓ | — |
| `PATCH /:id/resolve` | ✓ | ✓ | ✓ | — | ✓ |
| `PATCH /:id/close` | ✓ | — | — | ✓ | — |
<!-- AUTO-GENERATED:PERM-QUERIES-END -->

### Alur Query

```
CRA raise query (Open)
      ↓
CRC/PI menjawab (Resolved)
      ↓
CRA memverifikasi & menutup (Closed)
```

- Query yang dibuat otomatis oleh sistem (validasi edit check) ditandai dengan `[Auto]`
- Notifikasi email dikirim ke investigator saat query dibuat, dan ke CRA saat query dijawab

---

## 11. Data Entry (CRF Forms)

Pengisian formulir data klinis per kunjungan subjek.

### Hak Akses

<!-- AUTO-GENERATED:PERM-ENTRIES-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `POST /` | ✓ | ✓ | ✓ | — | ✓ |
| `PATCH /:id/lock` | ✓ | ✓ | — | ✓ | — |
| `PATCH /:id/unlock` | ✓ | — | — | — | — |
<!-- AUTO-GENERATED:PERM-ENTRIES-END -->

### Cara Penggunaan

1. Buka **Subjects → [Subjek] → [Kunjungan] → [Formulir]**
2. Isi field sesuai data sumber (source document)
3. Klik **Save** — sistem validasi otomatis:
   - **Hard error:** Data tidak dapat disimpan (mis. nilai di luar batas fisiologis)
   - **Soft warning:** Data tersimpan tapi query otomatis dibuat untuk field yang mencurigakan
4. **Lock entry:** CRA/PI mengunci formulir setelah SDV selesai
5. Setiap perubahan data (update) wajib menyertakan alasan (21 CFR Part 11)

---

## 12. e-Signature

Penandatanganan elektronik formulir CRF oleh PI sesuai 21 CFR Part 11.

### Hak Akses

<!-- AUTO-GENERATED:PERM-SIGNATURES-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `POST /` | ✓ | ✓ | ✓ | — | — |
<!-- AUTO-GENERATED:PERM-SIGNATURES-END -->

### Cara Penggunaan

1. Buka formulir yang sudah tersimpan (status: Saved)
2. Klik **Sign** di bagian bawah formulir
3. Masukkan **password akun** Anda (bukan PIN terpisah)
4. Pilih **Meaning** (misal: "I confirm this data is accurate and complete")
5. Klik **Apply Signature** — status formulir berubah menjadi **Signed**

> Formulir dengan status Draft tidak dapat ditandatangani — harus disimpan dulu.

---

## 13. Audit Trail

Rekam jejak seluruh perubahan data sesuai 21 CFR Part 11.

Audit trail dapat difilter berdasarkan:
- Tabel (subjek, AE, query, dll.)
- Aksi (INSERT, UPDATE, LOCK, SIGN)
- Rentang tanggal

Dapat dicetak langsung dari browser (`Ctrl+P`).

**Akses:** Administrator, PI, CRA

---

## 14. Database Lock

Penguncian database permanen setelah semua data bersih.

### Hak Akses

<!-- AUTO-GENERATED:PERM-DBLOCK-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `POST /check` | ✓ | ✓ | — | ✓ | — |
| `POST /initiate` | ✓ | ✓ | — | — | — |
| `POST /:id/sign-cra` | ✓ | ✓ | — | ✓ | — |
| `POST /:id/sign-admin` | ✓ | ✓ | — | — | — |
<!-- AUTO-GENERATED:PERM-DBLOCK-END -->

### Alur Database Lock

```
Admin/PI → Run Pre-Lock Checks
         ↓ (semua passed)
Admin/PI → Initiate DB Lock
         ↓
CRA      → e-Signature (re-enter password)
         ↓
Admin    → e-Signature (re-enter password) → DATABASE LOCKED
```

### Pre-Lock Checks Otomatis

Sistem memeriksa secara otomatis sebelum lock diizinkan:

| Check | Syarat |
|-------|--------|
| Semua query tertutup | Tidak ada query berstatus Open |
| Tidak ada query pending CRA | Tidak ada query berstatus Resolved |
| Tidak ada formulir Draft | Semua CRF sudah tersimpan |
| Semua formulir ditandatangani | Tidak ada CRF berstatus Saved |
| Tidak ada SAE Draft | Semua SAE sudah dilaporkan |
| Tidak ada deviasi terbuka | Semua deviasi berstatus CAPA/Closed |

Setelah locked, **seluruh data bersifat read-only permanen** dan siap diekspor ke tim statistik.

---

## 15. Delegation Log & Training

Pencatatan delegasi tugas dan rekam pelatihan tim situs sesuai ICH GCP §4.1.5.

### Hak Akses

<!-- AUTO-GENERATED:PERM-DELEGATION-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `GET /` | ✓ | ✓ | — | ✓ | — |
| `GET /training/records` | ✓ | ✓ | — | ✓ | — |
| `POST /training/records` | ✓ | ✓ | — | — | — |
| `GET /training/expiring` | ✓ | ✓ | — | ✓ | — |
| `DELETE /training/records/:id` | ✓ | ✓ | — | — | — |
| `GET /:id` | ✓ | ✓ | — | ✓ | — |
| `POST /` | ✓ | ✓ | — | — | — |
| `PATCH /:id` | ✓ | ✓ | — | — | — |
<!-- AUTO-GENERATED:PERM-DELEGATION-END -->

### Cara Penggunaan

- **PI/Admin:** Buat entri delegasi — tentukan staf, tugas yang didelegasikan, dan tanggal
- **Semua staf:** Tanda tangani entri delegasi milik sendiri (e-signature dengan password)
- **Training:** Catat sertifikat pelatihan; sistem akan memperingatkan jika mendekati kadaluarsa

---

## 16. SAE Reports

Laporan ekspedisi Serious Adverse Event (SAE) ke Sponsor/IRB sesuai ICH E2A.

### Hak Akses

<!-- AUTO-GENERATED:PERM-SAE-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `GET /` | ✓ | ✓ | — | ✓ | — |
| `GET /overdue` | ✓ | ✓ | — | ✓ | — |
| `GET /:id` | ✓ | ✓ | — | ✓ | — |
| `POST /` | ✓ | ✓ | — | ✓ | — |
| `PATCH /:id/submit` | ✓ | ✓ | — | ✓ | — |
<!-- AUTO-GENERATED:PERM-SAE-END -->

### Cara Penggunaan

1. Buat SAE Report dari data AE yang sudah ditandai sebagai serius
2. Isi narasi laporan, tanggal pelaporan, dan nomor laporan
3. Submit laporan — status berubah dari Draft → Submitted
4. Laporan yang overdue (>7 hari sejak onset tanpa submit) ditandai merah

---

## 17. Monitoring Visits & SDV

Kunjungan monitor dan Source Data Verification (SDV) sesuai ICH GCP §5.18.

### Hak Akses

<!-- AUTO-GENERATED:PERM-MONITORING-START -->
| Endpoint | Administrator | Principal Investigator | Investigator | CRA / Monitor | Study Coordinator |
|----------|:---:|:---:|:---:|:---:|:---:|
| `GET /` | ✓ | ✓ | — | ✓ | — |
| `GET /:id` | ✓ | ✓ | — | ✓ | — |
| `POST /` | ✓ | ✓ | — | ✓ | — |
| `PATCH /:id` | ✓ | ✓ | — | ✓ | — |
| `POST /:id/submit` | ✓ | ✓ | — | ✓ | — |
| `POST /:id/acknowledge` | ✓ | ✓ | — | — | — |
| `GET /:id/sdv` | ✓ | ✓ | — | ✓ | — |
| `POST /:id/sdv` | ✓ | ✓ | — | ✓ | — |
<!-- AUTO-GENERATED:PERM-MONITORING-END -->

### Alur Monitoring Visit

```
CRA membuat monitoring visit
      ↓
CRA melakukan SDV per subjek/formulir
   Status SDV: Not Reviewed → In Review → Verified / Discrepant
      ↓
CRA submit laporan kunjungan
      ↓
PI acknowledge (tanda tangan penerimaan)
```

> Ketika semua SDV subjek berstatus **Verified** dan tidak ada query terbuka, sistem otomatis mengirim notifikasi email ke PI/Investigator bahwa data subjek tersebut **siap untuk final review dan e-Signature**.

---

## 18. Data Status

Tampilan agregat per subjek — digunakan PI dan CRA untuk review akhir sebelum Database Lock.

**Kolom yang ditampilkan:**

| Kolom | Keterangan |
|-------|-----------|
| Subject | Kode dan inisial subjek |
| Site | Kode situs |
| Status | Active / Completed / Withdrawn |
| Entries | Progress bar: Draft / Saved / Signed / Locked |
| Signed | Jumlah formulir yang sudah ditandatangani |
| Queries | Badge "open" (kuning) atau "Clean" (hijau) |
| Randomization | Arm perlakuan |
| Data Clean | Tanda ✓ jika semua formulir tersimpan & tidak ada query terbuka |

Filter berdasarkan kode subjek atau status. Klik **Refresh** untuk memperbarui data.

---

## 19. Site Management

Pengelolaan lokasi penelitian. **Hanya Admin.**

1. Klik **+ Add Site**
2. Isi: Site Code, Site Name, Country, PI Name
3. Setelah site pertama dibuat, seluruh sidebar aktif otomatis

---

## 20. Study Management

Pengelolaan studi. **Hanya Admin.**

1. Klik **+ Create Study**
2. Isi: Title, Protocol Number, Sponsor, Phase, Start Date, End Date
3. Assign pengguna ke studi melalui tombol **Manage Users**
4. Status studi: Active / Suspended / Completed

---

## 21. Alur Kerja Lengkap

```
[Fase 1 — Persiapan]
Admin: Buat Study → Buat Site → Assign Users

[Fase 2 — Pelaksanaan]
CRC:  Enroll Subjek → Record Consent → Data Entry (CRF) → Jawab Query
PI:   e-Signature formulir → Acknowledge monitoring visit
CRA:  Raise Query → SDV → Monitoring Visit Report → Close Query

[Fase 3 — Penutupan]
Sistem: Notifikasi "Data Clean" ke PI jika semua query closed + SDV 100%
PI:   Final review → e-Signature semua formulir
CRA:  Run Pre-Lock Checks → Sign DB Lock
Admin: Sign DB Lock → Database LOCKED → Export data
```

---

## 22. FAQ

**Q: Saya tidak bisa login, password salah terus.**
A: Setelah 5 kali gagal, akun terkunci otomatis. Hubungi Administrator untuk membuka kunci melalui menu Security.

**Q: Saya sudah save formulir tapi muncul query otomatis.**
A: Query `[Auto]` dibuat sistem karena nilai yang dimasukkan berada di luar rentang normal (soft warning). Verifikasi data sumber dan jawab query tersebut.

**Q: Kenapa tombol Sign tidak muncul di formulir?**
A: Formulir harus berstatus **Saved** (bukan Draft). Simpan dulu, lalu tanda tangani.

**Q: Apakah data bisa diubah setelah di-Lock?**
A: Tidak. Database Lock bersifat permanen. Hanya Admin yang dapat Unlock entry individual (bukan study lock) dengan alasan yang tercatat di audit trail.

**Q: Bagaimana cara ekspor data untuk analisis statistik?**
A: Gunakan menu **Export** di Dashboard (tersedia untuk Admin, CRA, PI) — format ODM-XML atau CSV.

**Q: Akses saya terbatas, tidak melihat semua menu.**
A: Tampilan menu disesuaikan dengan role akun Anda. Lihat tabel hak akses di [Bagian 2](#2-role--hak-akses).

---

_Dokumen ini dihasilkan dari kode sumber aplikasi dan diperbarui otomatis saat ada perubahan. Untuk pertanyaan teknis, hubungi Administrator._
