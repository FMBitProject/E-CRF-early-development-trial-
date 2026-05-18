# Panduan Pengguna — Sistem E-CRF / EDC

> **Versi dokumen:** 1.0 | **Berlaku untuk:** Semua pengguna sistem  
> Sistem ini memenuhi persyaratan FDA 21 CFR Part 11, ICH GCP E6(R3), dan UU PDP (UU No. 27/2022).

---

## Daftar Isi

1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Login dan Pemilihan Studi](#2-login-dan-pemilihan-studi)
3. [Navigasi dan Antarmuka](#3-navigasi-dan-antarmuka)
4. [Dashboard](#4-dashboard)
5. [Subjects — Enrollmen Subjek](#5-subjects--enrollment-subjek)
6. [Informed Consent](#6-informed-consent)
7. [Medical History](#7-medical-history)
8. [Concomitant Medications](#8-concomitant-medications)
9. [Vital Signs](#9-vital-signs)
10. [Laboratory Results](#10-laboratory-results)
11. [Adverse Events](#11-adverse-events)
12. [Protocol Deviations](#12-protocol-deviations)
13. [SAE Reports](#13-sae-reports)
14. [Queries — Manajemen Ketidaksesuaian](#14-queries--manajemen-ketidaksesuaian)
15. [Randomization](#15-randomization)
16. [Protocol Amendments](#16-protocol-amendments)
17. [Delegation & Training](#17-delegation--training)
18. [Monitoring Visits](#18-monitoring-visits)
19. [Data Status](#19-data-status)
20. [Audit Trail](#20-audit-trail)
21. [Database Lock](#21-database-lock)
22. [Ringkasan Hak Akses per Peran](#22-ringkasan-hak-akses-per-peran)
23. [Pertanyaan Umum (FAQ)](#23-pertanyaan-umum-faq)

---

## 1. Gambaran Umum Sistem

Sistem E-CRF ini adalah platform **Electronic Data Capture (EDC)** berbasis web untuk mengelola data klinis uji coba (clinical trial). Semua data yang dimasukkan tercatat secara otomatis dalam **Audit Trail** yang tidak dapat diubah, sesuai standar regulasi internasional.

### Peran pengguna yang tersedia

| Peran | Kode | Fungsi utama |
|-------|------|--------------|
| Administrator | admin | Kelola studi, site, user, konfigurasi sistem |
| Principal Investigator | pi | Supervisi studi, tanda tangan dokumen, approvals |
| Investigator | investigator | Entri data klinis, penanganan AE/SAE |
| CRA / Monitor | cra | Monitor data, SDV, raise queries, database lock |
| Study Coordinator | crc | Entri data harian, enrollment subjek |

---

## 2. Login dan Pemilihan Studi

### 2.1 Masuk ke sistem

1. Buka aplikasi di browser (Chrome/Firefox/Edge — versi terbaru)
2. Masukkan **email** dan **password** yang diberikan administrator
3. Klik **Sign In**

> Jika lupa password, hubungi administrator sistem — tidak ada fitur reset password mandiri karena alasan keamanan 21 CFR Part 11.

### 2.2 Pilih Studi

Setelah login, layar pemilihan studi akan muncul:

1. Klik studi yang ingin dikerjakan dari daftar
2. Klik **Switch to this Study**
3. Status studi akan tampil di bagian atas aplikasi

> **Penting:** Pastikan memilih studi yang benar sebelum melakukan entri data apapun. Semua data yang dimasukkan akan terikat pada studi yang sedang aktif.

### 2.3 Pilih Site

Setelah memilih studi, pilih site tempat Anda bertugas:

1. Klik **Select Site** atau gunakan dropdown site di sidebar
2. Pilih site Anda dari daftar
3. Chip hijau di bagian atas sidebar akan menampilkan kode dan nama site yang aktif

> **Tanda chip hijau** berarti site sudah dipilih. Data subjek yang ditampilkan akan difilter sesuai site aktif. Jika chip tidak muncul, klik ikon navigasi untuk memilih site.

### 2.4 Ganti Studi

Untuk berpindah studi:
1. Klik menu **Studies** di sidebar
2. Klik **Switch** pada studi yang dituju
3. Sistem akan otomatis **menghapus konteks site** — pilih site kembali untuk studi baru

---

## 3. Navigasi dan Antarmuka

### Sidebar (kiri)

- **Chip hijau** di bagian atas: menampilkan site yang sedang aktif
- **Menu navigasi**: klik item untuk berpindah modul
- **Profil & peran**: tampil di bagian bawah sidebar (nama, email, badge peran)
- Jika menu lebih panjang dari layar, gunakan tombol **panah atas/bawah** yang muncul di tepi atas/bawah sidebar

### Header (atas)

- **Breadcrumb**: jalur halaman yang sedang dibuka
- **Ikon lonceng**: notifikasi dan alert sistem (query baru, SAE mendekati deadline, dll.)

### Compliance Bar

Baris berwarna gelap di bawah header menampilkan status kepatuhan regulasi aktif:
`FDA 21 CFR Part 11 | ICH GCP E6(R2) | Audit Trail Active`

### Banner Status Studi

Jika studi berstatus **Terminated, Completed, atau Suspended**, banner merah/abu-abu akan muncul dan **semua entri data diblokir**.

---

## 4. Dashboard

Dashboard menampilkan ringkasan kondisi studi secara real-time:

- **KPI cards**: total subjek, AE aktif, query terbuka, SAE mendekati deadline
- **Grafik enrollment**: tren enrollmen subjek per waktu
- **Tabel ringkasan**: status data per subjek

Klik angka pada KPI card untuk langsung menuju modul terkait.

---

## 5. Subjects — Enrollment Subjek

### 5.1 Melihat daftar subjek

Klik **Subjects** di sidebar. Tabel menampilkan:
- Kode subjek, site, inisial, tanggal lahir, status, tanggal enrollment

Gunakan kolom pencarian atau filter status untuk mempersempit daftar.

### 5.2 Enroll Subjek Baru

1. Klik tombol **+ Enroll Subject**
2. Isi formulir enrollment:

| Field | Keterangan |
|-------|------------|
| Subject Code | Kode unik subjek (sesuai protokol, mis. JKT-002-001) |
| Site | Site tempat subjek enrolled |
| Inisial | 2–3 huruf inisial nama subjek |
| Tanggal Lahir | Format: YYYY-MM-DD |
| Jenis Kelamin | Male / Female / Other |
| Tanggal Enrollment | Tanggal subjek resmi terdaftar |
| Inklusi/Eksklusi | Centang semua kriteria inklusi; pastikan tidak ada kriteria eksklusi yang terpenuhi |

3. Klik **Enroll** untuk menyimpan

> Sistem akan memblokir enrollment jika ada kriteria eksklusi yang dicentang.

### 5.3 Detail Subjek & Visit

Klik nama/kode subjek untuk membuka detail:

- **Tab Informasi**: data demografis, status, tanggal enrollment
- **Tab Visits**: jadwal visit sesuai protokol (Screening, Baseline, Day 30, dll.)
  - Status visit: **Planned** → **Completed** / **Missed**
  - Klik **Add Visit** untuk menambah visit
  - Klik **Edit** untuk mengubah tanggal atau status visit
  - Alasan wajib diisi jika visit berstatus **Missed**

### 5.4 Status Subjek

| Status | Arti |
|--------|------|
| Screening | Sedang dalam proses seleksi |
| Active | Terdaftar dan aktif mengikuti studi |
| Completed | Telah menyelesaikan semua visit |
| Withdrawn | Mengundurkan diri dari studi |
| Screen Failed | Tidak memenuhi kriteria eligibility |

---

## 6. Informed Consent

Modul ini mencatat dan memantau proses persetujuan informasi subjek sesuai ICH GCP §4.8 dan UU PDP §20-26.

### 6.1 Melihat Status Consent

Dashboard Consent menampilkan:
- Jumlah subjek yang sudah consent
- Jumlah subjek yang belum consent (risiko kepatuhan)
- Jumlah subjek yang menarik consent

### 6.2 Merekam Consent Baru

1. Klik **+ Record Consent**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Subject | Pilih subjek dari dropdown (hanya subjek di site aktif) |
| Consent Type | Initial (pertama), Re-consent (setelah amandemen), Withdrawal (penarikan) |
| ICF Version | Pilih versi ICF dari dropdown — opsi otomatis diambil dari amandemen yang sudah Approved/Implemented |
| Tanggal TTD | Tanggal subjek menandatangani formulir consent |
| Bahasa | Bahasa dokumen consent yang digunakan |
| Nama Saksi | Nama lengkap saksi yang hadir saat penandatanganan |

3. Klik **Save** untuk menyimpan

> **ICF Version**: dropdown menampilkan versi berdasarkan amandemen protokol yang sudah disetujui. Jika versi yang dibutuhkan tidak ada, pilih "Kustom / Lainnya" dan isi manual.

### 6.3 Withdrawal Consent

Jika subjek menarik diri:
1. Pilih **Consent Type: Withdrawal**
2. Isi tanggal penarikan
3. Catatan alasan penarikan di field Notes
4. Klik **Save** — status subjek akan otomatis diperbarui

---

## 7. Medical History

Mencatat riwayat penyakit sebelumnya yang relevan dengan studi.

### 7.1 Menambah Riwayat Penyakit

1. Klik **+ Add Record**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Subject | Pilih subjek dari dropdown |
| Condition | Nama kondisi medis (mis. Hipertensi, Diabetes Mellitus Tipe 2) |
| ICD Version | Pilih ICD-10, ICD-11, atau ICD-9 terlebih dahulu |
| ICD Code | Ketik kode (mis. E11) atau nama kondisi — dropdown akan muncul; klik untuk memilih. Jika Condition masih kosong, akan terisi otomatis |
| Onset Date | Tanggal mulai kondisi tersebut |
| Resolution Date | Tanggal sembuh (kosongkan jika masih aktif) |
| Status | Active / Resolved / Unknown |
| Severity | Mild / Moderate / Severe / Unknown |
| Related to Indication | Centang jika kondisi berhubungan dengan indikasi studi |
| Notes | Catatan tambahan klinis |

3. Klik **Add Record**

### 7.2 Edit Rekaman

1. Klik ikon **Edit** pada baris yang ingin diubah
2. Ubah data yang diperlukan
3. Isi **Reason for Change** (wajib) — jelaskan apa yang diubah dan mengapa
4. Klik **Save Changes**

> Field "Reason for Change" wajib diisi setiap edit. Ini dicatat di Audit Trail sesuai ICH GCP.

---

## 8. Concomitant Medications

Mencatat obat-obatan lain yang dikonsumsi subjek selama studi.

### 8.1 Menambah Obat

1. Klik **+ Add Medication**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Subject | Pilih subjek |
| Drug Name | Nama obat (nama generik atau merek) |
| WHO/ATC Code | Kode WHO/ATC jika tersedia (mis. C09AA01 untuk Captopril) |
| Indication | Alasan pemberian obat |
| Dose | Dosis numerik |
| Unit | Satuan dosis (mg, mcg, g, dll.) |
| Frequency | Frekuensi pemberian (mis. BID, TID, QD) |
| Route | Rute pemberian (Oral, IV, SC, dll.) |
| Start Date | Tanggal mulai konsumsi |
| Stop Date | Tanggal berhenti (kosongkan jika masih dikonsumsi) |
| Ongoing | Centang jika obat masih dikonsumsi |

3. Klik **Add Medication**

---

## 9. Vital Signs

Mencatat pengukuran tanda-tanda vital subjek pada setiap visit.

### 9.1 Menambah Data Vital Signs

1. Klik **+ Add Vital Signs**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Subject | Pilih subjek |
| Visit | Pilih visit terkait |
| Assessment Date/Time | Tanggal dan waktu pengukuran |
| Position | Posisi subjek saat pengukuran (Supine, Sitting, Standing) |
| Systolic BP | Tekanan darah sistolik (mmHg) |
| Diastolic BP | Tekanan darah diastolik (mmHg) |
| Heart Rate | Denyut jantung (bpm) |
| Respiratory Rate | Laju pernapasan (breaths/min) |
| Temperature | Suhu tubuh (°C atau °F) |
| Weight | Berat badan (kg atau lbs) |
| Height | Tinggi badan (cm atau in) |
| BMI | Dihitung otomatis dari berat dan tinggi |
| O₂ Saturation | Saturasi oksigen (%) |
| Notes | Catatan klinis tambahan |

3. Klik **Save**

> Nilai abnormal (tekanan darah, detak jantung di luar rentang normal) akan otomatis ditandai dengan warna **kuning/amber** di tabel.

---

## 10. Laboratory Results

Mencatat hasil pemeriksaan laboratorium dengan coding LOINC.

### 10.1 Menambah Hasil Lab

1. Klik **+ Add Result**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Subject | Pilih subjek |
| Visit | Pilih visit |
| Panel | Kategori panel (Hematology, Chemistry, Coagulation, Urinalysis) |
| Test Name | Pilih nama tes — kode LOINC otomatis terisi |
| Specimen | Jenis spesimen (otomatis terisi dari LOINC) |
| Value | Nilai hasil numerik atau teks |
| Unit | Satuan (otomatis terisi dari LOINC) |
| Reference Range | Rentang normal (otomatis terisi dari LOINC) |
| Abnormality Flag | L (Low), H (High), LL (Critically Low), HH (Critically High), A (Abnormal) |
| Clinical Significance | CS (Clinically Significant), NCS (Not CS), N/A |

3. Klik **Save**

### 10.2 Verifikasi Hasil Lab

Hasil lab baru berstatus **Pending**. Investigator atau Admin harus memverifikasi:

1. Klik ikon **Verify** (centang) pada baris yang ingin diverifikasi
2. Konfirmasi verifikasi

> Hanya Investigator dan Admin yang dapat memverifikasi hasil lab. CRC/CRA tidak dapat melakukan verifikasi.

---

## 11. Adverse Events

Mencatat semua kejadian tidak diinginkan (adverse event) selama studi, sesuai ICH E2A.

### 11.1 Menambah Adverse Event

1. Klik **+ Add AE**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Subject | Pilih subjek |
| Verbatim Term | Deskripsi AE persis seperti dilaporkan |
| MedDRA PT | Preferred Term MedDRA (pilih dari dropdown) |
| MedDRA SOC | System Organ Class (otomatis dari PT) |
| Onset Date | Tanggal AE mulai |
| Resolution Date | Tanggal AE selesai (kosongkan jika belum) |
| Outcome | Recovered, Recovering, Not Recovered, Fatal, Unknown |
| Severity (CTCAE) | Grade 1–5 |
| Causality | Unrelated, Unlikely, Possible, Probable, Definite |
| Action Taken | None, Drug Withdrawn, Dose Reduced, Dose Increased, Other |

### 11.2 Menandai sebagai SAE

Jika AE memenuhi kriteria SAE:

1. Centang **Serious Adverse Event**
2. Pilih **SAE Criteria** (satu atau lebih):
   - Death (kematian)
   - Life-threatening
   - Hospitalization / Prolonged hospitalization
   - Disability / Incapacity
   - Congenital Anomaly / Birth Defect
   - Medically Important

3. Sistem otomatis menentukan **deadline pelaporan**:
   - Fatal / Life-threatening: **7 hari**
   - SAE lainnya: **15 hari**

4. Klik **Save AE**

### 11.3 Alur Status AE

```
Draft → Reported (dilaporkan ke sponsor) → Closed
```

---

## 12. Protocol Deviations

Mencatat setiap penyimpangan dari protokol studi yang terjadi.

### 12.1 Menambah Deviasi

1. Klik **+ Record Deviation**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Subject | Pilih subjek |
| Type | Major / Minor / Important |
| Category | Pilih kategori (Eligibility, Consent, Visit Window, Medication, dll.) |
| Deviation Date | Tanggal deviasi terjadi |
| Discovery Date | Tanggal deviasi ditemukan |
| Description | Deskripsi lengkap deviasi |
| Root Cause | Penyebab utama terjadinya deviasi |
| Impact | Dampak terhadap subjek dan data studi |
| CAPA | Corrective and Preventive Action yang diambil |

3. Klik **Save**

### 12.2 Alur Status Deviasi

```
Open → CAPA Implemented → Closed
```

> Deviasi **Major** wajib dilaporkan ke IRB. Kolom "IRB Reporting" akan menampilkan status: Pending / Reported.

---

## 13. SAE Reports

Modul ini khusus untuk mengelola laporan ekspedisi SAE ke sponsor/IRB dalam batas waktu regulasi.

### 13.1 Membuat SAE Report Baru

1. Klik **+ New SAE Report**
2. Pilih AE yang terkait (yang sudah ditandai SAE)
3. Sistem otomatis mengisi:
   - **Day 0** (tanggal pertama diketahui)
   - **Deadline** (Day 0 + 7 atau + 15 hari)
   - **Timeline bar** menunjukkan sisa waktu

### 13.2 Tanda Tangan Laporan SAE (WAJIB)

Sebelum laporan dapat disubmit, **Investigator atau PI harus menandatangani**:

1. Klik tombol **Sign** (ungu)
2. Isi formulir tanda tangan:
   - **Password akun**: konfirmasi identitas elektronik
   - **Signing Meaning**: pilih pernyataan ("Saya menyatakan laporan SAE ini akurat dan lengkap")
3. Klik **Sign Report**

> Tombol "Mark Submitted" hanya aktif setelah laporan ditandatangani. Ini memenuhi persyaratan **ICH GCP E6(R3) C.4.4**.

### 13.3 Submit Laporan

Setelah ditandatangani:
1. Klik **Mark Submitted**
2. Isi nomor referensi (jika ada)
3. Status berubah menjadi **Submitted** (atau **Late Submission** jika melewati deadline)

> **Late Submission** otomatis tercatat di Audit Trail dengan jumlah hari keterlambatan.

### 13.4 Indikator Deadline

| Warna badge | Arti |
|-------------|------|
| Hijau | Masih dalam batas waktu |
| Kuning/Amber | Mendekati deadline (< 2 hari) |
| Merah | Sudah melewati deadline |

---

## 14. Queries — Manajemen Ketidaksesuaian

Query adalah mekanisme komunikasi resmi antara CRA (Monitor) dan Investigator/CRC untuk menyelesaikan ketidaksesuaian data.

### 14.1 Alur Query

```
CRA membuat query → Investigator/CRC menjawab → CRA menutup query
```

### 14.2 Menjawab Query (Investigator / CRC)

1. Klik **Queries** di sidebar — query yang menunggu jawaban tampil di bagian atas
2. Klik **Respond** pada query yang ingin dijawab
3. Isi respon dengan penjelasan lengkap dan data korektif
4. Klik **Submit Response**
5. Status query berubah menjadi **Resolved** (menunggu review CRA)

### 14.3 Menutup Query (CRA)

1. Buka query dengan status **Resolved**
2. Tinjau respon investigator
3. Klik **Close Query** jika respon memadai, atau **Reopen** jika perlu klarifikasi tambahan

> Semua query harus **Closed** sebelum Database Lock dapat dilakukan.

---

## 15. Randomization

> Modul ini hanya tersedia untuk **Administrator**.

### 15.1 Upload Daftar Randomisasi

1. Klik **Randomization** di sidebar
2. Klik **Upload Randomization List**
3. Upload file JSON dengan format:
```json
[
  { "randCode": "R001", "treatmentArm": "Active", "stratum": "Male" },
  { "randCode": "R002", "treatmentArm": "Placebo", "stratum": "Female" }
]
```

### 15.2 Randomisasi Subjek

1. Pilih subjek yang akan dirandomisasi
2. Pilih stratum (jika ada)
3. Klik **Randomize** — sistem memilih slot berikutnya secara otomatis
4. Kode randomisasi ditampilkan (terblinded jika studi blinded)

### 15.3 Emergency Unblinding

Hanya untuk kondisi medis darurat:
1. Klik **Unblind** pada subjek terkait
2. Isi **justifikasi klinis** (wajib)
3. Konfirmasi — tindakan ini **permanen dan tercatat di Audit Trail**

---

## 16. Protocol Amendments

Mencatat dan mengelola perubahan protokol studi.

### 16.1 Menambah Amandemen

1. Klik **+ New Amendment**
2. Isi formulir:

| Field | Keterangan |
|-------|------------|
| Amendment Number | Nomor amandemen (mis. A01, A02) |
| Effective Date | Tanggal amandemen berlaku |
| Summary | Ringkasan singkat perubahan |
| Detailed Changes | Deskripsi lengkap semua perubahan |
| Requires Re-consent | Ya/Tidak — apakah subjek aktif perlu menandatangani ulang consent |
| Re-consent Reason | Alasan re-consent diperlukan (jika Ya) |
| IRB Approval Date | Tanggal persetujuan IRB |
| IRB Reference | Nomor referensi dokumen IRB |

### 16.2 Alur Status Amandemen

```
Draft → Approved → Implemented
```

Untuk memajukan status:
1. Klik **Approve** (memerlukan alasan)
2. Setelah diimplementasikan, klik **Mark Implemented**

### 16.3 Tracking Re-consent

Jika amandemen memerlukan re-consent:
1. Klik **View Status** pada amandemen yang sudah Approved
2. Modal menampilkan daftar subjek aktif dengan status:
   - **Pending**: belum melakukan re-consent
   - **Done**: sudah melakukan re-consent
3. Lakukan pencatatan consent baru dengan ICF version sesuai amandemen tersebut

---

## 17. Delegation & Training

Modul ini mendokumentasikan pendelegasian tugas dan rekaman pelatihan anggota tim studi, sesuai ICH GCP §4.1.5 dan §8.3.

### 17.1 Delegation Log

1. Klik **Delegation** di sidebar
2. Klik **+ Add Delegation**
3. Pilih:
   - **Staf**: anggota tim yang mendapat delegasi
   - **Peran**: peran dalam studi
   - **Tugas yang didelegasikan**: centang semua tugas relevan:
     - Data Entry
     - Query Resolution
     - Source Data Verification (SDV)
     - AE Reporting
     - Protocol Deviation
     - Informed Consent
     - Randomization
     - Sample Collection
     - Study Drug Accountability
     - Subject Follow-up
   - **Periode delegasi**: tanggal mulai dan selesai (atau centang "Ongoing")

4. Klik **Save** — PI/Admin kemudian harus menandatangani delegasi

### 17.2 Training Records

1. Klik tab **Training Records**
2. Klik **+ Add Training**
3. Isi:
   - **Staf**: peserta pelatihan
   - **Jenis pelatihan**: GCP, Protocol, EDC System, Safety Reporting, CDISC, Informed Consent, Local Regulatory
   - **Tanggal pelatihan**
   - **Tanggal kadaluarsa sertifikat**
   - **Nomor referensi sertifikat**

> Alert otomatis muncul jika sertifikat pelatihan akan kadaluarsa dalam **30 hari**.

---

## 18. Monitoring Visits

Mencatat kunjungan monitoring CRA dan hasil Source Data Verification (SDV).

### 18.1 Membuat Laporan Monitoring

1. Klik **+ New Visit Report** (CRA)
2. Isi:

| Field | Keterangan |
|-------|------------|
| Visit Date | Tanggal kunjungan monitoring |
| Visit Type | Site Initiation / Routine / Close-out / Remote |
| Site | Site yang dikunjungi |
| Findings | Temuan utama selama monitoring |
| Next Visit Date | Rencana kunjungan berikutnya |
| Notes | Catatan tambahan |

3. Klik **Save as Draft**
4. Setelah selesai, klik **Submit** untuk kirim ke PI

### 18.2 SDV (Source Data Verification)

1. Buka laporan monitoring yang sudah disubmit
2. Klik **SDV** pada form/visit yang ingin diverifikasi
3. Set status SDV:
   - **Verified**: data cocok dengan source document
   - **Discrepant**: data tidak cocok — isi catatan ketidaksesuaian
   - **Not Reviewed**: belum diperiksa
   - **N/A**: tidak berlaku

### 18.3 Acknowledge (PI)

1. PI membuka laporan monitoring yang di-submit
2. Tinjau temuan dan SDV
3. Klik **Acknowledge** dan isi komentar jika ada
4. Status laporan berubah menjadi **Acknowledged**

---

## 19. Data Status

Dashboard real-time kualitas data per subjek. Digunakan untuk memantau kelengkapan pengisian sebelum Database Lock.

### Cara membaca tabel

| Kolom | Arti |
|-------|------|
| Subject | Kode subjek dan inisial |
| Site | Kode site |
| Status | Status subjek saat ini |
| CRF Entry | Bar warna yang menunjukkan proporsi: Draft / Saved / Signed / Locked |
| Signed | Jumlah form yang sudah ditandatangani |
| Open Queries | Jumlah query yang masih terbuka (merah jika > 0) |
| Randomization | Status dan arm randomisasi |
| Data Clean | Centang hijau jika tidak ada query terbuka dan ada data yang diisi |

> Gunakan halaman ini sebelum Database Lock untuk memastikan semua data berstatus **clean** dan **tidak ada open query**.

---

## 20. Audit Trail

Rekaman lengkap semua aktivitas dalam sistem — tidak dapat diubah atau dihapus.

### Yang tercatat di Audit Trail

- Setiap INSERT, UPDATE, DELETE data
- Login dan logout pengguna
- Tanda tangan elektronik
- Database Lock/Unlock
- Randomization dan unblinding
- Semua perubahan status

### Cara membaca Audit Trail

1. Klik **Audit Trail** di sidebar
2. Gunakan filter:
   - **Action**: INSERT / UPDATE / DELETE / LOCK / SIGN
   - **Table**: pilih modul spesifik
   - **Search**: cari berdasarkan user, alasan perubahan, atau nama field
3. Klik **Export CSV** untuk mengunduh log

Setiap baris menampilkan:
- Timestamp (tanggal dan waktu tepat)
- User yang melakukan aksi
- Tindakan yang dilakukan
- Field yang berubah, nilai sebelum dan sesudah
- Alasan perubahan
- Alamat IP

---

## 21. Database Lock

Proses akhir untuk mengunci data studi sehingga tidak dapat diubah lagi. Memerlukan **dua tanda tangan elektronik** (CRA + Admin/PI).

### Prasyarat sebelum Database Lock

Semua kondisi berikut harus terpenuhi:
- [ ] Semua queries berstatus **Closed**
- [ ] Tidak ada data entry yang berstatus **Draft**
- [ ] Semua SAE reports sudah **Submitted**
- [ ] Semua protocol deviations sudah **Closed**
- [ ] Data Status: semua subjek menunjukkan **Clean**

### Prosedur Database Lock

**Langkah 1 — Inisiasi (CRA)**
1. Klik **DB Lock** di sidebar
2. Klik **Initiate Database Lock**
3. Sistem menjalankan auto-check — semua prasyarat harus lolos
4. Jika ada yang gagal, selesaikan item tersebut terlebih dahulu

**Langkah 2 — Tanda Tangan CRA**
1. Klik **Sign (CRA)**
2. Masukkan password akun
3. Konfirmasi tanda tangan elektronik

**Langkah 3 — Tanda Tangan Admin/PI (Final Lock)**
1. Admin atau PI klik **Sign (Admin/PI)**
2. Masukkan password akun
3. Database resmi terkunci

> Setelah locked, **tidak ada data yang dapat diubah**. Semua route penulisan data akan mengembalikan error 423. Untuk membuka kunci, diperlukan persetujuan khusus dan tercatat di Audit Trail.

---

## 22. Ringkasan Hak Akses per Peran

| Modul | Admin | PI | Investigator | CRA | CRC |
|-------|-------|----|--------------|-----|-----|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Subjects | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R | ✓ R/W |
| Consent | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R | ✓ R/W |
| Medical History | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R | ✓ R/W |
| Concomitant Meds | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R | ✓ R/W |
| Vital Signs | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R | ✓ R/W |
| Laboratory | ✓ R/W/Verify | ✓ R/W/Verify | ✓ R/W/Verify | ✓ R | ✓ R/W |
| Adverse Events | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R | ✓ R/W |
| Deviations | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R/W | ✓ R/W |
| SAE Reports | ✓ R/W/Sign | ✓ R/W/Sign | ✓ Sign | ✓ R/W | — |
| Queries | ✓ | ✓ Resolve | ✓ Resolve | ✓ Raise/Close | ✓ Resolve |
| Randomization | ✓ Penuh | ✓ | — | — | — |
| Amendments | ✓ R/W | ✓ R/W | — | ✓ R | — |
| Delegation | ✓ R/W | ✓ R/W/Sign | — | ✓ R | — |
| Monitoring | ✓ | ✓ Acknowledge | — | ✓ R/W | — |
| Data Status | ✓ | ✓ | — | ✓ | — |
| Audit Trail | ✓ | ✓ | — | ✓ | — |
| Database Lock | ✓ Sign Final | ✓ Sign Final | — | ✓ Initiate/Sign | — |
| Sites | ✓ Penuh | — | — | — | — |
| Studies | ✓ Penuh | — | — | — | — |
| Users | ✓ Penuh | — | — | — | — |

**R** = Read only | **W** = Write (tambah/edit) | **Sign** = Tanda tangan elektronik

---

## 23. Pertanyaan Umum (FAQ)

**Q: Saya tidak bisa mengisi data — tombol "Add" tidak muncul.**  
A: Periksa: (1) Apakah studi dan site sudah dipilih? (2) Apakah studi berstatus Terminated/Completed/Suspended? (3) Apakah Database Lock sudah aktif? Semua kondisi ini memblokir entri data.

**Q: Saya salah mengisi data dan sudah disimpan. Bagaimana cara memperbaiki?**  
A: Klik **Edit** pada record tersebut, perbaiki data, dan isi **Reason for Change** dengan penjelasan apa yang salah dan apa yang benar. Jangan menghapus record kecuali benar-benar diperlukan.

**Q: Query saya sudah dijawab tapi masih muncul sebagai "open".**  
A: Setelah Investigator/CRC menjawab, status berubah menjadi **Resolved** (bukan Closed). CRA yang berwenang harus menutup query tersebut dengan mengklik **Close Query**.

**Q: ICF Version yang saya butuhkan tidak ada di dropdown.**  
A: Versi ICF diambil dari amandemen protokol yang sudah berstatus **Approved** atau **Implemented**. Jika versi belum ada, Admin perlu membuat amandemen terlebih dahulu, atau pilih **"Kustom / Lainnya"** dan isi manual.

**Q: Saya mendapat notifikasi "Database is locked".**  
A: Database Lock sudah diaktifkan untuk studi ini. Tidak ada data yang dapat ditambah atau diubah. Hubungi CRA atau Admin jika ini merupakan kesalahan.

**Q: SAE Report saya tidak bisa di-submit.**  
A: Laporan SAE harus **ditandatangani terlebih dahulu** oleh Investigator atau PI sebelum dapat disubmit. Klik tombol **Sign** (ungu), masukkan password, dan pilih signing meaning.

**Q: Bagaimana cara melihat siapa yang mengubah data tertentu?**  
A: Buka menu **Audit Trail** dan gunakan filter Table dan Search untuk menemukan perubahan yang dimaksud. Setiap baris menampilkan nama user, waktu, dan nilai sebelum/sesudah perubahan.

**Q: Subjek saya muncul 0 di dropdown form consent.**  
A: Pastikan site aktif sudah dipilih (chip hijau di sidebar). Jika site sudah dipilih tetapi subjek tetap 0, sistem akan otomatis menampilkan semua subjek aktif dalam studi sebagai fallback.

---

*Dokumen ini dibuat sesuai kebutuhan sistem E-CRF versi saat ini. Untuk pertanyaan teknis, hubungi Administrator sistem.*
