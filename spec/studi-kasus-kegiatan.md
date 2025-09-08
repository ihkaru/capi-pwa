### **Spesifikasi Studi Kasus: Implementasi Kegiatan Statistik (Regsosek 2022)**

## 1. Pendahuluan

Dokumen ini berfungsi sebagai **spesifikasi fungsional dan rujukan utama (blueprint)** untuk pengembangan fitur-fitur inti dalam **Platform Cerdas**. Dengan memodelkan kegiatan **Registrasi Sosial Ekonomi (Regsosek) 2022**, dokumen ini menguraikan persyaratan fungsional, skenario operasional, dan kapabilitas yang harus dimiliki oleh Platform Cerdas untuk dapat mengakomodasi kegiatan statistik modern yang kompleks.

Dokumen ini secara spesifik menguraikan bagaimana Platform Cerdas harus menangani kegiatan multi-tahap yang saling bergantung:

1.  **Tahap 1: Listing (Pencacahan Awal)**: Menggunakan kuesioner ringkas untuk mendaftar semua keluarga, dilengkapi dengan bukti geotagging dan foto.
2.  **Tahap 2: Pendataan (Pendataan Detail)**: Menggunakan kuesioner komprehensif untuk mengumpulkan data sosial-ekonomi dari keluarga yang telah terdaftar.

Setiap persyaratan yang diuraikan di sini harus menjadi acuan dalam pembuatan _user stories_, desain teknis, dan pengujian fitur di **Cerdas Mobile (PWA)** dan **Cerdas-SM (Backend)**.

Studi kasus ini akan menguraikan bagaimana kedua tahapan tersebut dimodelkan sebagai dua entitas `Kegiatan Statistik` yang terpisah namun saling berhubungan, dan bagaimana Platform Cerdas harus mampu mengakomodasi dua jenis kuesioner yang berbeda secara fundamental.

## 2. Atribut Umum Kegiatan Statistik

Setiap kegiatan statistik, terlepas dari jenisnya, akan memiliki serangkaian atribut dasar yang mendefinisikannya. Berikut adalah pemetaan atribut-atribut ini menggunakan Regsosek 2022 sebagai contoh.

| Atribut              | Deskripsi / Contoh (Regsosek 2022)                                                                                                                                                                                        | Implikasi Teknis di Platform Cerdas                                                                                                                                                                            |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nama Kegiatan**    | Registrasi Sosial Ekonomi 2022                                                                                                                                                                                            | Dicatat di `kegiatan_statistiks.name`. Akan ada dua record: `REGSOSEK 2022 - LISTING` dan `REGSOSEK 2022 - PENDATAAN`.                                                                                         |
| **Tahun**            | 2022                                                                                                                                                                                                                      | Dicatat di `kegiatan_statistiks.year`.                                                                                                                                                                         |
| **Deskripsi**        | Pendataan seluruh penduduk Indonesia untuk membangun basis data sosial ekonomi tunggal yang akan digunakan untuk program perlindungan sosial dan pemberdayaan masyarakat.                                                 | Dicatat di kolom deskripsi (jika ada) atau sebagai bagian dari dokumentasi internal.                                                                                                                           |
| **Metodologi**       | Wawancara tatap muka dari rumah ke rumah (door-to-door) menggunakan metode **CAPI (Computer-Assisted Personal Interviewing)**.                                                                                            | Platform Cerdas secara native mendukung ini melalui **Cerdas Mobile (PWA)**.                                                                                                                                   |
| **Cakupan**          | **Sensus** (pencacahan lengkap/full enumeration) seluruh penduduk di wilayah Indonesia.                                                                                                                                   | Sistem harus mampu menangani volume data yang sangat besar. Skalabilitas backend dan efisiensi database lokal (DexieJS) menjadi krusial.                                                                       |
| **Unit Observasi**   | **Keluarga** atau **Rumah Tangga**.                                                                                                                                                                                       | Satu `Assignment` dapat merepresentasikan satu unit observasi (misalnya, satu rumah tangga target), atau satu wilayah kerja kecil (misalnya, satu SLS) di mana PPL akan mengidentifikasi semua unit observasi. |
| **Unit Analisis**    | **Keluarga** dan **Individu** (anggota keluarga).                                                                                                                                                                         | Data `responses` dalam `assignment_responses` akan berisi struktur data (misalnya, roster) untuk menampung informasi per individu dalam satu keluarga.                                                         |
| **Periode Lapangan** | Oktober - November 2022                                                                                                                                                                                                   | Dicatat di `kegiatan_statistiks.start_date` dan `end_date`.                                                                                                                                                    |
| **Indikator Utama**  | Terwujudnya "Satu Data" program perlindungan sosial, data target untuk program pemerintah (seperti PKH, BLT), kondisi perumahan, sanitasi, tingkat pendidikan, ketenagakerjaan, kepemilikan aset, dan demografi penduduk. | `form_schema` harus dirancang untuk dapat menangkap semua variabel yang dibutuhkan untuk menghasilkan indikator-indikator ini.                                                                                 |

