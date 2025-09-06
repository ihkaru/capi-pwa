### **Spesifikasi Alur Kerja & Interaksi Entitas (Versi Final: PWA-Centric)**

## 1. Pendahuluan

Dokumen ini mendefinisikan alur kerja fungsional, peran, tanggung jawab, dan interaksi antara semua entitas dalam **Platform Cerdas**, sebuah sistem survei statistik berbasis CAPI. Arsitektur platform ini terdiri dari tiga komponen utama:

- **Cerdas Mobile:** Aplikasi antarmuka berbasis Progressive Web App (PWA) untuk petugas lapangan (PPL dan PML).
- **Cerdas-SM (Survei Management):** Layanan backend yang mengatur seluruh logika bisnis, data, dan API.
- **Cerdas Form Builder:** Komponen yang direncanakan untuk manajemen skema formulir dinamis (akan dikembangkan di masa depan).

Arsitektur yang dijelaskan di sini berpusat pada **Cerdas Mobile (PWA)** sebagai antarmuka utama untuk semua peran operasional di lapangan, yaitu **Petugas Pencacah Lapangan (PPL)** dan **Petugas Pemeriksa Lapangan (PML)**.

Panel administrasi **Filament** secara eksklusif digunakan oleh peran administratif (`super_admin`, `admin_satker`, `admin_kegiatan`) untuk fungsi persiapan, manajemen strategis, pemantauan tingkat tinggi, dan finalisasi data. Dokumen ini bertujuan untuk memberikan pemahaman yang jelas dan mendetail mengenai siklus hidup data, dari persiapan hingga persetujuan akhir, untuk memastikan implementasi logika bisnis yang akurat.

Untuk menjamin kualitas, skalabilitas, dan kemudahan pemeliharaan kode, seluruh proses pengembangan wajib mengacu pada praktik terbaik terkini seperti yang dijabarkan di bawah ini.

### **1.1. Prinsip dan Praktik Terbaik Pengembangan**

Bagian ini menegaskan standar teknologi dan metodologi yang harus diikuti dalam pengembangan setiap komponen Platform Cerdas.

#### **Frontend: Cerdas Mobile (PWA)**

1.  **Framework & Sintaks:**

    - Pengembangan antarmuka PWA **wajib** mengikuti praktik terbaik terkini dari **Framework7-Vue**.
    - Seluruh komponen Vue **wajib** menggunakan sintaks **`<script setup>`**. Pendekatan ini memastikan kode lebih ringkas, mudah dibaca, dan memaksimalkan fitur-fitur Vue 3 Composition API secara penuh. Penggunaan `Options API` tidak diperkenankan untuk komponen baru.

2.  **Penamaan File:**

    - Penamaan file komponen Vue harus mengikuti konvensi **`PascalCase`** (contoh: `ActivityDashboardPage.vue`, `AssignmentCard.vue`). Ini adalah standar komunitas yang meningkatkan keterbacaan dan konsistensi proyek.

3.  **Manajemen Database Lokal (IndexedDB):**
    - Interaksi dengan database IndexedDB di sisi klien **wajib** diimplementasikan menggunakan **Dexie.js versi terbaru**.
    - Implementasi harus secara ketat mengikuti **praktik terbaik (best practice) dan cara terbaru** yang direkomendasikan oleh dokumentasi resmi Dexie.js dan komunitas pengembang. Ini mencakup, namun tidak terbatas pada, desain skema yang efisien, penggunaan transaksi (`transaction`) untuk menjamin integritas data, penanganan _versioning_ dan migrasi skema yang benar, serta penulisan _query_ yang optimal.
    - Sebelum implementasi, pengembang **diwajibkan untuk selalu melakukan riset (Googling)** guna memastikan bahwa pola desain dan teknik yang digunakan adalah yang paling modern dan paling sesuai untuk aplikasi PWA dengan kapabilitas _offline-first_ yang kompleks.

#### **Backend: Cerdas SM (Laravel)**

1.  **Arsitektur & Pola Desain:**

    - Pengembangan backend harus selaras dengan praktik terbaik terbaru dalam ekosistem **Laravel**.
    - Logika bisnis yang kompleks harus diekstraksi dari _Controller_. Gunakan **_Service Classes_** atau **_Action Classes_** untuk menjaga agar _Controller_ tetap ramping dan fokus pada penanganan permintaan HTTP.

