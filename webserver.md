# Deployment — Pola B (Nginx Reverse Proxy)

Panduan deploy Churn Dashboard dengan **satu domain** di mana Nginx menyajikan
frontend (file statis) dan mem-proxy backend. Frontend, backend, dan database
berada di **satu mesin**.

```
                         ┌─────────────────────────── Server (1 mesin) ───────────────────────────┐
                         │                                                                          │
[Browser] ──HTTPS:443──► │  Nginx ──/────────► file statis frontend (frontend/dist)                 │
  domainkamu.com         │        └──/api/───► 127.0.0.1:8000 (Gunicorn → Flask) ──► MySQL (localhost) │
                         │                                                                          │
                         └──────────────────────────────────────────────────────────────────────────┘
```

Keuntungan Pola B:
- Backend tetap di `localhost` (tidak perlu domain sendiri, port 8000 tidak diekspos publik).
- Database tetap di `localhost`.
- **Same-origin** → tidak ada masalah CORS maupun mixed content.
- Hanya port 80/443 yang terbuka ke internet.

> Catatan platform: **Gunicorn hanya berjalan di Linux/macOS.** Untuk produksi
> sangat disarankan memakai Linux (mis. Ubuntu). Jika harus di Windows, lihat
> bagian [Alternatif Windows (Waitress)](#alternatif-windows-waitress).

---

## 0. Prasyarat

- Server Linux (contoh: Ubuntu 22.04), akses `sudo`.
- Domain (`domainkamu.com`) sudah diarahkan (DNS A record) ke IP server.
- Python 3.10+, Node.js 18+, MySQL, Nginx terpasang.

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx mysql-server
# Node.js (via NodeSource) untuk build frontend
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 1. Backend — siapkan virtual environment

Backend **wajib** dijalankan di dalam venv yang sudah berisi dependensi.

```bash
cd /var/www/churn-dashboard/backend

# Buat venv (sekali saja)
python3 -m venv venv

# AKTIFKAN venv (Linux/macOS)
source venv/bin/activate

# Pasang dependensi + Gunicorn
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

> Setiap kali masuk shell baru untuk menjalankan/maintenance backend, jangan lupa
> aktifkan venv lebih dulu: `source venv/bin/activate`.

### Konfigurasi `.env` produksi

Salin `.env.example` menjadi `.env`, lalu sesuaikan nilai untuk produksi:

```bash
cp .env.example .env
nano .env
```

Nilai penting untuk produksi:

```dotenv
# Database (tetap localhost — satu mesin)
MYSQL_HOST=localhost
MYSQL_USER=churn_user
MYSQL_PASSWORD=password_kuat_di_sini
MYSQL_DB=churn_dashboard

# JWT — WAJIB diganti dengan string acak panjang
# Buat dengan: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=ganti_dengan_hasil_token_hex_32

# Flask — WAJIB false di produksi
FLASK_DEBUG=false

# CORS — diabaikan saat FLASK_DEBUG=false (Pola B same-origin tidak butuh CORS)
CORS_ORIGINS=

# Batas ukuran upload (MB)
MAX_CONTENT_LENGTH_MB=16

# LLM
DEEPSEEK_API_KEY=isi_api_key
```

### Uji jalan manual (opsional)

```bash
# venv aktif
gunicorn --workers 2 --bind 127.0.0.1:8000 run:app
```

`run:app` artinya: file `run.py`, objek `app`. Tekan Ctrl+C untuk berhenti.

> Aplikasi memuat model embedding (sentence-transformers) & ChromaDB saat start,
> jadi worker pertama bisa butuh waktu beberapa detik. Gunakan `--timeout 120`
> bila perlu, dan jumlah `--workers` secukupnya (RAM bisa terpakai per worker).

---

## 2. Backend — jalankan sebagai service (systemd)

Agar Gunicorn berjalan otomatis dan restart bila crash.

Buat file `/etc/systemd/system/churn-backend.service`:

```ini
[Unit]
Description=Churn Dashboard Backend (Gunicorn)
After=network.target mysql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/churn-dashboard/backend
# Pakai gunicorn DARI DALAM venv (tidak perlu "activate" di systemd)
ExecStart=/var/www/churn-dashboard/backend/venv/bin/gunicorn \
    --workers 2 \
    --timeout 120 \
    --bind 127.0.0.1:8000 \
    run:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now churn-backend
sudo systemctl status churn-backend      # cek berjalan
```

---

## 3. Frontend — build file statis

```bash
cd /var/www/churn-dashboard/frontend

npm install

# Build produksi. Tidak perlu file .env: default kode sudah memakai PATH RELATIF
# (/api/...), sehingga request mengikuti origin halaman di balik Nginx.
npm run build
```

> Frontend tidak butuh `.env` untuk produksi. URL backend default-nya path relatif,
> jadi cukup `npm run build`. (`.env.development` hanya dipakai saat `npm run dev`.)

Hasil build ada di `frontend/dist/`. Inilah yang disajikan Nginx.

> Ingat: nilai `VITE_*` dibakar saat build. Untuk produksi tidak ada yang perlu
> diubah (default sudah path relatif); cukup jalankan `npm run build`.

---

## 4. Nginx — reverse proxy + file statis

Buat `/etc/nginx/sites-available/churn-dashboard`:

```nginx
server {
    listen 80;
    server_name domainkamu.com www.domainkamu.com;

    # Batas ukuran upload (selaraskan dengan MAX_CONTENT_LENGTH_MB backend)
    client_max_body_size 16M;

    # ── Frontend (file statis hasil build) ──
    root /var/www/churn-dashboard/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA fallback untuk React Router
    }

    # ── Backend: endpoint streaming chatbot (SSE) ──
    # Harus DI ATAS "location /api/" — exact match (=) diprioritaskan Nginx.
    # proxy_buffering off WAJIB: tanpa ini Nginx menahan seluruh respons sampai
    # selesai, sehingga token tidak mengalir dan efek streaming hilang.
    location = /api/chat/stream {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Streaming (Server-Sent Events)
        proxy_http_version 1.1;             # keep-alive untuk streaming
        proxy_set_header Connection "";     # jangan tutup koneksi upstream
        proxy_buffering off;                # kirim token begitu diterima
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 300s;            # jawaban LLM bisa panjang
    }

    # ── Backend (proxy ke Gunicorn lokal) ──
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;            # endpoint chat/LLM bisa lambat
    }
}
```

> **Catatan worker (penting untuk streaming).** Dengan Gunicorn sync worker
> (default), satu koneksi streaming **menahan satu worker** selama jawaban
> mengalir. Dengan `--workers 2`, dua chat stream bersamaan sudah memenuhi
> semua worker. Untuk produksi dengan banyak pengguna chat, naikkan jumlah
> worker atau pakai worker async, mis.:
>
> ```bash
> pip install gevent
> # pada ExecStart Gunicorn, tambahkan:
> #   --worker-class gevent --worker-connections 1000
> ```
>
> Backend sudah mengirim header `X-Accel-Buffering: no` pada respons SSE sebagai
> lapis pengaman tambahan agar Nginx tidak mem-buffer, tetapi `proxy_buffering
> off` di atas tetap dianjurkan agar eksplisit.

Aktifkan & reload:

```bash
sudo ln -s /etc/nginx/sites-available/churn-dashboard /etc/nginx/sites-enabled/
sudo nginx -t           # uji konfigurasi
sudo systemctl reload nginx
```

Saat ini situs sudah bisa diakses via `http://domainkamu.com`.

