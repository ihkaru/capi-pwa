### **Spesifikasi Desain Database Lengkap (Versi Final)**

## 1. Ringkasan Eksekutif

Dokumen ini mendefinisikan struktur skema database lengkap untuk backend **Cerdas-SM (Survei Management)**, yang merupakan inti dari **Platform Cerdas**. Arsitektur ini dirancang untuk mendukung alur kerja multi-peran dalam lingkungan multi-tenant yang kompleks, di mana **`Satuan Kerja (Satker)`** berfungsi sebagai Tenant utama. Desain ini secara native mendukung kegiatan statistik berskala nasional yang melibatkan banyak Satker pelaksana.

Spesifikasi ini sepenuhnya terintegrasi dan dioptimalkan untuk:

- **Laravel 11+** sebagai kerangka kerja backend.
- **Filament v4** sebagai panel administrasi khusus peran administratif.
- **Filament Tenancy** untuk isolasi data yang ketat berbasis `Satker`.
- **`bezhanSalleh/filament-shield` v4** untuk manajemen peran dan izin yang dinamis dan kontekstual.

## 2. `app/Constants.php`

Sebuah kelas pusat untuk semua enum dan konstanta digunakan untuk memastikan konsistensi kode dan mencegah _magic strings_.

```php
<?php

namespace App;

class Constants
{
    // Nama Default untuk Roles (dikelola oleh Filament Shield)
    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_ADMIN_SATKER = 'admin_satker';
    public const ROLE_ADMIN_KEGIATAN = 'admin_kegiatan';
    public const ROLE_PML = 'PML';
    public const ROLE_PPL = 'PPL';

    // Status untuk Assignment Response
    public const STATUS_ASSIGNED = 'Assigned';
    public const STATUS_OPENED = 'Opened';
    public const STATUS_SUBMITTED_PPL = 'Submitted by PPL';
    public const STATUS_REJECTED_PML = 'Rejected by PML';
    public const STATUS_REJECTED_ADMIN = 'Rejected by Admin';
    public const STATUS_APPROVED_PML = 'Approved by PML';
    public const STATUS_APPROVED_ADMIN = 'Approved by Admin';

    public static function getResponseStatuses(): array
    {
        return [
            self::STATUS_ASSIGNED,
            self::STATUS_OPENED,
            self::STATUS_SUBMITTED_PPL,
            self::STATUS_REJECTED_PML,
            self::STATUS_REJECTED_ADMIN,
            self::STATUS_APPROVED_PML,
            self::STATUS_APPROVED_ADMIN,
        ];
    }
}
```

## 3. Skema Tabel Database

### 3.1. Tabel Tenancy, Pengguna, dan Peran

#### **`satkers` (Model Tenant)**

- **Model:** `App\Models\Satker`
- **Tujuan:** Menyimpan data Satuan Kerja. Bertindak sebagai Tenant utama dalam sistem.
- **Traits/Interfaces:** (Tidak ada, konfigurasi dilakukan di Panel Provider)
- **Columns:**

| Nama Kolom   | Tipe Data    | Kendala & Catatan                                     |
| :----------- | :----------- | :---------------------------------------------------- |
| `id`         | `uuid`       | Primary Key                                           |
| `name`       | `string`     | Nama lengkap Satker (e.g., "BPS Provinsi Jawa Barat") |
| `code`       | `string`     | Kode unik untuk Satker                                |
| `timestamps` | `timestamps` |                                                       |

#### **`users`**

- **Model:** `App\Models\User`
- **Tujuan:** Menyimpan akun pengguna individu. Setiap pengguna terafiliasi dengan satu Satker "induk".
- **Traits/Interfaces:** `use Spatie\Permission\Traits\HasRoles`
- **Columns:**

