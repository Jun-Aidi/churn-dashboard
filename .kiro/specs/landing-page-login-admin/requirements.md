# Requirements Document

## Introduction

Dokumen ini mendefinisikan kebutuhan untuk fitur Landing Page, Sistem Login, dan Admin Panel pada Churn Dashboard. Saat ini, aplikasi langsung menampilkan dashboard tanpa halaman publik, tanpa autentikasi pengguna, dan tanpa panel administrasi. Fitur-fitur baru ini akan menambahkan halaman landing publik yang menjelaskan produk, sistem login untuk mengamankan akses ke dashboard, tab admin pada dashboard untuk mengelola pengguna, serta isolasi data prediksi per pengguna. Tidak ada fitur registrasi mandiri — semua akun dibuat oleh admin.

## Glossary

- **Landing_Page**: Halaman publik yang dapat diakses tanpa login, berfungsi sebagai halaman utama produk yang menampilkan informasi tentang Churn Dashboard
- **Auth_System**: Sistem autentikasi yang mengelola proses login, logout, dan validasi sesi pengguna
- **Admin_Tab**: Tab khusus pada dashboard yang hanya muncul dan dapat diakses oleh pengguna dengan role admin, berisi fitur manajemen pengguna dan informasi sistem
- **User**: Pengguna terdaftar yang memiliki akses ke fitur dashboard setelah melakukan autentikasi
- **Admin**: Pengguna dengan role admin yang memiliki akses ke Admin_Tab dan dapat mengelola akun pengguna lain
- **Session_Token**: Token JWT (JSON Web Token) yang digunakan untuk memvalidasi sesi pengguna yang telah terautentikasi
- **Protected_Route**: Halaman atau endpoint API yang hanya dapat diakses oleh pengguna yang telah terautentikasi
- **Dashboard**: Aplikasi Churn Dashboard yang sudah ada, mencakup halaman customers, predict, upload, dan chatbot
- **Prediction_Data**: Data hasil prediksi churn yang dimiliki oleh pengguna tertentu berdasarkan file CSV yang diunggah oleh pengguna tersebut

## Requirements

### Requirement 1: Landing Page Publik

**User Story:** Sebagai pengunjung, saya ingin melihat halaman landing yang menjelaskan produk Churn Dashboard, sehingga saya dapat memahami manfaat produk sebelum login.

#### Acceptance Criteria

1. WHEN seorang pengunjung yang belum terautentikasi mengakses URL root ("/"), THE Landing_Page SHALL menampilkan halaman publik dengan nama produk, deskripsi nilai utama produk, dan bagian-bagian informasi fitur Churn Dashboard
2. THE Landing_Page SHALL menampilkan bagian hero section yang berisi judul produk, deskripsi singkat maksimal 200 karakter, dan satu tombol call-to-action yang mengarahkan pengguna ke halaman login ("/login")
3. THE Landing_Page SHALL menampilkan bagian fitur utama yang berisi tepat 3 item fitur (prediksi churn, analisis pelanggan, dan chatbot AI), masing-masing dengan judul fitur dan satu paragraf deskripsi
4. THE Landing_Page SHALL menampilkan navigasi dengan tautan ke halaman login
5. THE Landing_Page SHALL dapat diakses tanpa autentikasi oleh semua pengunjung tanpa redirect ke halaman login
6. THE Landing_Page SHALL menampilkan seluruh konten tanpa horizontal scrolling pada viewport dengan lebar minimum 320px (mobile) hingga lebar desktop, dengan layout yang menyesuaikan breakpoint 768px
7. IF pengguna sudah memiliki Session_Token yang valid dan mengakses URL root ("/"), THEN THE Landing_Page SHALL mengarahkan pengguna ke halaman Dashboard
8. WHEN tombol call-to-action pada hero section ditekan, THE Landing_Page SHALL menavigasi pengguna ke halaman login tanpa full page reload

### Requirement 2: Login Pengguna

**User Story:** Sebagai pengguna terdaftar, saya ingin login ke sistem, sehingga saya dapat mengakses dashboard dan fitur-fitur yang tersedia.

#### Acceptance Criteria