2.  **Kualitas Kode & Konsistensi:**
    - Manfaatkan fitur-fitur modern Laravel seperti **`Enum`** untuk status dan tipe data, serta deklarasi **`strict types`** (`declare(strict_types=1);`) untuk meningkatkan keandalan kode.
    - Gunakan **`Eloquent API Resources`** untuk standardisasi dan transformasi data pada respons API, memastikan format output yang konsisten.
    - Implementasikan validasi yang ketat dan eksplisit menggunakan **`Form Requests`** untuk setiap endpoint yang menerima input, guna menjamin integritas data sebelum masuk ke logika bisnis.

## 2. Definisi Entitas dan Peran

### 2.1. Entitas Organisasi & Proyek

- **Satuan Kerja (Satker):** Entitas organisasi dasar (misalnya, BPS Kabupaten/Kota, BPS Provinsi). Bertindak sebagai "Tenant" atau unit kerja utama dalam sistem. Setiap pengguna terafiliasi dengan satu Satker induk.
- **Kegiatan Statistik:** Proyek pengumpulan data (misalnya, "Sensus Pertanian 2026"). Sebuah kegiatan bersifat global dan dapat melibatkan banyak `Satker` sebagai pelaksana.
- **Assignment:** Unit tugas terkecil yang diberikan kepada petugas lapangan, didefinisikan oleh **hierarki wilayah kerja berbasis level (hingga 6 level)**. Setiap assignment terikat pada satu `Kegiatan Statistik`, satu `PPL`, dan satu `PML`.
- **Assignment Response:** Wadah untuk data yang dikumpulkan dari sebuah `Assignment`. Entitas ini memiliki siklus hidup yang dinamis, direpresentasikan oleh `status`, dan menjadi objek utama dalam alur kerja operasional.

### 2.2. Alur Kerja Login dan Pendaftaran

Sistem mendukung dua metode autentikasi: email/password tradisional dan Single Sign-On (SSO) melalui Google. Alur pendaftaran mandiri via Google diizinkan untuk mempermudah pengguna.

#### **Alur 1: Pendaftaran Mandiri (Pengguna Baru via Google)**

1.  Pengguna baru membuka halaman login dan memilih **"Login dengan Google"**.
2.  Setelah autentikasi Google berhasil, backend menerima profil pengguna.
3.  Backend memeriksa apakah `google_id` atau `email` sudah ada di database. Jika tidak ada, backend akan **membuat akun `User` baru**.
4.  Akun baru ini akan memiliki `satker_id = NULL`, menjadikannya "Pengguna Mengambang" (_Floating User_).
5.  Pengguna berhasil login tetapi akan melihat pesan bahwa mereka belum terafiliasi dengan Satker atau kegiatan manapun dan harus menghubungi administrator.

#### **Alur 2: Penautan Otomatis (Pengguna Sudah Dibuat Admin)**

1.  Seorang Admin telah membuat akun untuk PPL dengan `email` tertentu, namun PPL tersebut belum pernah login.
2.  PPL memilih **"Login dengan Google"** menggunakan akun Google dengan email yang sama.
3.  Backend mendeteksi bahwa `email` tersebut sudah ada tetapi `google_id`-nya masih kosong.
4.  Backend secara otomatis **menautkan akun Google** tersebut dengan memperbarui kolom `google_id` pada record pengguna yang ada.
5.  Login berhasil, dan pengguna langsung dapat mengakses kegiatannya.

#### **Alur 3: Login Normal (Akun Sudah Tertaut)**

1.  Pengguna yang sudah pernah login dengan Google sebelumnya mengklik **"Login dengan Google"**.
2.  Backend menemukan `User` berdasarkan `google_id` yang cocok.
3.  Login berhasil seketika.

*Untuk detail implementasi teknis login, lihat `App\Http\Controllers\Auth\LoginController` dan `App\Http\Controllers\Auth\GoogleLoginController` di `GEMINI.md`.*

### 2.3. Peran Pengguna (Dikelola oleh Filament Shield)

Peran bersifat kontekstual dan diberikan kepada pengguna dalam lingkup `Kegiatan Statistik` tertentu.

#### **A. Pengguna Panel Filament (Peran Administratif)**