| Nama Kolom      | Tipe Data     | Kendala & Catatan                                                                                           |
| :-------------- | :------------ | :---------------------------------------------------------------------------------------------------------- |
| `id`            | `uuid`        | Primary Key                                                                                                 |
| `satker_id`     | `foreignUuid` | **`nullable`**. Terikat ke `satkers.id`. **Null untuk pengguna yang mendaftar mandiri dan belum direkrut.** |
| `name`          | `string`      | Nama lengkap pengguna.                                                                                      |
| `email`         | `string`      | `unique`.                                                                                                   |
| `password`      | `string`      | **`nullable`**. Menjadi null jika pengguna hanya login via Google.                                          |
| `google_id`     | `string`      | **`nullable`**, **`unique`**. ID unik dari provider OAuth (Google).                                         |
| `google_avatar` | `string`      | **`nullable`**. URL ke gambar avatar pengguna.                                                              |
| `timestamps`    | `timestamps`  |                                                                                                             |

> **Catatan Konseptual - Pengguna Mengambang (Floating Users):**
> Seorang `User` dapat ada di sistem dengan `satker_id` bernilai `NULL`. Ini terjadi ketika pengguna mendaftar mandiri melalui Google tetapi belum "direkrut" oleh admin_satker/Kegiatan manapun. Pengguna ini dapat login tetapi tidak memiliki akses ke data operasional apapun sampai mereka terafiliasi dengan sebuah Satker.

#### **Tabel yang Dibuat oleh `bezhanSalleh/filament-shield`**

- **Tabel:** `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`
- **Tujuan:** Dikelola sepenuhnya oleh paket Spatie/Shield untuk menangani sistem peran dan izin. Tidak perlu dibuat atau dimodifikasi secara manual.

### 3.2. Tabel Kegiatan & Keanggotaan

#### **`kegiatan_statistiks`**

- **Model:** `App\Models\KegiatanStatistik`
- **Tujuan:** Entitas global yang mendefinisikan sebuah proyek survei. Tidak terikat pada satu tenant, memungkinkan kegiatan berskala nasional.
- **Columns:**

| Nama Kolom          | Tipe Data    | Kendala & Catatan                                                      |
| :------------------ | :----------- | :--------------------------------------------------------------------- |
| `id`                | `uuid`       | Primary Key                                                            |
| `name`              | `string`     | Nama kegiatan (e.g., "Sensus Ekonomi 2026")                            |
| `year`              | `year`       | Tahun pelaksanaan                                                      |
| `start_date`        | `date`       | Tanggal mulai periode pendataan                                        |
| `end_date`          | `date`       | Tanggal selesai periode pendataan                                      |
| `extended_end_date` | `date`       | `nullable`                                                             |
| `form_schema`       | `json`       | Definisi lengkap formulir, termasuk validasi dan metadata `editableBy` |
| `form_version`      | `integer`    | `default(1)`. Dinaikkan setiap `form_schema` diperbarui                |
| `timestamps`        | `timestamps` |                                                                        |

#### Kendala & Catatan Tambahan:

#### Kendala & Catatan Tambahan:

Definisi lengkap formulir `form_schema`. **Skema ini juga harus berisi properti `masters_used` yang mendeklarasikan semua master data yang dibutuhkan oleh formulir ini**, menunjuk ke `type` dan `version` dari tabel `master_data`.

Selain itu, skema ini juga akan menyimpan konfigurasi untuk tampilan PWA agar sepenuhnya data-driven.

Contoh:

```json
{
  "masters_used": [
    { "type": "KBLI", "version": 2020 },
    { "type": "WILAYAH_INDONESIA", "version": 1 }
  ],
  "level_definitions": {
    "level_1_code": "Provinsi",
    "level_2_code": "Kabupaten/Kota",
    "level_3_code": "Kecamatan",
    "level_4_code": "Desa/Kelurahan",
    "level_5_code": "SLS",
    "level_6_code": "Sub-SLS"
  },
  "assignment_table_grouping_levels": [
    "level_5_code",
    "level_4_code",
    "level_3_code",
    "level_2_code"
  ],
  "assignment_table_columns": [
    {
      "key": "prefilled.nama_krt",
      "label": "Kepala Rumah Tangga",
      "type": "string",
      "default": true,
      "sortable": true,
      "filterable": true
    },
    {
      "key": "status",
      "label": "Status",
      "type": "status_lookup",
      "default": true,
      "sortable": true,
      "filterable": true
    },
    {
      "key": "responses.B1.R4",
      "label": "Jumlah ART",
      "type": "number",
      "default": false,
      "sortable": true,
      "filterable": true
    }
  ],
  "pages": [ ... ]
}
```