## 3. Fase 1: Kegiatan `REGSOSEK 2022 - LISTING`

Ini adalah tahap pertama yang dimodelkan sebagai `Kegiatan Statistik` mandiri di dalam sistem. Kuesioner untuk fase ini bersifat ringkas dan fokus pada identifikasi.

### 3.1. Tujuan Spesifik

- Mengidentifikasi dan mendaftar semua bangunan, rumah tangga, dan keluarga yang ada di dalam satu Satuan Lingkungan Setempat (SLS).
- Mengumpulkan informasi dasar untuk setiap keluarga.
- Merekam koordinat geografis (**geotag**) dan mengambil **foto depan** setiap bangunan tempat tinggal untuk verifikasi dan pemetaan.
- Menghasilkan _prelist_ atau kerangka kerja yang valid, lengkap, dan terverifikasi secara spasial untuk digunakan pada fase pendataan detail.

### 3.2. Alur Kerja di Platform Cerdas

1.  **Persiapan (Admin Kegiatan di Filament):**

    - `admin_kegiatan` membuat `Kegiatan Statistik` **"REGSOSEK 2022 - LISTING"**.
    - Sebuah `form_schema` (kuesioner) yang spesifik untuk Listing dikembangkan dan diunggah ke dalam kegiatan ini. Secara konseptual, kuesioner ini harus mampu menangkap beberapa blok informasi kunci:
      - **Informasi Identitas Keluarga:** Variabel untuk nama Kepala Keluarga, alamat, dan jumlah anggota keluarga.
      - **Informasi Geospasial:** Sebuah field dengan tipe khusus "geotag" yang memungkinkan PWA mengakses GPS perangkat.
      - **Informasi Visual:** Sebuah field dengan tipe khusus "foto" yang memungkinkan PWA mengakses kamera perangkat.

2.  **Pelaksanaan (PPL di Cerdas Mobile):**

    - PPL mengunduh `Assignment` yang merepresentasikan satu wilayah SLS.
    - Untuk setiap keluarga yang ditemui, PPL membuat entri data baru.
    - **Pengambilan Geotag:** Saat PPL berinteraksi dengan field geotag, PWA akan mengambil data `latitude`, `longitude`, dan `accuracy` dari perangkat.
    - **Pengambilan Foto:** Saat PPL berinteraksi dengan field foto, PWA akan membuka kamera. Setelah foto diambil dan dioptimalkan, PWA akan menanganinya untuk sinkronisasi.
    - **Proses Sinkronisasi Foto:** Proses `SyncEngine` harus cerdas. Ia akan mengunggah file foto ke endpoint media khusus. Server akan menyimpan file tersebut dan mengembalikan sebuah ID unik. `SyncEngine` kemudian akan memperbarui data respons dengan ID referensi ini. Hasilnya, `responses` akan menyimpan _referensi unik_ (misalnya, sebuah ID) ke file foto yang telah diunggah, bukan file foto itu sendiri. (Lihat `AssignmentPhotoController`)

3.  **Output & Hasil Akhir:**
    - Hasil dari fase Listing adalah `assignment_responses` yang bersih dan tervalidasi, di mana setiap record berisi data identitas keluarga, objek koordinat geospasial, dan ID referensi ke file foto.

## 4. Fase 2: Kegiatan `REGSOSEK 2022 - PENDATAAN`

Ini adalah tahap pendataan detail yang memanfaatkan output kaya dari fase pertama dan menggunakan kuesioner yang jauh lebih komprehensif.

### 4.1. Tujuan Spesifik

