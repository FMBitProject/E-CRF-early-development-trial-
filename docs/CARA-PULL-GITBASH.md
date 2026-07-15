# Cara Pull dari GitHub lewat Git Bash

Panduan singkat untuk menarik (pull) perubahan terbaru dari GitHub ke folder
proyek di komputer Windows kamu, menggunakan Git Bash.

---

## Konsep singkat

- **`push`** = mengirim commit dari komputer kamu **ke** GitHub.
- **`pull`** = menarik commit terbaru **dari** GitHub ke komputer kamu.
- GitHub (remote `origin`) adalah "pusat"-nya. Folder di komputer kamu hanyalah
  salah satu salinan.

> ⚠️ File yang masuk `.gitignore` (misalnya `TEST_ACCOUNTS.md` dan `.env`)
> **tidak ikut** ke GitHub, jadi **tidak akan** ikut ter-pull. File seperti itu
> harus dibuat manual di tiap komputer.

---

## Langkah pull (kondisi normal)

Buka **Git Bash**, lalu ketik baris per baris:

```bash
# 1. Masuk ke folder proyek
cd ~/E-CRF-early-development-trial-

# 2. Pastikan berada di branch main
git checkout main

# 3. Tarik perubahan terbaru dari GitHub
git pull origin main
```

Kalau berhasil, kamu akan lihat tulisan seperti `Fast-forward` dan daftar file
yang berubah. Itu tandanya sukses.

Kalau tidak ada perubahan baru, muncul: `Already up to date.` — itu juga normal
(berarti kamu sudah punya versi terbaru).

---

## Kalau muncul error

### A. "Your local changes would be overwritten by merge"

Artinya ada perubahan di folder kamu yang belum disimpan (commit). Pilih salah satu:

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

Kalau diminta username/password atau token, gunakan **Personal Access Token**
GitHub sebagai pengganti password (bukan password akun biasa).

---

## Cek status kapan saja

```bash
git status          # lihat kondisi folder (branch, file berubah)
git log --oneline -5 # lihat 5 commit terakhir
```

---

## Alur kerja harian yang disarankan

1. **Sebelum mulai kerja:** `git pull origin main` (biar dapat versi terbaru).
2. **Setelah selesai mengubah kode:**
   ```bash
   git add .
   git commit -m "pesan perubahan"
   git push origin main
   ```

Dengan begitu folder Windows, GitHub, dan komputer lain selalu sinkron.
