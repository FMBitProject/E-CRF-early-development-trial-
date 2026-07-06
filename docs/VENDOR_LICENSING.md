# Menerbitkan Lisensi On-Premise (INTERNAL / VENDOR)

Dokumen ini **untuk Anda sebagai vendor** — jangan diberikan ke pelanggan.
Menjelaskan cara membuat license key yang akan diverifikasi aplikasi pelanggan.

## Cara kerja (ringkas)

- Lisensi = dokumen JSON kecil yang **ditandatangani** dengan **private key Ed25519** milik Anda.
- Aplikasi hanya membawa **public key** (tertanam di `src/backend/lib/license.js`),
  jadi pelanggan bisa memverifikasi tapi **tidak bisa memalsukan/mengubah** lisensi.
- Verifikasi **offline sepenuhnya** — tidak ada koneksi ke server Anda (aman untuk on-prem).
- Penegakan (saat `LICENSE_ENFORCEMENT=true`): lisensi tidak aktif → pembuatan data
  baru (enroll subjek, studi, site) diblokir; baca/ekspor/edit/pelaporan keselamatan tetap jalan.

## Kunci (keys)

Pasangan kunci ada di `license-keys/` (folder ini **gitignored**):

| File | Sifat | Catatan |
|---|---|---|
| `license-keys/private.pem` | **RAHASIA** | Hanya di mesin Anda. **Jangan** commit / kirim ke siapa pun. Backup di tempat aman (mis. password manager). |
| `license-keys/public.pem` | publik | Sudah tertanam di `src/backend/lib/license.js`. |

> **Penting:** Jika `private.pem` hilang, Anda tidak bisa menerbitkan lisensi baru
> yang cocok dengan aplikasi yang sudah beredar. **Backup sekarang.**

## Menerbitkan lisensi

```bash
node scripts/sign-license.mjs \
  --customer "RS Contoh" \
  --expires 2027-12-31 \
  --max-users 50 \        # opsional
  --max-sites 10 \        # opsional
  --out rs-contoh.license.json   # opsional (file); default hanya cetak ke layar
```

Skrip mencetak nilai **`LICENSE_KEY`** (teks base64 panjang). Kirim nilai itu ke
pelanggan — mereka menaruhnya di `.env` (`LICENSE_KEY=...`) lalu restart aplikasi.

## Memperpanjang / mengganti

Terbitkan lisensi baru dengan tanggal `--expires` yang lebih jauh, kirim
`LICENSE_KEY` baru. Pelanggan cukup mengganti nilai lama dan `docker compose restart app`.

## Rotasi kunci (jika private key bocor)

1. Buat pasangan kunci baru:
   ```bash
   node -e "const c=require('crypto'),f=require('fs');const{publicKey:p,privateKey:k}=c.generateKeyPairSync('ed25519');f.writeFileSync('license-keys/private.pem',k.export({type:'pkcs8',format:'pem'}),{mode:0o600});f.writeFileSync('license-keys/public.pem',p.export({type:'spki',format:'pem'}));console.log(p.export({type:'spki',format:'pem'}))"
   ```
2. Ganti konstanta `PUBLIC_KEY_PEM` di `src/backend/lib/license.js` dengan public key baru.
3. Rilis versi aplikasi baru ke pelanggan, lalu terbitkan ulang lisensi mereka dengan kunci baru.

(Lisensi lama akan berhenti terverifikasi setelah pelanggan update — rencanakan transisinya.)