- Melakukan wawancara mendalam dengan setiap keluarga yang telah terdaftar pada fase Listing.
- Mengumpulkan data sosial dan ekonomi yang komprehensif untuk menghasilkan indikator-indikator pembangunan.

### 4.2. Alur Kerja di Platform Cerdas

1.  **Persiapan (Admin Kegiatan di Filament):**

    - `admin_kegiatan` membuat `Kegiatan Statistik` **"REGSOSEK 2022 - PENDATAAN"**.
    - `form_schema` (kuesioner) yang **sangat detail dan kompleks** untuk pendataan dikembangkan dan diunggah ke dalam kegiatan ini. Kuesioner ini akan mencakup semua variabel yang dijabarkan di bagian 4.3.
    - `admin_kegiatan` menggunakan fitur **"Generate Assignment dari Hasil Kegiatan Lain"**, memilih "REGSOSEK 2022 - LISTING" sebagai sumber.
    - Sistem secara otomatis membuat `Assignment` baru untuk setiap keluarga, dan mengisi `prefilled_data` dengan output dari fase Listing (`nama_krt`, `alamat`, `geotag`, dan `foto_rumah_id`).

2.  **Pelaksanaan (PPL di Cerdas Mobile):**
    - Saat PPL membuka sebuah tugas, PWA akan menampilkan data `prefilled_data` sebagai informasi referensi yang tidak bisa diubah, termasuk menampilkan foto rumah untuk verifikasi.
    - Di bawahnya, PWA akan merender antarmuka kuesioner yang kompleks berdasarkan `form_schema` pendataan untuk diisi oleh PPL.

### 4.3. Detail Variabel dan Pemetaan Indikator (High-Level)

Kuesioner untuk fase pendataan harus dirancang untuk menangkap variabel-variabel berikut, yang secara langsung memetakan ke indikator kunci yang dibutuhkan pemerintah.

| Blok Kuesioner                   | Variabel Kunci yang Dikumpulkan                                                                                                       | Contoh Pertanyaan / Data                                                                                             | Indikator yang Dihasilkan                                                                                                                                       |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Kependudukan & Demografi**  | `nik`, `nama`, `tgl_lahir`, `jenis_kelamin`, `status_perkawinan`, `kepemilikan_kartu_identitas`                                       | (Roster per ART) NIK, nama lengkap, hubungan dengan KRT, status perkawinan.                                          | - Struktur umur penduduk<br>- Angka ketergantungan (dependency ratio)<br>- Cakupan kepemilikan dokumen kependudukan                                             |
| **II. Perumahan & Sanitasi**     | `status_kepemilikan_bangunan`, `luas_lantai`, `jenis_dinding`, `jenis_atap`, `sumber_air_minum`, `fasilitas_bab`, `sumber_penerangan` | Status: Milik Sendiri/Sewa. Luas: m². Sumber air: Ledeng/Sumur. Fasilitas BAB: Sendiri/Bersama.                      | - **Akses terhadap Perumahan Layak**<br>- **Akses terhadap Air Minum Layak**<br>- **Akses terhadap Sanitasi Layak**<br>- Persentase rumah tangga dengan listrik |
| **III. Pendidikan**              | `partisipasi_sekolah`, `jenjang_pendidikan`, `ijazah_tertinggi`                                                                       | (Roster per ART) Apakah masih sekolah? Jenjang saat ini. Ijazah tertinggi yang dimiliki.                             | - Angka Partisipasi Sekolah (APS)<br>- Rata-rata Lama Sekolah (RLS)<br>- Tingkat Pendidikan Penduduk                                                            |
| **IV. Kesehatan & Disabilitas**  | `keluhan_kesehatan`, `status_gizi_balita` (jika ada), `jenis_disabilitas`                                                             | (Roster per ART) Riwayat penyakit kronis. Jenis kesulitan yang dialami (melihat, mendengar, dll.).                   | - Profil kesehatan penduduk<br>- Prevalensi disabilitas<br>- Data awal untuk identifikasi risiko stunting                                                       |
| **V. Ketenagakerjaan**           | `status_bekerja`, `lapangan_usaha`, `jabatan_pekerjaan`, `status_kepemilikan_usaha`                                                   | (Roster per ART >15th) Apakah bekerja seminggu terakhir? Sektor (Pertanian, Jasa). Status (Karyawan, Wiraswasta).    | - Tingkat Partisipasi Angkatan Kerja (TPAK)<br>- **Profil Ketenagakerjaan** (formal/informal)<br>- Distribusi tenaga kerja per sektor                           |
| **VI. Aset & Kepemilikan Usaha** | `kepemilikan_lahan`, `jumlah_ternak`, `kepemilikan_kendaraan`, `kepemilikan_aset_elektronik`, `akses_kredit_usaha`                    | Apakah memiliki lahan pertanian? Jumlah sapi. Punya motor/mobil? Punya kulkas/TV? Apakah pernah mendapat KUR?        | - **Profil Ekonomi & Tingkat Kesejahteraan**<br>- Indeks Kepemilikan Aset (proxy pendapatan)<br>- Akses terhadap layanan keuangan                               |
| **VII. Perlindungan Sosial**     | `penerimaan_pkh`, `penerimaan_bpnt`, `penerimaan_blt`, `kepesertaan_bpjs`                                                             | (Per Keluarga & ART) Apakah menerima bantuan PKH dalam 3 bulan terakhir? Apakah terdaftar sebagai penerima PBI BPJS? | - **Cakupan Program Perlindungan Sosial**<br>- Analisis inklusi/eksklusi error program bantuan                                                                  |