#### **`kegiatan_satkers` (Pivot)**

- **Model:** `App\Models\KegiatanSatker`
- **Tujuan:** Menghubungkan Kegiatan Statistik dengan Satker yang berpartisipasi (relasi many-to-many). Ini adalah dasar dari arsitektur multi-satker.
- **Columns:**

| Nama Kolom              | Tipe Data       | Kendala & Catatan                                      |
| :---------------------- | :-------------- | :----------------------------------------------------- |
| `id`                    | `bigIncrements` | Primary Key                                            |
| `kegiatan_statistik_id` | `foreignUuid`   | Terikat ke `kegiatan_statistiks.id`, `cascadeOnDelete` |
| `satker_id`             | `foreignUuid`   | Terikat ke `satkers.id`, `cascadeOnDelete`             |
| `timestamps`            | `timestamps`    |                                                        |

#### **`kegiatan_members` (Pivot)**

- **Model:** `App\Models\KegiatanMember`
- **Tujuan:** Menandakan partisipasi seorang pengguna dalam sebuah kegiatan. Peran (role) pengguna untuk kegiatan ini dikelola oleh Shield, bukan disimpan di sini.
- **Columns:**

| Nama Kolom              | Tipe Data       | Kendala & Catatan                                      |
| :---------------------- | :-------------- | :----------------------------------------------------- |
| `id`                    | `bigIncrements` | Primary Key                                            |
| `kegiatan_statistik_id` | `foreignUuid`   | Terikat ke `kegiatan_statistiks.id`, `cascadeOnDelete` |
| `user_id`               | `foreignUuid`   | Terikat ke `users.id`, `cascadeOnDelete`               |
| `timestamps`            | `timestamps`    |                                                        |

### **3.3. Konsep Kode Wilayah Berbasis Level (Konteks Penting)**

Untuk memastikan fleksibilitas sistem dalam menangani berbagai jenis survei (misalnya, survei rumah tangga, survei perusahaan, dll.), desain ini mengadopsi pendekatan abstrak untuk pengkodean wilayah. Alih-alih menggunakan nama kolom yang kaku seperti `province_code` atau `block_census_code`, sistem menggunakan hierarki generik: `level_1_code` hingga `level_6_code`.

- **Tujuan**: Untuk melepaskan keterikatan skema database dari struktur administrasi pemerintahan tertentu.
- **Konteks Umum**:
  - `level_1_code`: Biasanya merepresentasikan level tertinggi (e.g., Provinsi).
  - `level_2_code`: Level di bawahnya (e.g., Kabupaten/Kota).
  - `level_3_code`: Level di bawahnya (e.g., Kecamatan).
  - `level_4_code`: Level di bawahnya (e.g., Desa/Kelurahan).
  - `level_5_code`: Level unit pencacahan dasar (e.g., Satuan Lingkungan Setempat/SLS, Blok Sensus).
  - `level_6_code`: Level sub-unit dari level 5 (e.g., Sub-SLS, Sub-Blok Sensus).
- **Fleksibilitas**: Untuk survei yang tidak mengikuti struktur ini (misalnya, survei perusahaan di kawasan industri), level-level ini dapat dipetakan ke konsep yang berbeda tanpa mengubah skema database.
- **Sumber Data:** Validasi dan pemetaan kode ke nama wilayah dilakukan dengan merujuk pada tabel **`master_sls`**.
- **Fleksibilitas:**
  - Kolom `level_1_code` hingga `level_4_code` bersifat `nullable` untuk mengakomodasi penugasan yang tidak terikat lokasi administratif secara ketat.
  - Untuk unit pencacahan non-tradisional seperti **petak lahan pertanian**, `level_5_code` dan `level_6_code` dapat digunakan untuk menyimpan ID unik petak, sementara level di atasnya tetap diisi sesuai lokasi administratif lahan tersebut.

### 3.4. Tabel Data Operasional