- **`super_admin`**

  - **Tanggung Jawab:** Mengelola keseluruhan sistem dan entitas tingkat tertinggi.
  - **Kewenangan (via Filament):**
    - Membuat, mengedit, dan menghapus `Satker`.
    - Membuat, mengedit, dan menghapus `Kegiatan Statistik`, termasuk mendesain `form_schema` dan versinya.
    - Menugaskan `Satker` pelaksana ke dalam sebuah `Kegiatan Statistik`.
    - Membuat akun pengguna untuk `admin_satker`.

- **`admin_satker`**

  - **Tanggung Jawab:** Mengelola sumber daya manusia di dalam Satker-nya.
  - **Kewenangan (via Filament, dalam lingkup Satker-nya):**
    - Membuat, mengedit, dan menonaktifkan akun User (terutama untuk pengguna yang tidak menggunakan login Google atau perlu dibuatkan akun secara manual).

- **`admin_kegiatan`**
  - **Tanggung Jawab:** Mengelola pelaksanaan operasional sebuah `Kegiatan Statistik` di dalam Satker-nya.
  - **Kewenangan (via Filament, dalam lingkup Kegiatan & Satker-nya):**
    - **Merekrut Anggota Tim:** Mencari dan menambahkan `User` (berdasarkan email) dari seluruh sistem ke dalam kegiatan. Saat seorang pengguna direkrut, `satker_id` mereka akan diatur ke Satker milik Admin, dan mereka ditambahkan sebagai anggota kegiatan (`kegiatan_members`).
    - Memberikan peran (`Roles`) `PML` dan `PPL` kepada anggota kegiatan menggunakan Filament Shield.
    - Mengelola `Assignment`: Membuat, menugaskan, dan mengalihkan tugas (re-assign) PPL dan PML jika diperlukan selama periode lapangan.
    - Memantau progres operasional: Memantau progres seluruh assignment melalui dasbor dan laporan generik (misalnya, jumlah berdasarkan status, kemajuan per petugas atau wilayah).
    - Melakukan tindakan final (`Approve by Admin`, `Reject by Admin`) pada data yang sudah lolos dari siklus PPL-PML.

#### **B. Pengguna PWA (Peran Lapangan/Operasional)**

- **`PML (Petugas Pemeriksa Lapangan)`**

  - **Tanggung Jawab:** Memeriksa dan memastikan kualitas data yang dikumpulkan oleh PPL yang berada di bawah pengawasannya, langsung melalui PWA.
  - **Kewenangan (via PWA):**
    - Melihat daftar PPL yang diawasinya dan progres mereka.
    - Melihat daftar `Assignment` dari PPL-nya yang berstatus `Submitted by PPL` atau status lain yang relevan.
    - Membuka `Assignment Response` dalam mode baca-saja atau mode edit terbatas (sesuai `form_schema`).
    - Melakukan tindakan **Approve** atau **Reject** (dengan `notes` wajib diisi) langsung dari antarmuka PWA.
    - Melakukan tindakan **Batalkan Persetujuan** (dengan `notes` opsional) untuk mengembalikan status `Approved by PML` menjadi `Submitted by PPL` jika terjadi kesalahan persetujuan.

- **`PPL (Petugas Pencacah Lapangan)`**
  - **Tanggung Jawab:** Melakukan wawancara dan mengumpulkan data di lapangan sesuai `Assignment`.
  - **Kewenangan (via PWA, hanya untuk assignment miliknya):**
    - Mengunduh `Assignment` dan `form_schema` untuk kerja offline.
    - Mengisi dan menyimpan data `Assignment Response` secara lokal.
    - Melakukan **Submit** atas `Assignment Response` yang telah selesai.
    - Melihat catatan penolakan dan memperbaiki data yang di-**Reject** oleh PML/Admin.

## 3. Siklus Hidup Pengumpulan Data (Workflow End-to-End)

Ini adalah alur kerja lengkap untuk satu `Assignment Response`, dari awal hingga akhir.

### **Tahap 1: Persiapan (dilakukan di Filament oleh Admin)**

1.  **Pembuatan Kegiatan & Formulir:** `super_admin` membuat `Kegiatan Statistik` baru dan mendesain `form_schema`-nya.
2.  **Penugasan Satker:** `super_admin` menugaskan Satker-satker pelaksana ke dalam kegiatan tersebut.
3.  **Manajemen Tim:** `admin_kegiatan` di setiap Satker pelaksana "merekrut" `User` ke dalam kegiatan dan memberikan peran `PML` atau `PPL` menggunakan Filament Shield.
4.  **Pembuatan Assignment:** `admin_kegiatan` membuat `Assignment`, menautkannya ke PPL dan PML yang relevan. Proses ini sangat fleksibel untuk mendukung berbagai metodologi survei. - **Skenario A: Pembuatan Awal (Manual/Impor):** Untuk kegiatan yang tidak memiliki prelist (misalnya, Listing awal), Admin dapat membuat `Assignment` secara manual atau melalui fitur impor dari file CSV/Excel.

