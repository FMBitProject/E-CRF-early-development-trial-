# Syarat & Ketentuan Lisensi — E-CRF System

**Perjanjian Lisensi & Dukungan Perangkat Lunak (Software License & Support Agreement)**

> ⚠️ **CATATAN PENTING — DRAFT UNTUK DITINJAU HUKUM.**
> Dokumen ini adalah **template**, bukan nasihat hukum. Sebelum digunakan untuk
> mengikat pelanggan, **wajib ditinjau oleh penasihat hukum** yang kompeten di
> yurisdiksi Anda, terutama klausul batas tanggung jawab (§10), jaminan (§9),
> dan kepatuhan data (§8). Isi bagian bertanda `[…]` dengan data riil.

---

| | |
|---|---|
| Produk | E-CRF System (Electronic Case Report Form) — perangkat lunak on-premise |
| Pemberi Lisensi ("Vendor") | `[NAMA / BADAN HUKUM VENDOR]`, `[alamat]`, `[NPWP]` |
| Penerima Lisensi ("Pelanggan") | Institusi yang menandatangani Order Form / Purchase Order |
| Versi dokumen | 1.0 — `[tanggal]` |
| Hukum yang berlaku | Republik Indonesia |

---

## 1. Definisi

- **Perangkat Lunak** — aplikasi E-CRF System beserta kode, basis data skema,
  dokumentasi, dan pembaruan yang diberikan Vendor.
- **Instance** — satu pemasangan Perangkat Lunak pada satu lingkungan server
  milik/dikuasai Pelanggan.
- **License Key** — token yang ditandatangani secara kriptografis oleh Vendor
  yang mengaktifkan dan membatasi penggunaan Perangkat Lunak (masa berlaku,
  jumlah pengguna, jumlah site).
- **Data Pelanggan** — seluruh data yang dimasukkan, disimpan, atau dihasilkan
  Pelanggan melalui Perangkat Lunak, termasuk data subjek/pasien uji klinis,
  jejak audit, dan hasil ekspor.
- **Order Form** — dokumen pemesanan (PO/kontrak turunan) yang memuat tier,
  harga, masa berlaku, dan batasan lisensi yang disepakati.

## 2. Pemberian Lisensi

2.1 Vendor memberikan Pelanggan lisensi yang bersifat **non-eksklusif,
tidak dapat dialihkan (non-transferable), tidak dapat disublisensikan**, dan
**terbatas** untuk memasang serta menggunakan Perangkat Lunak pada Instance
di lingkungan Pelanggan, sesuai batasan pada Order Form dan License Key.

2.2 Lisensi berlaku untuk **satu institusi Pelanggan**. Penggunaan oleh entitas
afiliasi atau pihak ketiga memerlukan lisensi terpisah.

2.3 Lisensi bersifat **on-premise**: Perangkat Lunak berjalan sepenuhnya pada
server Pelanggan. Verifikasi License Key dilakukan **secara offline** dan tidak
mengirim data apa pun ke Vendor.

## 3. Batasan

Pelanggan **tidak diperkenankan**:

- (a) menyalin, mendistribusikan, menjual, menyewakan, atau mensublisensikan
  Perangkat Lunak kepada pihak ketiga;
- (b) melakukan reverse engineering, dekompilasi, atau membongkar Perangkat
  Lunak kecuali sepanjang diizinkan hukum yang berlaku secara memaksa;
- (c) menghapus/mengubah pemberitahuan hak cipta atau mekanisme lisensi;
- (d) memalsukan, memodifikasi, atau menghindari License Key;
- (e) menggunakan Perangkat Lunak melampaui batas (pengguna/site/masa berlaku)
  pada Order Form dan License Key.

## 4. Mekanisme & Penegakan Lisensi

4.1 Perangkat Lunak diaktifkan dengan License Key yang diterbitkan Vendor.

4.2 **Perilaku saat lisensi tidak aktif / kedaluwarsa** (dijamin oleh Vendor):
- Pembuatan **data baru** (enroll subjek baru, pembuatan studi/site baru)
  **dinonaktifkan**; dan
- **Membaca, mengekspor, mengedit data yang sudah ada, jejak audit, dan
  pelaporan keselamatan (adverse event/SAE) tetap berfungsi.**
- **Data Pelanggan tidak pernah dikunci, disandera, dienkripsi paksa, atau
  dihapus** oleh mekanisme lisensi.

4.3 Perpanjangan dilakukan dengan penerbitan License Key baru oleh Vendor
setelah pembayaran perpanjangan.

## 5. Biaya & Pembayaran

5.1 Biaya lisensi, setup, dan dukungan mengikuti Order Form.

5.2 Kecuali disepakati lain, lisensi berbasis **langganan tahunan**. Biaya
belum termasuk pajak yang berlaku (mis. PPN), yang menjadi tanggungan Pelanggan.

5.3 Keterlambatan pembayaran dapat menunda perpanjangan License Key, namun
tidak mengubah ketentuan §4.2 terhadap data yang sudah ada.

## 6. Dukungan, Pemeliharaan & Pembaruan

6.1 Lingkup dukungan (waktu respons, jam layanan, kanal) mengikuti tier pada
Order Form / lampiran SLA.

6.2 Pemeliharaan mencakup patch keamanan dan perbaikan bug pada versi yang
didukung. Fitur baru, kustomisasi, integrasi, dan migrasi khusus dapat
dikenakan biaya terpisah.

6.3 Instalasi pembaruan pada Instance adalah tanggung jawab Pelanggan (atau
layanan berbayar Vendor), mengikuti prosedur pada dokumentasi instalasi.

## 7. Validasi (21 CFR Part 11 / ICH GCP)