#### **`assignments`**

- **Model:** `App\Models\Assignment`
- **Tujuan:** Tugas spesifik yang diberikan kepada PPL, di bawah pengawasan PML. Didefinisikan oleh hierarki wilayah kerja berbasis level.
- **Traits/Interfaces:** (Tidak ada, scoping ditangani otomatis oleh Filament)
- **Columns:**

| Nama Kolom              | Tipe Data     | Kendala & Catatan                                                                                          |
| :---------------------- | :------------ | :--------------------------------------------------------------------------------------------------------- |
| `id`                    | `uuid`        | Primary Key. Dihasilkan oleh klien (PWA) atau server.                                                      |
| `satker_id`             | `foreignUuid` | Terikat ke `satkers.id`.                                                                                   |
| `kegiatan_statistik_id` | `foreignUuid` | Terikat ke `kegiatan_statistiks.id`                                                                        |
| `ppl_id`                | `foreignUuid` | Terikat ke `users.id`.                                                                                     |
| `pml_id`                | `foreignUuid` | Terikat ke `users.id`.                                                                                     |
| `level_1_code`          | `string`      | `nullable`. Kode wilayah Level 1.                                                                          |
| `level_2_code`          | `string`      | `nullable`. Kode wilayah Level 2.                                                                          |
| `level_3_code`          | `string`      | `nullable`. Kode wilayah Level 3.                                                                          |
| `level_4_code`          | `string`      | `nullable`. Kode wilayah Level 4.                                                                          |
| `level_5_code`          | `string`      | `nullable`. Kode wilayah Level 5.                                                                          |
| `level_6_code`          | `string`      | `nullable`. Kode wilayah Level 6.                                                                          |
| `assignment_label`      | `string`      | Nama/label tugas yang mudah dibaca (e.g., "Rumah Tangga Budi", "PT Maju Jaya").                            |
| `prefilled_data`        | `json`        | `nullable`. Data pra-isi untuk diverifikasi/digunakan oleh petugas (e.g., `{"nama_krt": "Budi Santoso"}`). |
| `level_4_code_full`     | `string`      | `indexed`. Konkatenasi dari level 1-4. Untuk optimasi query/join.                                          |
| `level_6_code_full`     | `string`      | `nullable`, `indexed`. Konkatenasi dari level 1-6. Untuk optimasi query/join.                              |
| `timestamps`            | `timestamps`  |                                                                                                            |

- **Aturan Validasi Penting (Application-Level):**
- Saat membuat atau mengubah `Assignment`, sistem **wajib** memvalidasi bahwa `User` yang di-set sebagai `ppl_id` dan `pml_id` memiliki `satker_id` yang sama dengan `satker_id` dari `Assignment` itu sendiri.
- Saat membuat atau mengubah `Assignment`, sistem **wajib** melakukan validasi cakupan wilayah:
  1. Ambil `satker_id` dari `admin_kegiatan` yang sedang melakukan aksi.
  2. Ambil semua `wilayah_code_prefix` yang terasosiasi dengan `satker_id` tersebut dari tabel `satker_wilayah_tugas`.
  3. Pastikan `level_X_code_full` dari `Assignment` yang baru diawali dengan salah satu dari prefix yang diizinkan. Jika tidak, proses harus ditolak dengan pesan error.

#### **`assignment_attachments` (Baru)**

- **Model:** `App\Models\AssignmentAttachment`
- **Tujuan:** Menyimpan metadata untuk setiap file (foto, dokumen, dll.) yang diunggah dan terkait dengan sebuah assignment.
- **Columns:**

| Nama Kolom          | Tipe Data     | Kendala & Catatan                                          |
| :------------------ | :------------ | :--------------------------------------------------------- |
| `id`                | `uuid`        | Primary Key.                                               |
| `assignment_id`     | `foreignUuid` | Terikat ke `assignments.id`, `cascadeOnDelete`.            |
| `original_filename` | `string`      | Nama file asli saat diunggah oleh pengguna.                |
| `stored_path`       | `string`      | Path atau key unik file di layanan penyimpanan (e.g., S3). |
| `mime_type`         | `string`      | Tipe MIME dari file (e.g., 'image/jpeg').                  |
| `file_size_bytes`   | `integer`     | Ukuran file dalam bytes.                                   |
| `timestamps`        | `timestamps`  |                                                            |