1. WHEN pengguna memasukkan email dan password yang valid pada form login, THE Auth_System SHALL mengautentikasi pengguna dan mengeluarkan Session_Token berupa JWT yang berisi user id, email, dan role pengguna
2. IF email tidak terdaftar atau password tidak cocok, THEN THE Auth_System SHALL menampilkan pesan error "Email atau password salah" tanpa membedakan field mana yang salah
3. WHEN login berhasil, THE Auth_System SHALL mengarahkan pengguna ke halaman Dashboard dalam waktu tidak lebih dari 2 detik setelah respons autentikasi diterima
4. WHEN Auth_System mengeluarkan Session_Token setelah login berhasil, THE Auth_System SHALL menyimpan Session_Token di local storage browser pengguna
5. WHEN pengguna dengan role admin berhasil login, THE Auth_System SHALL menampilkan tab Admin_Tab pada navigasi dashboard
6. IF pengguna sudah memiliki Session_Token yang valid dan mengakses halaman login, THEN THE Auth_System SHALL mengarahkan pengguna langsung ke Dashboard
7. IF pengguna memasukkan email dengan format tidak valid (tidak mengandung karakter "@" dan domain) atau password dengan panjang kurang dari 8 karakter, THEN THE Auth_System SHALL menampilkan pesan validasi pada field yang bersangkutan dan tidak mengirimkan request ke server
8. IF akun pengguna berstatus nonaktif, THEN THE Auth_System SHALL menolak login dan menampilkan pesan error yang menginformasikan bahwa akun telah dinonaktifkan
9. IF pengguna gagal login sebanyak 5 kali berturut-turut pada email yang sama, THEN THE Auth_System SHALL memblokir percobaan login untuk email tersebut selama 5 menit

### Requirement 3: Proteksi Route dan Manajemen Sesi

**User Story:** Sebagai pemilik sistem, saya ingin memastikan halaman dashboard hanya dapat diakses pengguna yang sudah login, sehingga data pelanggan tetap aman.

#### Acceptance Criteria

1. WHEN pengguna yang belum terautentikasi mengakses Protected_Route, THE Auth_System SHALL mengarahkan pengguna ke halaman login dan menyimpan URL tujuan awal agar pengguna dapat diarahkan kembali ke URL tersebut setelah login berhasil
2. THE Auth_System SHALL memvalidasi Session_Token pada setiap request ke endpoint API yang dilindungi, dan mengembalikan response HTTP 401 Unauthorized jika token tidak disertakan atau tidak valid
3. IF Session_Token sudah expired (melewati 24 jam sejak diterbitkan), memiliki signature tidak valid, atau berformat malformed, THEN THE Auth_System SHALL menghapus token dari local storage browser dan mengarahkan pengguna ke halaman login
4. THE Auth_System SHALL menetapkan masa berlaku Session_Token selama 24 jam sejak login berdasarkan claim "exp" pada JWT
5. WHEN pengguna menekan tombol logout, THE Auth_System SHALL menghapus Session_Token dari local storage browser dan mengarahkan pengguna ke Landing_Page
6. THE Auth_System SHALL menyertakan Session_Token pada header Authorization dengan format "Bearer <token>" pada setiap request API dari frontend ke backend
7. IF frontend menerima response HTTP 401 dari backend, THEN THE Auth_System SHALL menghapus Session_Token dari local storage browser dan mengarahkan pengguna ke halaman login dalam waktu maksimal 3 detik

### Requirement 4: Isolasi Data Prediksi Per Pengguna

**User Story:** Sebagai pengguna, saya ingin data prediksi yang saya hasilkan hanya terlihat oleh saya, sehingga data saya tidak tercampur dengan data pengguna lain.

#### Acceptance Criteria

1. WHEN pengguna mengunggah file CSV dan menjalankan prediksi, THE Auth_System SHALL menyimpan data pelanggan dan hasil prediksi ke database dengan kolom user_id yang merujuk pada akun pengguna yang sedang login
2. WHEN pengguna mengakses halaman dashboard, customers, atau predict, THE Dashboard SHALL hanya menampilkan data yang memiliki user_id sesuai dengan pengguna yang sedang login, baik pada tampilan frontend maupun pada response endpoint API backend
3. WHEN pengguna mengunggah file CSV baru, THE Dashboard SHALL mengganti seluruh data pelanggan milik pengguna tersebut dengan data dari file CSV baru, tanpa mempengaruhi data milik pengguna lain
4. IF pengguna belum pernah mengunggah data, THEN THE Dashboard SHALL menampilkan state kosong yang berisi pesan informatif dan tombol navigasi ke halaman upload
5. WHILE pengguna memiliki role admin, THE Admin_Tab SHALL menampilkan ringkasan statistik agregat dari seluruh pengguna meliputi total pelanggan, distribusi risiko, dan jumlah prediksi
6. IF pengguna mengakses endpoint API customers, predict, atau trend tanpa Session_Token yang valid atau dengan user_id milik pengguna lain, THEN THE Auth_System SHALL menolak request dan mengembalikan response error tanpa mengekspos data pengguna lain
7. WHEN dua pengguna berbeda mengunggah file CSV yang mengandung customer_id yang sama, THE Auth_System SHALL menyimpan data tersebut secara terpisah berdasarkan user_id masing-masing pengguna sehingga tidak terjadi konflik data

