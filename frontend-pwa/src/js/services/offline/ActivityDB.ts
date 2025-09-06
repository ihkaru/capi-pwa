import Dexie, { Table } from 'dexie';

// --- INTERFACES (Satu set definisi yang lengkap) ---

export interface Activity {
  id: string;
  user_id: string; // ID pengguna yang memiliki data ini
  name: string;
  year: number;
  user_role: 'PPL' | 'PML';
  status: string;
  start_date: string;
  end_date: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  activity_id: string; // Foreign key ke Activity
  ppl_id: string;
  pml_id: string;
  assignment_label: string;
  prefilled_data: any; // Data JSON
  status?: string; // Status sekarang menjadi bagian dari assignment
}

export interface AssignmentResponse {
  assignment_id: string; // Primary key & foreign key ke Assignment
  user_id: string;
  status: string;
  version: number;
  form_version_used: number;
  responses: any; // Data JSON
  submitted_by_ppl_at?: string;
  reviewed_by_pml_at?: string;
  reviewed_by_admin_at?: string;
}

export interface FormSchema {
  activity_id: string; // Primary key & foreign key ke Activity
  user_id: string;
  schema: any; // Skema form dalam format JSON
}

export interface MasterData {
  activity_id: string; // Foreign key ke Activity
  user_id: string;
  type: string; // Contoh: 'KBLI', 'WILAYAH_INDONESIA'
  version: number;
  data: any; // Data master dalam format JSON
}

export interface SyncQueueItem {
  id?: number; // Primary key, auto-increment
  user_id: string;
  type: 'submitAssignment' | 'approveAssignment' | 'rejectAssignment' | 'uploadPhoto';
  payload: any; // Data yang akan disinkronkan
  timestamp: string; // Waktu item ditambahkan
  status: 'pending' | 'processing' | 'failed';
  error?: string; // Pesan error jika sinkronisasi gagal
  retries?: number; // Jumlah percobaan ulang
}

export interface ResponseHistory {
  id?: number; // Primary key, auto-increment
  assignment_response_id: string;
  user_id: string; // ID pengguna yang melakukan aksi
  from_status?: string;
  to_status: string;
  notes?: string;
  created_at: string;
}

export interface MasterSls {
  id: number;
  sls_id: string;
  nama: string;
  // tambahkan kolom lain jika perlu untuk ditampilkan di UI
}

// --- DEFINISI KELAS DATABASE (Hanya satu kali) ---

export class ActivityDB extends Dexie {
  // Deklarasi properti untuk setiap tabel
  activities!: Table<Activity>;
  assignments!: Table<Assignment>;
  // assignmentResponses!: Table<AssignmentResponse>; // Tidak diperlukan lagi
  formSchemas!: Table<FormSchema>;
  masterData!: Table<MasterData>;
  syncQueue!: Table<SyncQueueItem>;
  responseHistories!: Table<ResponseHistory>;
  masterSls!: Table<MasterSls>; // TABEL BARU

  constructor() {
    super('CerdasActivityDB'); // Nama database

    // VERSI 5: Menambahkan index pada status assignment
    this.version(5).stores({
      activities: '[id+user_id], user_id',
      assignments: 'id, [activity_id+user_id+status], [activity_id+user_id], user_id, status',
      formSchemas: '[activity_id+user_id], user_id',
      masterData: '[activity_id+type+version], user_id',
      syncQueue: '++id, type, status, user_id',
      responseHistories: '++id, assignment_response_id, user_id',
      masterSls: 'sls_id, id'
    });

    // VERSI 4: Menambahkan compound indexes untuk optimasi query
    this.version(4).stores({
      activities: '[id+user_id], user_id', // Compound index
      assignments: 'id, [activity_id+user_id], user_id, level_6_code_full, level_4_code_full', // Compound index
      formSchemas: '[activity_id+user_id], user_id', // Compound index
      masterData: '[activity_id+type+version], user_id',
      syncQueue: '++id, type, status, user_id',
      responseHistories: '++id, assignment_response_id, user_id',
      masterSls: 'sls_id, id'
    });

    // NAIKKAN VERSI DATABASE KE 3
    this.version(3).stores({
      activities: 'id, user_id',
      assignments: 'id, activity_id, user_id, level_6_code_full, level_4_code_full',
      // Hapus assignmentResponses
      formSchemas: 'activity_id, user_id',
      masterData: '[activity_id+type+version], user_id',
      syncQueue: '++id, type, status, user_id',
      responseHistories: '++id, assignment_response_id, user_id',
      masterSls: 'sls_id, id'
    }).upgrade(tx => {
      // Logika upgrade jika diperlukan, misal memigrasikan data.
      // Untuk sekarang, kita biarkan Dexie menghapus tabel yang tidak terdefinisi.
      return tx.table('assignmentResponses').clear();
    });

    this.version(2).stores({
      activities: 'id, user_id',
      assignments: 'id, activity_id, user_id, level_6_code_full, level_4_code_full',
      assignmentResponses: 'assignment_id, user_id',
      formSchemas: 'activity_id, user_id',
      masterData: '[activity_id+type+version], user_id',
      syncQueue: '++id, type, status, user_id',
      responseHistories: '++id, assignment_response_id, user_id',
      masterSls: 'sls_id, id'
    });

    this.version(1).stores({
      activities: 'id, user_id',
      assignments: 'id, activity_id, user_id',
      assignmentResponses: 'assignment_id, user_id',
      formSchemas: 'activity_id, user_id',
      masterData: '[activity_id+type+version], user_id',
      syncQueue: '++id, type, status, user_id',
      responseHistories: '++id, assignment_response_id, user_id',
    });
  }
}

// Opsional: Ekspor instance tunggal (singleton pattern) agar mudah diimpor di file lain
export const activityDB = new ActivityDB();