#### **`assignment_responses`**

- **Model:** `App\Models\AssignmentResponse`
- **Tujuan:** Menyimpan data hasil wawancara yang dikumpulkan oleh PPL. Ini adalah entitas transaksional utama.
- **Columns:**

| Nama Kolom             | Tipe Data    | Kendala & Catatan                                                                             |
| :--------------------- | :----------- | :-------------------------------------------------------------------------------------------- |
| `assignment_id`        | `uuid`       | **Primary Key**. Sekaligus Foreign Key ke `assignments.id`, `cascadeOnDelete`.                |
| `status`               | `enum`       | Menggunakan nilai dari `Constants::getResponseStatuses()`                                     |
| `version`              | `integer`    | `default(1)`. Untuk _optimistic locking_ dengan PWA. Wajib diinkrementasi pada setiap update. |
| `form_version_used`    | `integer`    | Menyimpan versi form saat data diisi untuk keterlacakan.                                      |
| `responses`            | `json`       | `nullable`. Jawaban dari form dalam format `{"questionId": "answer"}`.                        |
| `submitted_by_ppl_at`  | `timestamp`  | `nullable`                                                                                    |
| `reviewed_by_pml_at`   | `timestamp`  | `nullable`                                                                                    |
| `reviewed_by_admin_at` | `timestamp`  | `nullable`                                                                                    |
| `timestamps`           | `timestamps` |                                                                                               |

#### **`response_histories` (Audit Trail)**

- **Model:** `App\Models\ResponseHistory`
- **Tujuan:** Mencatat setiap perubahan status pada `assignment_responses` untuk keterlacakan penuh dan akuntabilitas.
- **Columns:**

| Nama Kolom               | Tipe Data       | Kendala & Catatan                                                  |
| :----------------------- | :-------------- | :----------------------------------------------------------------- |
| `id`                     | `bigIncrements` | Primary Key                                                        |
| `assignment_response_id` | `foreignUuid`   | Terikat ke `assignment_responses.assignment_id`, `cascadeOnDelete` |
| `user_id`                | `foreignUuid`   | Terikat ke `users.id`. Pengguna yang melakukan aksi.               |
| `from_status`            | `string`        | `nullable`                                                         |
| `to_status`              | `string`        |                                                                    |
| `notes`                  | `text`          | `nullable`. Wajib diisi saat status adalah `Rejected...`.          |
| `created_at`             | `timestamp`     |                                                                    |

#### **`app_metadata` (Baru)**

- **Model:** (Tidak memerlukan model Eloquent, dikelola oleh PWA)
- **Tujuan:** Menyimpan data konfigurasi atau metadata sisi klien dalam format key-value yang persisten di IndexedDB. Contohnya, menyimpan timestamp sinkronisasi terakhir per kegiatan.
- **Columns:**

| Nama Kolom | Tipe Data | Kendala & Catatan                                     |
| :--------- | :-------- | :---------------------------------------------------- |
| `key`      | `string`  | Primary Key. Contoh: `lastSyncTimestamp_kegiatan_123` |
| `value`    | `any`     | Nilai yang disimpan (bisa string, number, object).    |

#### **`master_sls`**

- **Model:** `App\Models\MasterSls`
- **Tujuan:** Menyimpan data master hierarki wilayah administratif dari level provinsi hingga SLS/Sub-SLS. Tabel ini berfungsi sebagai sumber kebenaran (source of truth) untuk validasi kode wilayah dan menampilkan nama wilayah di antarmuka.
- **Columns:**