## 5. Skenario Operasional Kunci dan Implikasinya

Kegiatan lapangan tidak pernah berjalan mulus sepenuhnya. Platform Cerdas harus dirancang untuk menangani anomali dan skenario dunia nyata secara elegan. Berikut adalah beberapa skenario kunci dan implikasi fitur yang wajib ada:

### Skenario A: Penambahan Unit Observasi Baru di Lapangan (Saat Listing)

- **Situasi:** Seorang PPL sedang melakukan listing di sebuah SLS. Ia menemukan sebuah rumah baru yang dihuni oleh satu keluarga yang belum pernah terdata sebelumnya.
- **Implikasi Fitur untuk Cerdas Mobile (PWA) & Cerdas-SM (Backend):**
  - PWA harus menyediakan fitur "Tambah Keluarga Baru" (atau "Tambah Assignment Baru") di halaman daftar tugas (`AssignmentListPage`).
  - Saat PPL memulai, sebuah `Assignment` baru dibuat secara lokal dengan label awal, misalnya, "Penugasan Baru".
  - `form_schema` untuk kegiatan Listing ini akan memiliki `assignment_label_template` yang dikonfigurasi, contohnya: `"{nama_krt} - (No. Urut Bangunan: {no_urut_bangunan})"`.
  - Saat PPL mengisi formulir dan mengetik nama kepala keluarga (misalnya, "Budi Santoso") dan nomor urut bangunan (misalnya, "15"), PWA akan **secara dinamis memperbarui label assignment tersebut secara real-time**.
  - Di daftar tugas, PPL akan melihat label berubah dari "Penugasan Baru" menjadi "Budi Santoso - (No. Urut Bangunan: 15)".
  - Implementasi teknis yang lebih detail untuk alur kerja ini, termasuk penanganan data offline dan sinkronisasi, dijelaskan dalam dokumen terpisah: **`ppl-new-assignment-creation.md`**.

### Skenario B: Penanganan Unit Observasi Tidak Ditemukan (Saat Pendataan)

- **Situasi:** Seorang PPL ditugaskan untuk mendata keluarga "Budi Santoso" pada fase Pendataan. `prefilled_data` sudah ada dari hasil Listing. Namun, saat di lapangan, ternyata keluarga tersebut sudah pindah.
- **Implikasi Fitur untuk Cerdas Mobile (PWA):**
  - Formulir pendataan **wajib memiliki opsi untuk menandai status akhir dari kunjungan**. Ini bukan sekadar `Approve/Reject` oleh PML, melainkan hasil temuan PPL.
  - Pilihan status harus jelas, misalnya: `Selesai Dicacah`, `Responden Menolak`, `Keluarga Pindah`, `Rumah Kosong`, `Tidak Ditemukan`.
  - Jika PPL memilih status selain `Selesai Dicacah`, sisa kuesioner harus dinonaktifkan, dan PPL mungkin diwajibkan mengisi kolom catatan.
- **Implikasi Fitur untuk Cerdas-SM (Backend):**
  - Tabel `assignment_responses` perlu mengakomodasi status-status final dari lapangan ini untuk membedakannya dari alur kerja pemeriksaan PPL-PML.