- **Skenario B: Pembuatan dari Hasil Kegiatan Sebelumnya:** Sistem menyediakan fitur untuk men-generate `Assignment` berdasarkan hasil dari kegiatan lain. Ini adalah alur kerja standar untuk skenario seperti:

  - **Listing → Pendataan:** `Assignment` untuk kegiatan "Pendataan" dibuat dari daftar responden yang valid dari `assignment_responses` kegiatan "Listing".
  - **Pendataan → Post Enumeration Survey (PES):** `Assignment` untuk kegiatan "PES" dibuat dengan mengambil sampel (misalnya 5%) dari `Assignment` kegiatan "Pendataan" utama.

- **Proses Pra-Isi Data:** Selama pembuatan `Assignment` (baik skenario A maupun B), sistem dapat mengisi kolom `prefilled_data`. Data ini (misalnya, nama kepala rumah tangga atau nama perusahaan) akan ditampilkan kepada PPL di PWA untuk membantu identifikasi responden di lapangan.

Saat sebuah `Assignment` dibuat, `Assignment Response` baru juga dibuat secara otomatis dengan `status` awal **`Assigned`**.

### **Tahap 2: Pengumpulan Data oleh PPL (dilakukan di PWA)**

1.  **Persiapan & Pengunduhan Awal Kegiatan (Per-Kegiatan):** Setelah PPL memilih sebuah kegiatan dari halaman beranda PWA, aplikasi akan memulai proses persiapan untuk kerja offline:
    a. **Pengecekan Lokal:** Aplikasi memeriksa apakah data inti untuk kegiatan ini sudah ada di IndexedDB.
    b. **Unduh Data Inti:** Jika belum ada, PWA memanggil endpoint `initial-data/{activityId}` untuk mengunduh `Assignment` yang ditugaskan, `form_schema` versi terbaru, dan data relevan lainnya. (Lihat `ActivityController::getInitialData`)
    c. **Identifikasi & Unduh Master Data:** PWA mem-parsing properti `masters_used` di `form_schema` dan mengunduh semua master data yang diperlukan.
    d. **Simpan ke Lokal:** Semua data disimpan ke IndexedDB. UI harus menampilkan progres yang jelas selama proses ini.

2.  **Mulai Bekerja:** PPL membuka sebuah assignment. Status `Assignment Response` di PWA secara internal dapat dianggap **`Opened`**.

3.  **Pengisian Data (Offline):** PPL mengisi formulir. Setiap perubahan data disimpan secara otomatis ke IndexedDB (auto-save).

    - **Catatan Penting:** Data dari `prefilled_data` (misalnya, nama kepala rumah tangga) akan ditampilkan sebagai informasi referensi yang **bersifat read-only**. Jika PPL perlu mengoreksi data ini, ia akan mengisinya di field kuesioner yang sesuai, yang kemudian akan disimpan di dalam objek `responses`.

4.  **Submit:** Setelah selesai, PPL menekan tombol "Submit".
    - Di PWA, status `Assignment Response` diubah menjadi **`Submitted by PPL`**.
    - Antarmuka formulir untuk assignment tersebut menjadi **terkunci (read-only)** bagi PPL.
    - Aksi "submit" ini beserta seluruh datanya dimasukkan ke dalam antrean sinkronisasi (`sync_queue`). (Lihat `ActivityController::submitAssignments`)
5.  **Sinkronisasi ke Server:** Saat perangkat PPL online, `SyncEngine` mengirimkan data ke server. Server memvalidasi data, memastikan PPL memiliki izin, dan memperbarui `status` di database menjadi **`Submitted by PPL`**.

### **Tahap 3: Pemeriksaan oleh PML (dilakukan di PWA)**