### Requirement 5: Admin Tab - Manajemen Pengguna

**User Story:** Sebagai admin, saya ingin mengelola akun pengguna sistem melalui tab khusus di dashboard, sehingga saya dapat mengontrol siapa yang memiliki akses.

#### Acceptance Criteria

1. WHILE pengguna memiliki role admin, THE Admin_Tab SHALL menampilkan daftar semua pengguna beserta nama (maksimum 100 karakter), email, role, status aktif, dan tanggal registrasi, diurutkan berdasarkan tanggal registrasi terbaru
2. WHEN admin membuat akun baru dengan mengisi nama lengkap (1–100 karakter), email berformat valid, dan password (minimal 8 karakter), THE Admin_Tab SHALL menyimpan akun baru ke database dengan role yang dipilih (user atau admin) dan status aktif secara default
3. WHEN admin mengedit data akun pengguna (nama, email, role, atau password), THE Admin_Tab SHALL memvalidasi input dengan aturan yang sama seperti pembuatan akun dan memperbarui data pengguna di database
4. WHEN admin menonaktifkan akun pengguna lain, THE Admin_Tab SHALL menandai akun sebagai nonaktif, membatalkan Session_Token aktif milik pengguna tersebut, dan mencegah pengguna tersebut login
5. WHEN admin mengaktifkan kembali akun yang nonaktif, THE Admin_Tab SHALL mengubah status akun menjadi aktif dan mengizinkan pengguna tersebut login kembali
6. IF pengguna tanpa role admin mengakses endpoint atau halaman Admin_Tab, THEN THE Auth_System SHALL mengembalikan response 403 Forbidden
7. WHEN admin membuat akun baru dengan email yang sudah terdaftar, THE Admin_Tab SHALL menampilkan pesan error yang menyatakan bahwa email sudah digunakan tanpa menyimpan data ke database
8. IF admin mencoba menonaktifkan akun miliknya sendiri, THEN THE Admin_Tab SHALL menolak permintaan dan menampilkan pesan error yang menyatakan bahwa admin tidak dapat menonaktifkan akun sendiri
9. IF admin membuat atau mengedit akun dengan email berformat tidak valid atau password kurang dari 8 karakter, THEN THE Admin_Tab SHALL menampilkan pesan error yang menyatakan field mana yang tidak memenuhi syarat tanpa menyimpan perubahan ke database

### Requirement 6: Admin Tab - Informasi Sistem

**User Story:** Sebagai admin, saya ingin melihat informasi dan status sistem secara keseluruhan, sehingga saya dapat memantau penggunaan aplikasi.

#### Acceptance Criteria

1. WHILE pengguna memiliki role admin, THE Admin_Tab SHALL menampilkan jumlah pengguna aktif dan jumlah pengguna nonaktif sebagai dua angka terpisah
2. WHILE pengguna memiliki role admin, THE Admin_Tab SHALL menampilkan jumlah total record pelanggan (baris pada tabel customers) di database dari seluruh pengguna
3. WHILE pengguna memiliki role admin, THE Admin_Tab SHALL menampilkan jumlah total record prediksi (baris pada tabel predictions) yang telah dilakukan oleh seluruh pengguna
4. WHILE pengguna memiliki role admin, THE Admin_Tab SHALL menampilkan jumlah total sesi chat unik (berdasarkan session_id unik pada tabel chat_history) yang tercatat
5. WHEN Admin_Tab dimuat atau di-refresh, THE Admin_Tab SHALL mengambil data statistik terbaru dari database dan menampilkan angka yang mencerminkan kondisi saat request dilakukan
6. IF data statistik tidak dapat diambil dari database, THEN THE Admin_Tab SHALL menampilkan pesan error yang mengindikasikan bahwa data sistem tidak tersedia

### Requirement 7: Database Pengguna

