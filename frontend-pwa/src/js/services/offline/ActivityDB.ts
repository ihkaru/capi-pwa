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
  type: 'submitAssignment' | 'approveAssignment' | 'rejectAssignment' | 'uploadPhoto' | 'createAssignmentWithPhoto';
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

export interface PhotoBlob {
    id: string; // UUID generated on the client
    user_id: string;
    blob: Blob; // The actual image data
}

// --- DEFINISI KELAS DATABASE (Hanya satu kali) ---

export class ActivityDB extends Dexie {
  // Deklarasi properti untuk setiap tabel
  activities!: Table<Activity>;
  assignments!: Table<Assignment>;
  assignmentResponses!: Table<AssignmentResponse>;
  formSchemas!: Table<FormSchema>;
  masterData!: Table<MasterData>;
  syncQueue!: Table<SyncQueueItem>;
  responseHistories!: Table<ResponseHistory>;
  masterSls!: Table<MasterSls>;
  photoBlobs!: Table<PhotoBlob>;

  constructor() {
    super('CerdasActivityDB'); // Nama database

    this.version(6).stores({
        activities: '[id+user_id], user_id',
        assignments: 'id, [activity_id+user_id+status], [activity_id+user_id], user_id, status',
        assignmentResponses: 'assignment_id, user_id',
        formSchemas: '[activity_id+user_id], user_id',
        masterData: '[activity_id+type+version], user_id',
        syncQueue: '++id, type, status, user_id',
        responseHistories: '++id, assignment_response_id, user_id',
        masterSls: 'sls_id, id',
        photoBlobs: 'id, user_id'
    });
  }
}

// Opsional: Ekspor instance tunggal (singleton pattern) agar mudah diimpor di file lain
export const activityDB = new ActivityDB();
