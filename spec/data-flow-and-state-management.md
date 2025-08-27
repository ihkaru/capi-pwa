# Alur Data Aplikasi & Pola State Management

Dokumen ini menjelaskan alur data utama dalam aplikasi Cerdas CAPI PWA dan prinsip-prinsip dasar yang digunakan dalam manajemen state (Pinia) dan interaksi data (online/offline).

## Prinsip Desain Utama

Arsitektur frontend aplikasi ini dibangun di atas tiga prinsip utama:

1.  **Offline-First (Utamakan Offline):** UI tidak pernah menunggu jaringan secara langsung. Aplikasi selalu memuat data dari database lokal (IndexedDB via Dexie.js) terlebih dahulu untuk memberikan tampilan yang instan. Sinkronisasi dengan server terjadi di latar belakang, dan UI akan diperbarui setelahnya. Ini penting untuk aplikasi survei lapangan yang mungkin kehilangan koneksi.
2.  **State-Driven UI (UI Digerakkan oleh State):** Komponen Vue (`.vue` files) dibuat "bodoh". Mereka tidak mengelola data yang kompleks. Tugas mereka adalah menampilkan data yang ada di Pinia `stores` dan memanggil `actions` di store tersebut ketika pengguna melakukan sesuatu.
3.  **Pemisahan Tanggung Jawab (Separation of Concerns):**
    *   **Components (Views):** Hanya untuk menampilkan data dan menangkap input pengguna.
    *   **Stores (Pinia):** Pusat logika bisnis. Mengelola state aplikasi, berinteraksi dengan database lokal, dan memanggil `ApiClient` untuk komunikasi jaringan.
    *   **ApiClient:** Satu-satunya bagian yang "berbicara" dengan API backend. Mengelola detail HTTP, token, dan endpoint.

---

## Tiga Store Utama (Pusat Logika)

Aplikasi ini memiliki tiga store utama yang bekerja sama:

### 1. `authStore` (Manajer Otentikasi)
- **Tanggung Jawab Tunggal:** Mengelola identitas pengguna yang sedang login.
- **Analogi:** Petugas keamanan yang memegang kartu identitas Anda.
- **Kapan Digunakan:** Saat login, logout, dan untuk memeriksa apakah pengguna memiliki hak akses di seluruh aplikasi.

### 2. `activityStore` (Manajer Daftar Kegiatan)
- **Tanggung Jawab Tunggal:** Mengelola daftar kegiatan/proyek yang ditugaskan kepada pengguna.
- **Analogi:** Manajer proyek yang memberikan daftar pekerjaan Anda.
- **Kapan Digunakan:** Di `HomePage` untuk menampilkan daftar kegiatan yang bisa dipilih pengguna.

### 3. `dashboardStore` (Manajer Data Aktif & Offline)
- **Tanggung Jawab Tunggal:** Mengelola SEMUA data detail untuk **satu kegiatan yang sedang aktif dibuka**. Ini adalah store yang paling sibuk dan menjadi inti dari fungsionalitas offline.
- **Analogi:** Meja kerja Anda. Saat Anda memilih satu proyek, semua dokumen terkait proyek itu diletakkan di atas meja ini.
- **Kapan Digunakan:** Di `ActivityDashboardPage` dan semua halaman setelahnya (`AssignmentGroupPage`, dll.) untuk menampilkan, mengelola, dan menyinkronkan data penugasan, kuesioner, dan data master.

---

## Alur Perjalanan Pengguna (User Journey)

Berikut adalah alur data langkah demi langkah dari login hingga melihat detail pekerjaan.

**Langkah 1: `LoginPage`**
- **Pemicu:** Pengguna memasukkan kredensial dan menekan "Login".
- **Interaksi Store:** Memanggil `authStore.setAuthState(token, user)`.
- **Sumber Data:** **API Server**. Halaman ini melakukan panggilan jaringan untuk otentikasi.
- **Data Kunci yang Dihasilkan:** `token` dan `user` yang disimpan di `authStore`.

**Langkah 2: `HomePage`**
- **Pemicu:** Navigasi otomatis setelah login berhasil.
- **Interaksi Store:** Memanggil `activityStore.fetchActivities()`.
- **Sumber Data:** **API Server**, kemudian hasilnya disimpan ke **Database Lokal (IndexedDB)**.
- **Data Kunci yang Diteruskan:** Pengguna memilih sebuah kegiatan, dan **`activityId`** dari kegiatan tersebut diteruskan ke halaman berikutnya melalui URL.

**Langkah 3: `ActivityDashboardPage`**
- **Pemicu:** Pengguna mengklik sebuah kegiatan di `HomePage`.
- **Interaksi Store:**
    1.  Memanggil `dashboardStore.loadDashboardData(activityId)` untuk memuat data cepat.
    2.  Memanggil `dashboardStore.syncActivityData(activityId)` untuk sinkronisasi di latar belakang.
- **Sumber Data:**
    1.  **Database Lokal** (untuk tampilan instan).
    2.  **API Server** (untuk sinkronisasi).
- **Data Kunci yang Diteruskan:** **`activityId`** yang sama diteruskan lagi ke halaman berikutnya.

**Langkah 4: `AssignmentGroupPage` (dan halaman detail lainnya)**
- **Pemicu:** Pengguna mengklik tombol "Lihat Detail Per Wilayah".
- **Interaksi Store:** Tidak ada `action` yang dipanggil. Komponen ini hanya **membaca state** dari `dashboardStore`.
- **Sumber Data:** **Hanya dari State `dashboardStore`** yang sudah diisi oleh halaman sebelumnya. Tidak ada interaksi jaringan atau database lokal di sini (kecuali halaman di-refresh).
- **Data Kunci:** Tidak ada data kunci baru, karena semua data yang relevan sudah ada di `dashboardStore`.
