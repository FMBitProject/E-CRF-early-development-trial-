# Perjanjian Tingkat Layanan (SLA) — E-CRF System

> ⚠️ **DRAFT TEMPLATE — TINJAU HUKUM & SESUAIKAN KAPASITAS DUKUNGAN ANDA.**
> Lampiran ini merupakan bagian dari **[Syarat & Ketentuan Lisensi](TERMS_AND_CONDITIONS.md)**
> dan tier yang berlaku ditentukan di **[Order Form](ORDER_FORM_TEMPLATE.md) §4**.
> Waktu di bawah ilustratif — **jangan menjanjikan yang tidak bisa Anda penuhi.**

| | |
|---|---|
| Versi | 1.0 — `[tanggal]` |
| Berlaku untuk | E-CRF System on-premise |
| Zona waktu acuan | WIB (UTC+7) |

---

## 1. Lingkup

**Termasuk dukungan:**
- Pemasangan awal & bantuan konfigurasi (`.env`, Docker, reverse proxy).
- Penerbitan & perpanjangan License Key.
- Perbaikan bug pada Perangkat Lunak versi yang didukung.
- Patch keamanan.
- Bantuan eksekusi paket validasi (IQ/OQ/PQ) sesuai lingkup Order Form.
- Panduan penggunaan fitur.

**Di luar lingkup** (tanggung jawab Pelanggan / layanan berbayar terpisah):
- Infrastruktur server, jaringan, HTTPS, backup/restore, kontrol akses fisik,
  akurasi jam server (NTP) — lihat T&C §10.3 & panduan operasi.
- Pemulihan data akibat kelalaian backup Pelanggan.
- Fitur baru, kustomisasi, integrasi, migrasi khusus.
- Pelatihan pengguna di luar yang disepakati.
- Masalah akibat modifikasi kode oleh Pelanggan.

## 2. Tier & jam layanan

| Tier | Kanal | Jam layanan |
|---|---|---|
| **Basic** | Email / tiket | Hari kerja `[Sen–Jum]`, `[09:00–17:00]` WIB |
| **Business** | Email / tiket + telepon | Hari kerja `[08:00–18:00]` WIB, prioritas antrean |
| **Premium** | Email / telepon + narahubung khusus | `[diperpanjang / on-call sesuai kesepakatan]` |

> Di luar jam layanan, tiket diterima tetapi jam SLA berjalan pada jam layanan
> berikutnya (kecuali Premium bila disepakati on-call untuk Critical).

## 3. Tingkat keparahan (severity)

| Level | Definisi |
|---|---|
| **Critical (S1)** | Sistem tidak dapat diakses seluruh pengguna, atau kehilangan/kerusakan integritas data; tidak ada workaround. Uji klinis terhenti. |
| **Major (S2)** | Fungsi penting terganggu (mis. tidak bisa enroll/e-sign/ekspor) namun sebagian sistem tetap jalan atau ada workaround. |
| **Minor (S3)** | Masalah kecil, kosmetik, atau pertanyaan penggunaan; dampak operasional rendah. |

## 4. Target waktu respons & resolusi

Waktu **respons** = konfirmasi pertama & mulai penanganan. Waktu **resolusi
target** = perbaikan atau workaround yang dapat diterima (bukan jaminan mutlak;
upaya terbaik dalam jam layanan tier terkait).

| Severity | Basic — Respons / Resolusi | Business | Premium |
|---|---|---|---|
| **S1 Critical** | `[8 jam]` / `[2 hari kerja]` | `[4 jam]` / `[1 hari kerja]` | `[1 jam]` / `[secepatnya, upaya berkelanjutan]` |
| **S2 Major** | `[1 hari kerja]` / `[5 hari kerja]` | `[8 jam]` / `[3 hari kerja]` | `[4 jam]` / `[2 hari kerja]` |
| **S3 Minor** | `[2 hari kerja]` / `[best effort]` | `[1 hari kerja]` / `[best effort]` | `[1 hari kerja]` / `[best effort]` |

## 5. Pemeliharaan & pembaruan

- Patch keamanan dirilis sesuai kebutuhan; Vendor memberi tahu Pelanggan.
- Instalasi pembaruan pada Instance dilakukan Pelanggan (atau layanan Vendor),
  dengan jadwal yang disepakati untuk meminimalkan gangguan.
- Migrasi database berjalan otomatis saat boot; Pelanggan wajib backup sebelum
  update (panduan operasi).

## 6. Eskalasi

| Tahap | Kontak |
|---|---|
| 1 — Dukungan L1 | `[email/tiket]` |
| 2 — Eskalasi teknis | `[nama / kanal]` |
| 3 — Manajemen Vendor | `[nama / kanal]` |

## 7. Pelaporan & pengukuran

- Vendor mencatat tiket beserta waktu respons/resolusi.
- Atas permintaan, ringkasan kinerja SLA diberikan tiap `[kuartal]`.
- Perselisihan penghitungan SLA diselesaikan sesuai T&C §13.1.

## 8. Pengecualian SLA

Jam SLA tidak berjalan selama: force majeure (T&C §13.2); gangguan pada
infrastruktur/jaringan Pelanggan; keterlambatan akibat menunggu informasi/akses
dari Pelanggan; atau penggunaan di luar konfigurasi yang didukung.

---

| Pihak | Nama | Tanda tangan | Tanggal |
|---|---|---|---|
| Vendor | | | |
| Pelanggan | | | |
