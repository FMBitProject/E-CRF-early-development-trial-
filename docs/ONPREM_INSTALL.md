# Panduan Instalasi On-Premise — E-CRF System

Panduan ini untuk **administrator IT** yang memasang E-CRF System di server milik
institusi sendiri (rumah sakit / CRO / sponsor). Seluruh data tetap berada di
server Anda — tidak ada data yang keluar dari institusi.

Waktu pemasangan: ± 15–30 menit.

---

## 1. Kebutuhan sistem

| Komponen | Minimum |
|---|---|
| OS | Linux (Ubuntu 22.04+ / RHEL 8+) atau Windows Server dengan Docker |
| CPU / RAM | 2 vCPU / 4 GB RAM (disarankan 4 vCPU / 8 GB) |
| Disk | 20 GB kosong (bertambah sesuai jumlah data pasien) |
| Software | **Docker Engine 24+** dan **Docker Compose v2** |
| Jaringan | Port yang dipilih (default 3000) terbuka untuk pengguna internal |

Cek Docker sudah terpasang:

```bash
docker --version
docker compose version
```

Jika belum ada, ikuti panduan resmi: https://docs.docker.com/engine/install/

---

## 2. Ambil paket aplikasi

Salin folder aplikasi ke server (via git, USB, atau file transfer). Minimal file
yang harus ada di folder:

```
Dockerfile
docker-compose.yml
.env.onprem.example
package.json
src/ ...
```

Masuk ke folder tersebut:

```bash
cd E-CRF-early-development-trial-
```

---

## 3. Buat file konfigurasi (.env)

Salin template lalu isi nilainya:

```bash
cp .env.onprem.example .env
```

Buka `.env` dengan editor dan **wajib** isi tiga nilai berikut:

| Variabel | Isi dengan |
|---|---|
| `POSTGRES_PASSWORD` | Password database yang kuat. Buat: `openssl rand -base64 24` |
| `BETTER_AUTH_SECRET` | Kunci rahasia sesi (min. 32 karakter). Buat: `openssl rand -base64 48` |
| `ADMIN_EMAIL` | Email admin pertama Anda, mis. `admin@rs-anda.example` |

Opsional:

- `BETTER_AUTH_URL` — jika diakses lewat domain/HTTPS, isi URL asli
  (mis. `https://ecrf.rs-anda.example`). Untuk uji lokal biarkan `http://localhost:3000`.
- `APP_PORT` — ganti bila port 3000 sudah dipakai (mis. `8080`).
- Bagian `SMTP_*` — isi bila ingin notifikasi email aktif. Boleh dikosongkan
  (aplikasi tetap jalan, langkah email dilewati).

> **Penting:** File `.env` berisi rahasia. Simpan hanya di server, jangan
> di-commit ke git atau dibagikan.

---

## 4. Jalankan aplikasi

```bash
docker compose up -d
```

Perintah ini akan:
1. Menyiapkan database PostgreSQL (container `db`).
2. Membangun & menjalankan aplikasi (container `app`).
3. **Membuat seluruh tabel database secara otomatis** pada boot pertama
   (tidak perlu langkah migrasi manual).

Pantau proses:

```bash
docker compose logs -f app
```

Tunggu hingga muncul baris:

```
Base schema created (fresh database).
DB migrations applied.
Server running on ...
```

Cek kesehatan aplikasi:

```bash
curl http://localhost:3000/api/health
```

---

## 5. Buat akun administrator pertama

1. Buka aplikasi di browser: `http://SERVER-ANDA:3000` (atau URL/port Anda).
2. Masuk ke halaman **Register**.
3. Daftar menggunakan **email yang sama persis** dengan `ADMIN_EMAIL` di `.env`.
   Pada pilihan peran, pilih salah satu saja (mis. *Principal Investigator*) —
   karena email ini terdaftar sebagai `ADMIN_EMAIL`, sistem **otomatis**
   menetapkan Anda sebagai **administrator**. Buat password yang memenuhi
   kebijakan keamanan.
4. Setelah berhasil, login sebagai admin tersebut.