7.1 Vendor menyediakan **paket validasi** (URS, matriks ketertelusuran,
penilaian Part 11, protokol IQ/OQ/PQ) sebagai bagian dari Perangkat Lunak.

7.2 **Eksekusi dan penandatanganan IQ/OQ/PQ dilakukan pada lingkungan
Pelanggan** dan menjadi tanggung jawab Pelanggan (dapat dibantu Vendor sebagai
layanan berbayar). Validasi hanya sah bila dieksekusi pada Instance nyata milik
Pelanggan.

7.3 Kepatuhan prosedural (SOP, verifikasi identitas penanda tangan, pelatihan,
surat sertifikasi tanda tangan elektronik ke otoritas) adalah tanggung jawab
Pelanggan sebagai sponsor/institusi.

## 8. Kepemilikan Data & Kekayaan Intelektual

8.1 **Data Pelanggan sepenuhnya milik Pelanggan.** Seluruh data pasien/subjek
berada di server Pelanggan. Vendor **tidak memiliki akses** terhadap Data
Pelanggan dalam operasi on-premise normal.

8.2 Pelanggan bertindak sebagai **Pengendali Data Pribadi** atas data subjek
uji klinis menurut UU PDP No. 27/2022 dan wajib memenuhi kewajibannya
(dasar pemrosesan, persetujuan subjek/informed consent, hak subjek data,
keamanan, retensi). Lihat **Kebijakan Privasi** ([PRIVACY_POLICY.md](PRIVACY_POLICY.md)).

8.3 **Perangkat Lunak, kode, desain, dan dokumentasi tetap milik Vendor.**
Perjanjian ini memberikan lisensi penggunaan, bukan pengalihan hak milik.

8.4 Saat pengakhiran, Pelanggan tetap dapat mengakses dan mengekspor Data
Pelanggan dari Instance-nya (fitur ekspor ODM/CSV tersedia) sebelum
menonaktifkan Perangkat Lunak.

## 9. Jaminan & Penafian

9.1 Vendor menjamin Perangkat Lunak berfungsi secara material sesuai
dokumentasi pada saat penyerahan.

9.2 **PENAFIAN.** Kecuali dinyatakan tegas, Perangkat Lunak disediakan
**"sebagaimana adanya" (as-is)**. Vendor **tidak menjamin**:
- (a) bahwa Perangkat Lunak akan lolos audit regulator tertentu — kepatuhan
  bergantung pada konfigurasi, SOP, dan pelaksanaan validasi oleh Pelanggan;
- (b) kesesuaian untuk tujuan tertentu di luar yang didokumentasikan;
- (c) operasi tanpa gangguan atau bebas kesalahan pada infrastruktur Pelanggan.

9.3 **Perangkat Lunak adalah alat pengumpulan dan pengelolaan data uji klinis.
Perangkat Lunak BUKAN alat diagnostik dan tidak membuat keputusan klinis.**
Seluruh keputusan medis dan interpretasi data adalah tanggung jawab tenaga
profesional Pelanggan.

## 10. Batas Tanggung Jawab

> ⚠️ Klausul ini **wajib ditinjau pengacara** dan disesuaikan dengan Order Form.

10.1 Sepanjang diizinkan hukum, **total tanggung jawab Vendor** berdasarkan
Perjanjian ini dibatasi maksimal sebesar **biaya lisensi yang dibayarkan
Pelanggan dalam 12 bulan** sebelum peristiwa yang menimbulkan klaim.

10.2 Vendor **tidak bertanggung jawab** atas kerugian tidak langsung,
insidental, konsekuensial, kehilangan data akibat kelalaian pemeliharaan/backup
oleh Pelanggan, kehilangan keuntungan, atau **keputusan klinis maupun hasil
uji klinis** yang diambil berdasarkan penggunaan Perangkat Lunak.

10.3 Pelanggan bertanggung jawab atas backup, keamanan infrastruktur, kontrol
akses fisik/jaringan, akurasi jam server (NTP), dan pengelolaan akun pengguna
di lingkungannya.

## 11. Kerahasiaan

Masing-masing pihak menjaga kerahasiaan informasi non-publik pihak lain
(termasuk kode, harga, dan data operasional) dan hanya menggunakannya untuk
tujuan Perjanjian ini.

## 12. Jangka Waktu & Pengakhiran

12.1 Perjanjian berlaku selama masa lisensi pada Order Form dan diperpanjang
sesuai kesepakatan.

12.2 Salah satu pihak dapat mengakhiri jika pihak lain melakukan pelanggaran
material dan tidak memperbaikinya dalam `[30]` hari setelah pemberitahuan
tertulis.

12.3 Setelah pengakhiran: hak lisensi berhenti, Pelanggan menghentikan
penggunaan Perangkat Lunak, namun **tetap dapat mengekspor Data Pelanggan**
sesuai §8.4. Kewajiban retensi rekaman uji klinis tetap mengikat Pelanggan
sesuai regulasi.

## 13. Ketentuan Lain

13.1 **Hukum yang berlaku:** Republik Indonesia. Sengketa diselesaikan melalui
`[musyawarah / arbitrase BANI / pengadilan di ___]`.

13.2 **Force majeure:** tidak ada pihak yang bertanggung jawab atas kegagalan
akibat keadaan di luar kendali wajarnya.

13.3 **Keseluruhan perjanjian:** dokumen ini bersama Order Form, lampiran SLA,
dan Kebijakan Privasi merupakan keseluruhan kesepakatan para pihak.

13.4 **Perubahan** hanya sah bila tertulis dan ditandatangani kedua pihak.

---

**Persetujuan**

| Pihak | Nama | Jabatan | Tanda tangan | Tanggal |
|-------|------|---------|--------------|---------|
| Vendor | | | | |
| Pelanggan | | | | |