1.  **Sinkronisasi PML:** PML login ke PWA. Aplikasi memanggil endpoint `initial-data` (yang disesuaikan untuk PML) dan mengunduh `Assignment` dari semua PPL yang diawasinya, terutama yang memerlukan tindakan (misalnya, berstatus `Submitted by PPL`).
2.  **Dasbor Pemeriksaan:** Antarmuka PWA untuk PML menampilkan daftar tugas pemeriksaan, dikelompokkan berdasarkan PPL atau status.
3.  **Proses Review:** PML memilih sebuah assignment untuk diperiksa. PWA menampilkan data `Assignment Response` yang telah diisi PPL. Tergantung `form_schema`, beberapa field mungkin bisa diedit oleh PML, sementara yang lain bersifat read-only.
4.  **Keputusan Pemeriksaan:**

- **Prasyarat - Pengecekan Aksi Online:** Sebelum menampilkan tombol "Approve" atau "Reject", PWA **wajib** melakukan panggilan ke API server (misalnya, `GET /api/assignments/{id}/allowed-actions`). Panggilan ini bertujuan untuk mengkonfirmasi aksi apa yang diizinkan oleh sistem pada saat itu. Jika perangkat PML sedang offline, tombol-tombol aksi ini akan dinonaktifkan atau disembunyikan. (Lihat `ActivityController::getAllowedActions`)
- **Skenario A: Approve (Data Diterima):**
  - PML menekan tombol "Approve".
  - Di PWA, status `Assignment Response` diubah menjadi **`Approved by PML`**.
  - Aksi "approve" ini (berisi `assignment_id`, `status` baru, dan `version`) dimasukkan ke dalam `sync_queue` PML.
- **Skenario B: Reject (Data Ditolak):**
  - PML menekan tombol "Reject".
  - PWA menampilkan modal yang **mewajibkan** PML untuk mengisi alasan penolakan (`notes`).
  - Di PWA, status `Assignment Response` diubah menjadi **`Rejected by PML`** dan `notes` disimpan.
  - Aksi "reject" ini dimasukkan ke dalam `sync_queue` PML.
- **Skenario C: Batalkan Persetujuan (Koreksi Kesalahan):**
  - PML menekan tombol "Batalkan Persetujuan" (Revert Approval).
  - PWA menampilkan modal yang **opsional** bagi PML untuk mengisi alasan pembatalan (`notes`).
  - Di PWA, status `Assignment Response` diubah menjadi **`Submitted by PPL`** dan `notes` disimpan.
  - Aksi "batalkan persetujuan" ini dimasukkan ke dalam `sync_queue` PML.

*Untuk detail implementasi teknis perubahan status, lihat `AssignmentStatusController::update`.*

5.  **Sinkronisasi Keputusan:** Saat perangkat PML online, `SyncEngine` mengirimkan keputusan (approve/reject) ke server. Server memvalidasi (memastikan PML berwenang) dan memperbarui `status` di database.

### **Tahap 4: Siklus Perbaikan (interaksi PWA-ke-PWA)**

1.  **Pemberitahuan ke PPL:** Saat PPL melakukan sinkronisasi berikutnya, PWA-nya akan mengunduh pembaruan status dari server.
2.  **Membuka Kembali Form:** PWA mendeteksi `status` **`Rejected by PML`** (atau `Rejected by Admin`) untuk salah satu assignment-nya.
3.  **Pembukaan Kunci:** Antarmuka formulir untuk assignment tersebut **dibuka kembali (unlocked)**, memungkinkan PPL untuk mengedit.
4.  **Tampilan Catatan:** Alasan penolakan yang dikirim PML ditampilkan dengan jelas kepada PPL.
5.  **Perbaikan oleh PPL:** PPL memperbaiki data sesuai catatan.
6.  **Submit Ulang:** PPL menekan "Submit" lagi. Proses kembali ke **Tahap 2, Langkah 4**, dan siklus pemeriksaan oleh PML (Tahap 3) akan berulang.

### **Tahap 5: Finalisasi (dilakukan di Filament oleh Admin Kegiatan)**

1.  **Pemantauan Akhir:** `admin_kegiatan` memantau di panel Filament daftar `Assignment Response` yang telah mencapai status `Approved by PML`.
2.  **Keputusan Final:**
    - **Approve Final:** Admin Kegiatan menyetujui data, mengubah `status` menjadi **`Approved by Admin`**. Ini adalah status akhir, menandakan data telah diverifikasi dan bersih.
    - **Reject Final:** Jika Admin Kegiatan menemukan kesalahan krusial, ia dapat melakukan **Reject**. Status berubah menjadi **`Rejected by Admin`**. Data ini akan kembali ke PPL untuk diperbaiki, mengulangi siklus dari Tahap 4.
