# Kebijakan Privasi — E-CRF System

> ⚠️ **CATATAN PENTING — DRAFT UNTUK DITINJAU HUKUM.**
> Template ini **bukan nasihat hukum**. Tinjau bersama penasihat hukum &
> pejabat pelindungan data sebelum dipublikasikan. Isi bagian `[…]` dengan
> data riil. Basis regulasi: **UU No. 27 Tahun 2022 tentang Pelindungan Data
> Pribadi (UU PDP)**; selaras dengan praktik ICH GCP dan FDA 21 CFR Part 11.

| | |
|---|---|
| Berlaku untuk | E-CRF System — perangkat lunak on-premise |
| Penyedia ("Vendor") | `[NAMA / BADAN HUKUM VENDOR]`, `[alamat]` |
| Kontak privasi | `[email/telepon narahubung]` |
| Versi | 1.0 — `[tanggal]` |

---

## 1. Prinsip utama: arsitektur on-premise

E-CRF System dipasang dan dijalankan **sepenuhnya di server milik atau dikuasai
Pelanggan** (rumah sakit / sponsor / CRO). Oleh karena itu:

- **Data subjek/pasien uji klinis tidak pernah mengalir ke Vendor.** Data
  tersebut disimpan di infrastruktur Pelanggan.
- **Verifikasi lisensi bersifat offline** — Perangkat Lunak tidak "menelepon
  pulang" (no phone-home) dan tidak mengirim data operasional ke Vendor.
- Dalam operasi normal, **Vendor tidak memiliki akses** terhadap data pribadi
  yang diproses Pelanggan melalui Perangkat Lunak.

Kebijakan ini menjelaskan (A) peran masing-masing pihak atas data pribadi, dan
(B) data terbatas yang **Vendor** kumpulkan dalam relasi bisnis & dukungan.

## 2. Peran & tanggung jawab (UU PDP)

| Peran (UU PDP) | Pihak | Cakupan |
|----------------|-------|---------|
| **Pengendali Data Pribadi** atas data subjek/pasien | **Pelanggan** | Menentukan tujuan & cara pemrosesan data uji klinis; memenuhi kewajiban dasar pemrosesan, informed consent, hak subjek data, keamanan, dan retensi. |
| **Prosesor / Vendor teknologi** | **Vendor** | Menyediakan Perangkat Lunak. Tidak memproses data subjek atas nama Pelanggan dalam operasi on-premise. Bila memberi dukungan yang menyentuh data pribadi, bertindak atas instruksi Pelanggan (lihat §5). |

Karena Pelanggan adalah Pengendali, **kewajiban terhadap subjek data uji klinis
(pemberitahuan, persetujuan, pemenuhan hak) berada pada Pelanggan.**

## 3. Data pribadi yang diproses **di dalam** Perangkat Lunak (oleh Pelanggan)

Untuk transparansi, jenis data yang lazim disimpan Pelanggan di sistem meliputi:

- Identitas subjek/pasien terkode (subject ID, inisial, demografi terbatas),
- Data klinis: kunjungan, formulir CRF, adverse event/SAE, deviasi,
  persetujuan (informed consent), randomisasi, laboratorium,
- Data akun pengguna Pelanggan (nama, email, peran) dan **jejak audit**
  (siapa mengubah apa, kapan, alasan) sesuai Part 11.

Vendor **tidak** mengumpulkan, mengakses, atau mengendalikan data ini. Dasar
pemrosesan, minimalisasi, dan retensinya diatur oleh Pelanggan.

## 4. Data yang **Vendor** kumpulkan (relasi bisnis)

Vendor hanya memproses data pribadi terbatas untuk menjalankan hubungan
komersial dan dukungan:

| Kategori | Contoh | Tujuan | Dasar pemrosesan |
|----------|--------|--------|------------------|
| Kontak bisnis | Nama, email, telepon, jabatan narahubung Pelanggan | Kontrak, penerbitan lisensi, komunikasi | Pelaksanaan kontrak / kepentingan sah |
| Administrasi lisensi | Nama institusi, batas lisensi, masa berlaku | Menerbitkan & mengelola License Key | Pelaksanaan kontrak |
| Dukungan | Isi tiket, korespondensi, log yang **secara sukarela** dikirim Pelanggan | Menyelesaikan masalah teknis | Kepentingan sah / instruksi Pelanggan |
| Penagihan | Data faktur/pajak institusi | Administrasi keuangan & kepatuhan pajak | Kewajiban hukum |

## 5. Data dukungan yang mungkin memuat data pribadi

Jika Pelanggan **memilih** mengirim log, dump basis data, atau tangkapan layar
saat meminta dukungan, materi tersebut dapat memuat data pribadi.

- Vendor menyarankan Pelanggan **menganonimkan/menyamarkan** data terlebih
  dahulu dan mengirim hanya yang diperlukan (minimalisasi data).
- Materi dukungan diproses **hanya atas instruksi Pelanggan**, untuk tujuan
  penyelesaian masalah, dan dihapus setelah tidak diperlukan sesuai §7.
- Ketentuan pemrosesan yang lebih rinci dapat dituangkan dalam **Perjanjian
  Pemrosesan Data (DPA)** terpisah jika Pelanggan memintanya.

## 6. Pembagian data ke pihak ketiga

Vendor **tidak menjual** data pribadi. Vendor dapat menggunakan penyedia layanan
(mis. email, penyimpanan, akuntansi) hanya sebatas untuk tujuan di §4, dengan
kewajiban kerahasiaan. **Data subjek uji klinis tidak dibagikan** karena tidak
berada pada Vendor.

## 7. Retensi

- **Data Pelanggan di Perangkat Lunak:** ditentukan dan disimpan oleh Pelanggan
  sesuai kewajiban retensi rekaman uji klinis (regulasi & protokol).
- **Data relasi bisnis Vendor:** disimpan selama hubungan berlangsung dan
  jangka waktu yang diwajibkan hukum (mis. dokumen pajak), lalu dihapus/anonim.
- **Materi dukungan:** dihapus setelah masalah selesai, kecuali diminta lain
  oleh Pelanggan.

## 8. Keamanan

- **Perangkat Lunak** menyediakan kontrol keamanan bawaan: autentikasi,
  kontrol akses berbasis peran (RBAC), pembatasan cakupan studi/site, jejak
  audit yang tidak dapat diubah, dan tanda tangan elektronik.
- **Keamanan infrastruktur** (server, jaringan, HTTPS/reverse proxy, backup,
  kontrol akses fisik, akurasi waktu) adalah **tanggung jawab Pelanggan**,
  sesuai panduan pada dokumentasi instalasi & operasi.
- **Vendor** menerapkan langkah keamanan wajar atas data relasi bisnis di §4.

## 9. Hak subjek data

Karena Pelanggan adalah Pengendali data subjek, permintaan subjek data uji
klinis (akses, koreksi, penghapusan, dsb.) **ditujukan dan dipenuhi oleh
Pelanggan** sesuai UU PDP dan protokol studi.

Untuk data relasi bisnis yang diproses **Vendor** (§4), individu terkait dapat
menghubungi narahubung privasi Vendor untuk menggunakan haknya.

## 10. Transfer lintas negara

Dalam model on-premise, data subjek tidak ditransfer ke Vendor sehingga tidak
ada transfer lintas negara oleh Vendor. Jika Pelanggan menghosting Instance di
luar negeri, kepatuhan transfer menjadi tanggung jawab Pelanggan.

## 11. Perubahan kebijakan

Vendor dapat memperbarui kebijakan ini. Versi terbaru diberi nomor & tanggal.
Perubahan material diberitahukan kepada Pelanggan.

## 12. Kontak

Pertanyaan terkait kebijakan ini atau data relasi bisnis:
**`[nama narahubung]` — `[email]` — `[telepon]`**

---

*Dokumen terkait: [TERMS_AND_CONDITIONS.md](TERMS_AND_CONDITIONS.md) · Penilaian
Part 11: [../validation/PART11_ASSESSMENT.md](../validation/PART11_ASSESSMENT.md)*
