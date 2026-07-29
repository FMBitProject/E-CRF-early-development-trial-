# Cara Update E-CRF di Laptop (Git Bash + Docker)

Panduan lengkap untuk menarik perubahan terbaru dari GitHub ke folder proyek di
laptop Windows, lalu menjalankannya di Docker.

Urutannya selalu **tiga tahap**, jangan dibalik:

```
1. FILE      siapkan file yang tidak ikut Git (.env)
2. PULL      tarik kode terbaru dari GitHub
3. DOCKER    build ulang container + refresh browser
```

Folder proyek di laptop: `C:\Users\DPI-Farel\E-CRF-early-development-trial-`
Di Git Bash ditulis: `~/E-CRF-early-development-trial-`

---

## Konsep singkat

- **`push`** = mengirim commit dari laptop **ke** GitHub.
- **`pull`** = menarik commit terbaru **dari** GitHub ke laptop.
- GitHub (remote `origin`) adalah pusatnya. Folder di laptop hanya salah satu
  salinan.
- Docker menjalankan kode yang ada di folder laptop — jadi kalau belum `pull`,
  Docker akan membangun ulang kode yang lama.

---

# Tahap 1 — File

File yang masuk `.gitignore` **tidak ikut** ke GitHub, jadi **tidak akan**
ter-pull. File ini harus ada dan dibuat manual di tiap komputer.

## 1.1 Buka Git Bash di folder proyek

Klik kanan di dalam folder `E-CRF-early-development-trial-` →
**"Open Git Bash here"**. Kalau menunya tidak ada, buka Git Bash biasa lalu:

```bash
cd ~/E-CRF-early-development-trial-
```

## 1.2 Pastikan `.env` ada

```bash
ls -la .env
```

- Kalau muncul nama filenya → aman, **lanjut ke Tahap 2**.
- Kalau muncul `No such file or directory` → buat dulu dari contoh:

```bash
cp .env.example .env
```

Lalu buka `.env` dengan Notepad:

```bash
notepad .env
```

Isi minimal **dua** variabel ini — keduanya kosong di file contoh dan Docker
menolak jalan kalau dibiarkan kosong:

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `POSTGRES_PASSWORD` | ✅ | Password database. Bebas, tapi **jangan kosong**. |
| `BETTER_AUTH_SECRET` | ✅ | Kunci acak panjang, ganti nilai contohnya. |
| `ADMIN_EMAIL` | disarankan | Email yang boleh mendaftar sebagai admin pertama. |
| `APP_PORT` | opsional | Default `3000`. Ubah kalau port itu sudah dipakai. |

Untuk membuat `BETTER_AUTH_SECRET` yang acak, jalankan di Git Bash lalu salin
hasilnya ke `.env`:

```bash
openssl rand -base64 48
```

> Baris `DATABASE_URL` di `.env` **diabaikan** kalau pakai Docker — Compose
> menyusunnya sendiri dari `POSTGRES_*`. Baris itu hanya dipakai kalau kamu
> menjalankan `npm start` langsung tanpa Docker.

> ⚠️ **Jangan pernah `git add .env`.** File ini berisi password dan sudah
> masuk `.gitignore` — biarkan begitu.

File lain yang juga tidak ikut Git: `TEST_ACCOUNTS.md`, folder `node_modules/`.

---

# Tahap 2 — Pull dari GitHub

## 2.1 Cek kondisi folder dulu

```bash
git status
```

Perhatikan dua hal:

- **Baris pertama** = kamu sedang di branch apa.
- **Ada daftar file merah?** = ada perubahan lokal yang belum di-commit.
  Kalau ada dan tidak penting, lihat [bagian error A](#a-your-local-changes-would-be-overwritten-by-merge).

## 2.2 Tarik perubahan terbaru

```bash
git checkout main
git pull origin main
```

Hasil yang normal:

| Muncul tulisan | Artinya |
|----------------|---------|
| `Fast-forward` + daftar file | ✅ Berhasil, ada update baru |
| `Already up to date.` | ✅ Berhasil, memang belum ada update |
| `error:` / `CONFLICT` | ❌ Lihat [Kalau muncul error](#kalau-muncul-error) di bawah |

## 2.3 Pastikan sudah dapat commit terbaru

```bash
git log --oneline -5
```

Cocokkan commit paling atas dengan yang ada di halaman GitHub. Kalau sama,
**lanjut ke Tahap 3**.

---

# Tahap 3 — Docker

## 3.1 Build ulang dan jalankan

```bash
docker compose up -d --build
```

Penjelasan flag:

- `--build` = **wajib** kalau ada perubahan kode. Tanpa ini, Docker memakai
  image lama dan perubahan kamu tidak akan terlihat.
- `-d` = jalan di background, terminal bisa ditutup.

Proses build pertama kali bisa 2–5 menit. Yang berikutnya lebih cepat.

## 3.2 Cek container sudah jalan

```bash
docker compose ps
```

Harus muncul dua service dengan status `Up`:

| Service | Fungsi |
|---------|--------|
| `db` | PostgreSQL — database |
| `app` | Aplikasi E-CRF |

Kalau `app` statusnya `Restarting` atau `Exited`, lihat lognya:

```bash
docker compose logs app --tail 50
```

## 3.3 Migrasi database

**Tidak perlu dijalankan manual.** Aplikasi menjalankan migrasi otomatis saat
container start (`src/backend/server.js`). Kalau ada tabel baru dari commit
yang baru di-pull, tabel itu akan dibuat sendiri.

Untuk memastikan migrasi sudah beres:

```bash
docker compose logs app --tail 30
```

## 3.4 Cek aplikasi hidup

```bash
curl http://localhost:3000/api/health
```

Harus keluar: `{"status":"ok"}`

## 3.5 Hard-refresh browser

Ini **sering terlewat**. Browser menyimpan file JavaScript lama di cache, jadi
walaupun server sudah update, tampilannya masih versi lama.

Buka `http://localhost:3000` lalu tekan:

```
Ctrl + Shift + R
```

Kalau masih terlihat lama, buka DevTools (`F12`) → tab **Network** → centang
**Disable cache** → refresh lagi.

---

## Ringkasan — satu blok copy-paste

Untuk update rutin ketika `.env` sudah ada:

```bash
cd ~/E-CRF-early-development-trial-
git checkout main
git pull origin main
docker compose up -d --build
docker compose ps
curl http://localhost:3000/api/health
```

Lalu hard-refresh browser (`Ctrl + Shift + R`).

---

## Kalau muncul error

### A. "Your local changes would be overwritten by merge"

Ada perubahan di folder kamu yang belum di-commit. Pilih salah satu:

- **Simpan sementara lalu pull:**
  ```bash
  git stash
  git pull origin main
  git stash pop      # kembalikan perubahanmu (kalau masih diperlukan)
  ```
- **Buang perubahan lokal** (HATI-HATI, tidak bisa dikembalikan):
  ```bash
  git checkout -- .
  git pull origin main
  ```

### B. "You have divergent branches"

Branch lokal dan GitHub sama-sama punya commit yang berbeda. Cara paling aman:

```bash
git pull origin main --no-rebase
```

Kalau muncul editor teks (layar penuh tulisan) untuk pesan merge, cukup ketik
`:wq` lalu Enter untuk menyimpan dan keluar.

### C. Diminta login GitHub

Gunakan **Personal Access Token** GitHub sebagai pengganti password (bukan
password akun biasa).

### D. `docker: command not found`

Docker Desktop belum jalan. Buka Docker Desktop dari Start Menu, tunggu sampai
ikon whale-nya diam (tidak animasi), baru ulangi perintahnya.

### E. `set POSTGRES_PASSWORD in .env` atau `set BETTER_AUTH_SECRET in .env`

File `.env` belum ada atau variabelnya kosong. Kembali ke [Tahap 1](#tahap-1--file).

### F. Port 3000 sudah dipakai

```
Error: bind: address already in use
```

Ada aplikasi lain di port 3000. Ubah `APP_PORT` di `.env`, misal jadi `3001`,
lalu jalankan ulang `docker compose up -d --build` dan buka
`http://localhost:3001`.

### G. Sudah pull + build tapi perubahan tidak terlihat

Urut dari yang paling sering:

1. Lupa hard-refresh browser → `Ctrl + Shift + R`
2. Lupa `--build` → ulangi `docker compose up -d --build`
3. Commit-nya belum masuk `main` di GitHub → cek `git log --oneline -5` dan
   bandingkan dengan GitHub
4. Container lama masih nyangkut:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

> `docker compose down` **tidak** menghapus data. Data ada di volume
> `ecrf_pgdata` dan tetap aman. Yang menghapus data adalah
> `docker compose down -v` — **jangan** pakai `-v` kecuali memang mau
> mengosongkan database.

---

## Cek status kapan saja

```bash
git status             # kondisi folder (branch, file berubah)
git log --oneline -5   # 5 commit terakhir
docker compose ps      # container yang jalan
docker compose logs app --tail 50   # log aplikasi
```

---

## Alur kerja harian yang disarankan

1. **Sebelum mulai kerja:** `git pull origin main`
2. **Setelah selesai mengubah kode:**
   ```bash
   npm test              # pastikan tidak ada yang rusak
   git add .
   git commit -m "pesan perubahan"
   git push origin main
   ```
3. **Untuk melihat hasilnya di aplikasi:** `docker compose up -d --build` +
   hard-refresh.

Dengan begitu folder Windows, GitHub, dan Docker selalu sinkron.