3.  **Edit Pasca-Periode:** Sesuai `permission`, jika periode pendataan telah berakhir, `admin_kegiatan` dapat langsung mengedit data di Filament untuk pembersihan akhir tanpa mengembalikannya ke PPL.

## 4. Penanganan Perubahan Versi Formulir

Sistem dirancang untuk menangani pembaruan `form_schema` yang mungkin terjadi di tengah periode pengumpulan data.

1.  **Deteksi Versi:** Setiap kali PPL membuka assignment yang dapat diedit di PWA, aplikasi akan membandingkan `form_version_used` yang tersimpan dengan versi terbaru yang tersedia.
2.  **Skenario Pembaruan:**
    - **Data Baru/Kosong:** PWA akan selalu menggunakan `form_schema` versi terbaru.
    - **Data Dikembalikan (`Rejected`):** PWA akan memuat data yang ada tetapi merender formulir menggunakan `form_schema` versi terbaru. UI akan memberitahu PPL bahwa ada pembaruan pada formulir.
3.  **Fleksibilitas Lapangan:** Mengingat PPL mungkin berada di lokasi terpencil, sistem bersifat permisif. Jika PPL tidak dapat memperoleh data untuk pertanyaan baru yang ditambahkan di skema versi baru, PPL tetap dapat mengirimkan ulang data. Saat dikirim, `form_version_used` yang dicatat adalah versi lama, menandakan bahwa data tersebut diisi berdasarkan skema sebelumnya. Ini menjadi penanda bagi `admin_kegiatan` untuk melakukan verifikasi atau pembersihan data di tahap akhir.

## 5. Resolusi Konflik Sinkronisasi

Meskipun `admin_kegiatan` tidak dapat mengedit data selama periode pengumpulan data, sistem tetap menerapkan mekanisme _Optimistic Locking_ menggunakan kolom `version` pada `assignment_responses` untuk mencegah _lost updates_.

1.  **Mekanisme:** Setiap pembaruan data yang dikirim ke server harus menyertakan nomor `version` yang dimiliki oleh PWA.
2.  **Validasi Server:** Server akan membandingkan `version` yang masuk dengan `version` di database.
    -   **Versi Cocok:** Pembaruan diterima, dan server akan menaikkan nomor `version`-nya.
    -   **Versi Tidak Cocok (Konflik `409`):** Pembaruan ditolak dengan error `409 Conflict`. Ini menandakan bahwa data di server telah diperbarui oleh perangkat lain atau Admin sejak terakhir kali PWA melakukan sinkronisasi.
3.  **Penanganan Konflik di PWA (Strategi "Server Wins"):**
    -   Jika PWA menerima error `409 Conflict` saat mencoba mengirim data (misalnya, saat PPL menekan "Submit"), PWA akan menghentikan proses pengiriman untuk item tersebut.
    -   PWA akan menampilkan dialog peringatan yang jelas kepada pengguna. Pesan akan menyatakan: "**Konflik Sinkronisasi:** Tugas ini telah diperbarui di server oleh perangkat lain. Perubahan lokal Anda tidak dapat dikirim. Mohon cadangkan data penting secara manual (misalnya, dengan tangkapan layar), lalu lakukan 'Sync Perubahan' untuk mendapatkan versi terbaru dari server."
    -   Setelah pengguna menutup dialog, item yang gagal akan dihapus dari antrean sinkronisasi (`sync_queue`) untuk mencegah percobaan ulang yang tidak perlu.
    -   **Penting:** Untuk menyelesaikan konflik, pengguna **wajib** melakukan "Sync Perubahan" (Delta Download). Proses ini akan menimpa data lokal dengan versi yang ada di server, sehingga perubahan lokal yang belum disinkronkan akan hilang. Pengguna harus memahami implikasi ini dan melakukan pencadangan manual jika diperlukan.

## 6. Strategi Sinkronisasi Data (PWA)

Sistem PWA mengadopsi model sinkronisasi yang canggih untuk memberikan fleksibilitas dan kontrol kepada pengguna, sekaligus memastikan integritas data. Ada tiga proses utama yang perlu dibedakan:

### 6.1. Upload Perubahan Lokal (Proses Latar Belakang Otomatis)

Proses ini bertanggung jawab untuk **mengirim** data dari PWA ke server.