> Pendaftaran mandiri (self-registration) **dimatikan** demi keamanan. Hanya
> email `ADMIN_EMAIL` yang boleh mendaftar. Semua pengguna lain (PI, CRA, CRC,
> investigator, data manager) dibuat oleh admin dari dalam aplikasi
> (menu **User Management**).

---

## 6. Lisensi

Aplikasi memerlukan **license key** dari penyedia (vendor). Tanpa lisensi aktif,
pembuatan **data baru** (enroll subjek baru, membuat studi/site baru) **dinonaktifkan**
— tetapi membaca, mengekspor, mengedit data yang sudah ada, dan pelaporan
keselamatan (adverse event/SAE) **tetap berfungsi**. Data pasien tidak pernah terkunci.

Cara memasang lisensi:
1. Vendor mengirim Anda nilai `LICENSE_KEY` (teks panjang).
2. Tempel ke file `.env`:  `LICENSE_KEY=<nilai-dari-vendor>`
3. Terapkan:  `docker compose up -d`  (atau `docker compose restart app`).

Cek status lisensi kapan saja (sebagai admin, setelah login):

```bash
curl -s http://localhost:3000/api/license/status -H "Cookie: <sesi-admin>"
```

atau lihat log saat boot — akan tertulis `License: active for "<nama>" (expires ...)`.

Saat lisensi mendekati/melewati masa berlaku, hubungi vendor untuk perpanjangan;
Anda hanya perlu mengganti `LICENSE_KEY` dengan yang baru lalu restart.

---

## 7. Operasional harian

**Menghentikan aplikasi** (data tetap aman di volume):
```bash
docker compose down
```

**Menjalankan lagi:**
```bash
docker compose up -d
```

**Melihat log:**
```bash
docker compose logs -f app
```

**Update ke versi baru** (setelah menyalin kode baru ke folder):
```bash
docker compose build app
docker compose up -d
```
Migrasi database berjalan otomatis saat boot — data lama tidak dihapus.

---

## 8. Backup & restore database

Data pasien tersimpan di volume Docker `ecrf_pgdata`. **Backup rutin wajib.**

**Backup (dump ke file):**
```bash
docker compose exec db pg_dump -U ecrf ecrf > backup-$(date +%F).sql
```

**Restore (ke database kosong):**
```bash
cat backup-YYYY-MM-DD.sql | docker compose exec -T db psql -U ecrf -d ecrf
```

Simpan file backup di lokasi terpisah dari server (kepatuhan retensi data uji
klinis). Jadwalkan lewat cron, mis. harian.

---

## 9. Keamanan yang disarankan (produksi)

- Letakkan aplikasi di belakang **reverse proxy dengan HTTPS** (Nginx/Caddy/Traefik)
  dan set `BETTER_AUTH_URL` ke URL HTTPS.
- Batasi akses port aplikasi hanya untuk jaringan internal / VPN institusi.
- Rotasi `BETTER_AUTH_SECRET` dan password database sesuai kebijakan keamanan Anda.
- Aktifkan backup otomatis + uji restore secara berkala.
- Pastikan jam server (NTP) akurat — jejak audit (audit trail) bergantung pada waktu.

---

## 10. Pemecahan masalah

| Gejala | Penyebab & solusi |
|---|---|
| `POSTGRES_PASSWORD ... variable is not set` | `.env` belum dibuat/terisi. Ulangi langkah 3. |
| App restart terus | Cek `docker compose logs app`. Biasanya `DATABASE_URL`/secret salah. |
| Tidak bisa daftar admin | Email yang didaftarkan harus sama persis dengan `ADMIN_EMAIL`, dan peran = admin. |
| Port bentrok | Ubah `APP_PORT` di `.env`, lalu `docker compose up -d` lagi. |
| Lupa apakah data aman | Volume `ecrf_pgdata` bertahan selama tidak menjalankan `docker compose down -v`. **Jangan** pakai flag `-v` kecuali ingin menghapus semua data. |

---

Untuk pertanyaan atau dukungan, hubungi penyedia lisensi E-CRF System Anda.