| Nama Kolom    | Tipe Data       | Kendala & Catatan   |
| :------------ | :-------------- | :------------------ |
| `id`          | `bigIncrements` | Primary Key         |
| `prov_id`     | `string`        | Kode Provinsi       |
| `kabkot_id`   | `string`        | Kode Kabupaten/Kota |
| `kec_id`      | `string`        | Kode Kecamatan      |
| `desa_kel_id` | `string`        | Kode Desa/Kelurahan |
| `sls_id`      | `string`        | Kode SLS/Sub-SLS    |
| `provinsi`    | `string`        | Nama Provinsi       |
| `kabkot`      | `string`        | Nama Kabupaten/Kota |
| `kecamatan`   | `string`        | Nama Kecamatan      |
| `desa_kel`    | `string`        | Nama Desa/Kelurahan |
| `nama`        | `string`        | Nama SLS/Sub-SLS    |
| `timestamps`  | `timestamps`    |                     |

#### **`master_data` (Final)**

- **Model:** `App\Models\MasterData`
- **Tujuan:** Berfungsi sebagai _document store_ untuk mengelola dataset master yang besar dan kompleks (seperti KBLI) sebagai satu unit yang utuh dan berversi. Pendekatan ini memprioritaskan kesederhanaan manajemen dan integritas dataset. **Seluruh logika pencarian dan pemfilteran pada data ini terjadi di sisi klien (PWA).**
- **Columns:**

| Nama Kolom    | Tipe Data        | Kendala & Catatan                                                                             |
| :------------ | :--------------- | :-------------------------------------------------------------------------------------------- |
| `id`          | `bigIncreaments` | Primary Key                                                                                   |
| `type`        | `string`         | Tipe/kategori master data (e.g., 'KBLI', 'WILAYAH_INDONESIA').                                |
| `version`     | `integer`        | Versi dari master data ini (e.g., 2020).                                                      |
| `description` | `string`         | `nullable`. Deskripsi singkat (e.g., "Klasifikasi Baku Lapangan Usaha Indonesia 2020").       |
| `data`        | `json`           | **Penting.** Seluruh dataset master dalam format JSON yang berisi struktur hierarkis lengkap. |
| `is_active`   | `boolean`        | `default(true)`. Menandakan apakah versi ini yang aktif digunakan untuk `type` ini.           |
| `timestamps`  | `timestamps`     |                                                                                               |

- **Kendala Unik (Unique Constraint):** Kombinasi `(type, version)` harus unik untuk memastikan tidak ada duplikasi versi pada tipe master data yang sama.

#### **`satker_wilayah_tugas` (BARU)**

- **Model:** `App\Models\SatkerWilayahTugas`
- **Tujuan:** Memetakan setiap Satker ke satu atau lebih prefix kode wilayah yang menjadi tanggung jawabnya. Ini adalah tabel aturan bisnis inti untuk validasi cakupan wilayah.
- **Columns:**

  | Nama Kolom            | Tipe Data       | Kendala & Catatan                                                               |
  | :-------------------- | :-------------- | :------------------------------------------------------------------------------ |
  | `id`                  | `bigIncrements` | Primary Key                                                                     |
  | `satker_id`           | `foreignUuid`   | Terikat ke `satkers.id`, `cascadeOnDelete`.                                     |
  | `wilayah_level`       | `integer`       | Level wilayah yang menjadi basis (1=Prov, 2=Kab/Kota, 3=Kec, dst.).             |
  | `wilayah_code_prefix` | `string`        | Prefix kode wilayah. Contoh: '61' untuk Prov Kalbar, '6102' untuk Kab Mempawah. |
  | `timestamps`          | `timestamps`    |                                                                                 |

**Contoh Isi Tabel `satker_wilayah_tugas`:**

| satker_id                 | wilayah_level | wilayah_code_prefix | Deskripsi                                                                              |
| :------------------------ | :------------ | :------------------ | :------------------------------------------------------------------------------------- |
| (ID Satker Kab. Mempawah) | 2             | `6102`              | Satker Kab. Mempawah bertanggung jawab atas semua wilayah yang kodenya diawali '6102'. |
| (ID Satker Prov. Kalbar)  | 1             | `61`                | Satker Prov. Kalbar bertanggung jawab atas semua wilayah yang kodenya diawali '61'.    |
| (ID Satker BPS Pusat)     | 0             | `*`                 | Satker Pusat (jika ada) bisa mengakses semua wilayah (wildcard).                       |
