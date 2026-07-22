# Order Form (Formulir Pemesanan) — E-CRF System

> ⚠️ **DRAFT TEMPLATE — TINJAU HUKUM SEBELUM DIGUNAKAN.** Order Form ini tunduk
> pada dan merupakan bagian tak terpisahkan dari **[Syarat & Ketentuan Lisensi](TERMS_AND_CONDITIONS.md)**
> ("T&C"). Bila ada pertentangan, T&C yang berlaku kecuali dinyatakan lain di
> sini. Isi bagian `[…]`. Angka harga bersifat **ilustratif** — sesuaikan.

| | |
|---|---|
| Nomor Order Form | `[OF-YYYY-NNN]` |
| Tanggal | `[tanggal]` |
| Merujuk T&C versi | 1.0 |
| Vendor | `[NAMA / BADAN HUKUM VENDOR]` |
| Pelanggan | `[NAMA INSTITUSI]`, `[alamat]`, `[NPWP]` |
| Narahubung Pelanggan | `[nama]` — `[email]` — `[telepon]` |
| Email admin bootstrap (`ADMIN_EMAIL`) | `[admin@institusi.example]` |

---

## 1. Produk & tier lisensi

| | Pilih (✓) | Batas lisensi | Keterangan |
|---|:---:|---|---|
| **Pilot** | ☐ | 1 studi · ≤2 site · ≤10 user | RS single-center / pilot study |
| **Standard** | ☐ | ≤3 studi · ≤5 site · ≤30 user | RS/CRO multi-site kecil |
| **Sponsor** | ☐ | `[__]` studi · `[__]` site · `[__]` user | Pharma low–mid trial |

Batas di atas ditegakkan oleh **License Key** yang diterbitkan Vendor
(`--max-users`, `--max-sites`, `--expires`).

## 2. Parameter lisensi yang disepakati

| Parameter | Nilai |
|---|---|
| Model | ☐ Langganan tahunan  ☐ Per-study  ☐ Perpetual + maintenance |
| Masa berlaku (term) | `[mulai]` s/d `[berakhir]` |
| Maks. pengguna (`max-users`) | `[__]` |
| Maks. site (`max-sites`) | `[__]` |
| Penegakan lisensi (`LICENSE_ENFORCEMENT`) | ☑ true (default on-prem) |
| Lingkungan | On-premise di server Pelanggan |

> Saat lisensi tidak aktif/kedaluwarsa: pembuatan **data baru** dinonaktifkan;
> **baca, ekspor, edit data lama, dan pelaporan keselamatan tetap jalan**;
> data pasien **tidak pernah dikunci** (T&C §4.2).

## 3. Biaya

| Komponen | Jumlah (Rp) | Catatan |
|---|---:|---|
| Lisensi (per tahun) | `[__]` | Sesuai tier §1 |
| Setup & validasi (sekali) | `[__]` | Instalasi + dukungan eksekusi IQ/OQ/PQ (T&C §7) |
| Support tier (per tahun) | `[__]` | Sesuai [SLA](SLA.md) §2 — pilih tier |
| Kustomisasi / integrasi (opsional) | `[__]` | Bila ada; lampirkan lingkup |
| **Subtotal** | `[__]` | |
| PPN `[11]%` | `[__]` | Ditanggung Pelanggan |
| **Total** | **`[__]`** | |

**Termin pembayaran:** `[mis. 100% di muka / 50% saat PO, 50% saat go-live]`.
Mata uang: IDR. Jatuh tempo faktur: `[__]` hari.

## 4. Tier dukungan (SLA)

| Tier | Pilih (✓) | Jam layanan | Ringkas |
|---|:---:|---|---|
| **Basic** | ☐ | Email, jam kerja | Respons standar |
| **Business** | ☐ | Jam kerja + prioritas | Respons lebih cepat |
| **Premium** | ☐ | Diperpanjang / on-call | Respons tercepat |

Detail waktu respons & resolusi per tingkat keparahan ada di **[SLA.md](SLA.md)**.

## 5. Penyerahan (deliverables)

- Paket aplikasi on-prem (Docker) + panduan instalasi.
- License Key sesuai §2.
- Paket validasi (URS, matriks ketertelusuran, penilaian Part 11, protokol
  IQ/OQ/PQ) — eksekusi & sign-off di lingkungan Pelanggan (T&C §7).
- Dokumen legal: T&C, Kebijakan Privasi, `[DPA bila diminta]`.

## 6. Ketentuan khusus

`[Tuliskan kesepakatan spesifik: escrow kode, on-site training, SLA khusus,
jadwal go-live, dsb. Bila kosong, tidak ada ketentuan khusus.]`

## 7. Persetujuan

Dengan menandatangani, para pihak menyetujui Order Form ini beserta T&C yang
dirujuk.

| Pihak | Nama | Jabatan | Tanda tangan | Tanggal |
|---|---|---|---|---|
| Vendor | | | | |
| Pelanggan | | | | |