---

## 5. HTTPS — sertifikat gratis (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainkamu.com -d www.domainkamu.com
```

Certbot otomatis menambahkan blok `listen 443 ssl;`, memasang sertifikat, dan
membuat redirect HTTP→HTTPS. Perpanjangan otomatis sudah diatur via timer systemd.

Uji perpanjangan:

```bash
sudo certbot renew --dry-run
```

---

## 6. Firewall — buka hanya 80/443

```bash
sudo ufw allow 'Nginx Full'   # port 80 + 443
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

Port 8000 (Gunicorn) dan 3306 (MySQL) **tidak** dibuka ke publik — keduanya hanya
diakses dari localhost.

---

## 7. Update / redeploy

```bash
cd /var/www/churn-dashboard
git pull

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt        # bila ada dependensi baru
sudo systemctl restart churn-backend

# Frontend
cd ../frontend
npm install                            # bila ada dependensi baru
npm run build
sudo systemctl reload nginx
```

---

## Checklist keamanan produksi

- [ ] `FLASK_DEBUG=false` di `backend/.env`
- [ ] `JWT_SECRET` diganti string acak panjang (bukan `change-me-in-production`)
- [ ] Password MySQL kuat; user DB non-root dengan hak terbatas
- [ ] HTTPS aktif (Let's Encrypt) + redirect HTTP→HTTPS
- [ ] Firewall: hanya 80/443 (+SSH) terbuka; 8000 & 3306 tertutup dari publik
- [ ] `client_max_body_size` (Nginx) selaras dengan `MAX_CONTENT_LENGTH_MB` (backend)
- [ ] `backend/.env` tidak ter-commit ke git (sudah di `.gitignore`)
- [ ] Pertimbangkan rate limiting tambahan untuk `/api/chat` (biaya LLM) & `/api/upload`

---

## Alternatif Windows (Waitress)

Gunicorn tidak jalan di Windows. Jika server produksi Windows, ganti Gunicorn
dengan **Waitress**.

```powershell
# Di folder backend, dengan venv aktif:
.\venv\Scripts\Activate.ps1
pip install waitress

# Jalankan
waitress-serve --listen=127.0.0.1:8000 run:app
```

Konfigurasi Nginx sama persis (tetap `proxy_pass http://127.0.0.1:8000;`).
Untuk auto-start, daftarkan sebagai Windows Service (mis. lewat NSSM) atau
Task Scheduler. Sertifikat HTTPS bisa via win-acme sebagai pengganti Certbot.

> **Streaming di Waitress.** Waitress menyalurkan respons generator (SSE)
> apa adanya, tapi tiap koneksi streaming memakai satu thread. Naikkan jumlah
> thread bila banyak chat bersamaan, mis.:
>
> ```powershell
> waitress-serve --listen=127.0.0.1:8000 --threads=8 run:app
> ```
>
> Pengaturan `proxy_buffering off` pada blok `location = /api/chat/stream` di
> Nginx tetap berlaku dan tetap wajib.