**User Story:** Sebagai developer, saya ingin menyimpan data pengguna secara terstruktur di database, sehingga sistem autentikasi dapat berjalan dengan konsisten.

#### Acceptance Criteria

1. THE Auth_System SHALL menyimpan data pengguna dalam tabel "users" di database MySQL yang sudah ada, menggunakan SQLAlchemy model yang terintegrasi dengan Base metadata yang sama
2. THE Auth_System SHALL menyimpan field berikut untuk setiap pengguna: id (integer, auto-increment, primary key), nama lengkap (string, maksimal 100 karakter, wajib diisi), email (string, maksimal 255 karakter, unik, wajib diisi), password hash (string, maksimal 255 karakter), role (string, nilai valid: "admin" atau "user", default: "user"), status aktif (boolean, default: true), dan timestamp registrasi (datetime, otomatis terisi saat akun dibuat)
3. WHEN aplikasi dijalankan dan tabel users kosong (belum ada pengguna terdaftar), THE Auth_System SHALL membuat akun admin default dengan email dari environment variable ADMIN_EMAIL dan password dari environment variable ADMIN_PASSWORD
4. IF environment variable ADMIN_EMAIL atau ADMIN_PASSWORD tidak tersedia saat pembuatan admin default diperlukan, THEN THE Auth_System SHALL menampilkan pesan error di log dan tidak membuat akun admin default
5. THE Auth_System SHALL menggunakan kolom email sebagai identifier unik untuk setiap pengguna dengan constraint unique di level database
6. THE Auth_System SHALL menyimpan password dalam bentuk hash menggunakan algoritma bcrypt dengan cost factor minimal 12 rounds
7. THE Auth_System SHALL menambahkan kolom "user_id" (integer, nullable, foreign key ke users.id) pada tabel customers dan predictions untuk mengasosiasikan data dengan pemiliknya
8. IF terdapat data existing di tabel customers atau predictions yang belum memiliki user_id, THEN THE Auth_System SHALL mengizinkan nilai NULL pada kolom user_id untuk data tersebut tanpa menghapus data yang sudah ada

### Requirement 8: Integrasi dengan Sistem yang Sudah Ada

**User Story:** Sebagai developer, saya ingin fitur baru terintegrasi dengan baik ke dalam arsitektur yang sudah ada, sehingga fitur-fitur lama tetap berfungsi normal.

#### Acceptance Criteria

1. THE Auth_System SHALL mendaftarkan endpoint autentikasi baru (/api/auth/login, /api/auth/logout, /api/auth/me) sebagai Flask Blueprint pada aplikasi Flask yang sudah ada, tanpa mengubah konfigurasi Blueprint yang sudah terdaftar (chat, customers, predict, trend, upload)
2. THE Landing_Page SHALL didaftarkan sebagai route baru pada React Router di App.jsx tanpa menghapus atau mengubah route yang sudah ada (/, /customers, /customers/:id, /upload)
3. WHEN pengguna terautentikasi mengakses endpoint API yang sudah ada (/api/customers, /api/predict, /api/upload, /api/chat, /api/trend), THE Auth_System SHALL mengembalikan response dengan format JSON yang identik dengan format sebelum middleware ditambahkan, hanya difilter berdasarkan kepemilikan data pengguna
4. WHEN request tanpa Session_Token yang valid dikirim ke endpoint API yang dilindungi (/api/customers, /api/predict, /api/upload, /api/chat, /api/trend), THE Auth_System SHALL mengembalikan HTTP status 401 dengan response JSON berisi field "error"
5. THE Landing_Page SHALL menggunakan class utility TailwindCSS yang sudah terkonfigurasi di project tanpa menambahkan framework CSS tambahan atau mengubah konfigurasi tailwind.config yang sudah ada
6. THE Admin_Tab SHALL ditambahkan sebagai item navigasi baru pada array navItems di komponen Sidebar, ditempatkan setelah item navigasi yang sudah ada (Dashboard, Pelanggan, Upload Data)
7. WHEN pengguna terautentikasi mengakses halaman dashboard, customers, atau upload melalui browser, THE Dashboard SHALL memuat dan menampilkan halaman dalam waktu tidak lebih dari 3 detik setelah middleware autentikasi ditambahkan
8. IF terjadi error pada middleware autentikasi saat memproses request ke endpoint yang sudah ada, THEN THE Auth_System SHALL mengembalikan HTTP status 500 dengan response JSON berisi field "error" tanpa mengekspos detail internal server