### Skenario C: Koreksi Informasi Kunci

- **Situasi:** Pada `prefilled_data`, nama kepala keluarga tertulis "Budi Santoso". Saat wawancara, PPL mengetahui bahwa nama yang benar di KTP adalah "Budi Santosa".
- **Implikasi Fitur untuk Platform Cerdas:**
  - `prefilled_data` yang ditampilkan di PWA harus bersifat **read-only** untuk menjaga integritas data asli dari Listing.
  - Namun, `form_schema` untuk Pendataan **harus dirancang untuk memiliki field verifikasi/koreksi**. Contohnya: "Nama Kepala Keluarga (sesuai prelist): Budi Santoso" (read-only), diikuti field isian "Nama Kepala Keluarga (hasil verifikasi): [input teks]".
  - Dengan demikian, sistem menyimpan baik data asli maupun data yang telah dikoreksi, yang sangat penting untuk analisis kualitas data di kemudian hari.

## 6. Fase Pasca-Lapangan: Pemantauan dan Ekspor Data

Setelah data terkumpul dan divalidasi, nilainya terletak pada kemudahan akses dan analisis.

- **Pemantauan Progres (Monitoring):**

  - **Implikasi Fitur untuk Cerdas-SM (Filament):** Panel admin **wajib memiliki dasbor pemantauan** untuk `admin_kegiatan`. Dasbor ini harus menampilkan statistik agregat secara _real-time_ atau mendekati _real-time_, seperti:
    - Jumlah `Assignment` berdasarkan status (Assigned, Submitted by PPL, Approved by PML, dll.).
    - Progres per PPL/PML atau per wilayah.
    - Distribusi status akhir lapangan (berapa banyak yang menolak, pindah, dll.).
    - Tampilan peta (opsional/lanjutan) yang memvisualisasikan geotag yang telah dikumpulkan.

- **Ekspor Data:**
  - **Implikasi Fitur untuk Cerdas-SM (Filament):** Platform **wajib menyediakan modul ekspor data yang fleksibel**.
  - Admin harus dapat mengunduh data `assignment_responses` yang sudah bersih (misalnya, yang berstatus `Approved by Admin`).
  - Opsi ekspor minimal harus mencakup format **CSV** dan **Excel**.
  - Fitur ekspor harus memungkinkan admin untuk memilih kolom mana yang akan disertakan, dan idealnya dapat menangani data relasional (misalnya, data roster individu diekspor ke file terpisah yang dapat di-join dengan data keluarga).

## 7. Ringkasan: Fitur Kunci Platform Cerdas yang Wajib Dikembangkan

Berdasarkan studi kasus ini, berikut adalah daftar fitur non-negosiabel yang harus menjadi fokus pengembangan Platform Cerdas:

1.  **Manajemen Kegiatan Multi-Fase:** Kemampuan untuk membuat kegiatan yang output-nya menjadi input bagi kegiatan lain.
2.  **Generator Assignment dari Kegiatan Sebelumnya:** Alat di panel admin untuk membuat `Assignment` secara massal dari hasil kegiatan yang sudah selesai.
3.  **Dukungan Tipe Input Lanjutan:** Kapabilitas `form_schema` dan PWA untuk menangani **Geotag (GPS)** dan **Foto (Kamera)** secara _native_.
4.  **Mekanisme `prefilled_data`:** Kemampuan untuk menyuntikkan data dari sumber sebelumnya ke dalam `Assignment` baru sebagai informasi referensi.
5.  **Kemampuan PPL Menambah Entitas Baru di Lapangan:** Fitur bagi petugas untuk membuat record baru "on-the-fly" di dalam `Assignment` yang berbasis wilayah.
6.  **Manajemen Status Final Lapangan:** Mekanisme bagi PPL untuk memberi label pada `Assignment` dengan hasil akhir kunjungan (misalnya, 'Tidak Ditemukan', 'Menolak').
7.  **Dasbor Pemantauan Progres Real-time:** Antarmuka visual bagi admin untuk melacak kemajuan dan kualitas data selama periode lapangan.
8.  **Modul Ekspor Data Fleksibel:** Kemampuan untuk mengunduh data bersih dalam format standar (CSV, Excel) untuk analisis lebih lanjut.