- **Pemicu:** Proses ini berjalan secara otomatis di latar belakang oleh `SyncEngine` setiap kali perangkat online.
- **Apa yang Dikirim:** `SyncEngine` akan memproses antrean (`sync_queue`) yang berisi semua aksi yang dilakukan pengguna secara offline, seperti:
  - Data kuesioner dari `Assignment` yang baru saja di-**Submit** oleh PPL.
  - Keputusan `Approve` atau `Reject` yang dilakukan oleh PML.
- **Tujuan:** Memastikan semua pekerjaan yang telah diselesaikan di lapangan terkirim ke server pusat tanpa perlu intervensi manual dari pengguna.

### 6.2. Sync Perubahan Assignment (Aksi Pengguna - Delta Download)

Ini adalah mode sinkronisasi utama yang akan sering digunakan oleh PPL dan PML untuk **mengunduh** pembaruan dari server.

- **Pemicu:** Aksi ini dipicu secara manual oleh pengguna melalui tombol "Sync Perubahan Assignment" di dasbor kegiatan.
- **Apa yang Diunduh:** PWA akan meminta semua perubahan yang terjadi di server sejak sinkronisasi terakhir. Ini mencakup:
  - **Assignment baru** yang ditugaskan kepada pengguna.
  - **Perubahan status** pada assignment yang ada (misalnya, dari `Submitted by PPL` menjadi `Rejected by PML`).
  - **Perubahan isian kuesioner** yang mungkin dilakukan oleh PML atau Admin (jika diizinkan oleh alur kerja).
- **Tujuan:** Memperbarui PWA dengan data terbaru dari server secara efisien, tanpa mengunduh ulang seluruh dataset. Hemat waktu dan kuota data.

### 6.3. Sync Full Assignment (Aksi Pengguna - Overwrite Download with Preservation)

Ini adalah mode sinkronisasi "darurat" atau "reset" yang digunakan dalam skenario khusus, dengan mekanisme pengaman untuk data yang baru dibuat secara lokal.

- **Pemicu:** Aksi ini dipicu secara manual oleh pengguna melalui tombol "Sync Full Assignment", yang akan menampilkan dialog konfirmasi tegas.
- **Apa yang Terjadi:**
  1.  **Preservasi Data Lokal Baru:** PWA pertama-tama akan mencari dan menyimpan sementara semua `Assignment` yang dibuat secara lokal dan belum pernah disinkronkan (misalnya, yang memiliki status `PENDING`).
  2.  **Pembersihan Data Lama:** PWA akan menghapus semua data `Assignment` dan `Assignment Response` lainnya untuk kegiatan yang sedang aktif dari database lokal (IndexedDB).
  3.  **Unduh Ulang Data Server:** PWA kemudian akan mengunduh ulang **seluruh** daftar assignment dan isiannya dari server.
  4.  **Re-integrasi Data Lokal:** Setelah unduhan dari server selesai, PWA akan menggabungkan kembali data `Assignment` baru yang telah disimpan sementara ke dalam daftar assignment yang sudah diperbarui.
- **Tujuan:** Menyelesaikan masalah data yang mungkin rusak atau tidak sinkron di PWA dengan cara menimpanya dengan versi data dari server, **sambil memastikan pekerjaan baru yang belum terkirim tidak hilang**.

### 6.4. Penghapusan Assignment Lokal oleh PPL

- **Tujuan:** Untuk memperbaiki kesalahan jika PPL secara tidak sengaja membuat `Assignment` baru.
- **Kewenangan:** Aksi ini hanya dapat dilakukan oleh pengguna dengan peran `PPL`.
- **Kondisi:** Sebuah `Assignment` hanya dapat dihapus jika memenuhi dua syarat: 1) Dibuat secara lokal oleh PPL, dan 2) Statusnya **belum** menjadi `Submitted by PPL`. Secara teknis, ini berlaku untuk `Assignment` dengan status lokal `PENDING`.
- **Mekanisme:** Aksi penghapusan diinisiasi melalui gestur geser (swipe action) pada baris `Assignment` di halaman `AssignmentListPage`.
- **Konfirmasi:** Sebelum proses penghapusan dieksekusi, sebuah dialog konfirmasi **wajib** ditampilkan untuk mencegah kehilangan data yang tidak disengaja.
- **Implikasi Teknis:** Aksi ini hanya menghapus data dari database lokal PWA (IndexedDB). Tidak ada interaksi dengan server yang diperlukan, karena `Assignment` tersebut belum pernah ada di backend.
