import Dexie, { Table } from 'dexie';

// Definisikan interface untuk bentuk data di dalam tabel
// Kita ekspor ini juga, karena mungkin berguna di tempat lain
export interface AppMetadata {
  key: string;
  value: any;
}

// Buat class turunan dari Dexie yang sudah di-type
class CerdasMobileDB extends Dexie {
  app_metadata!: Table<AppMetadata, string>;

  constructor() {
    super('CerdasMobileDB');
    this.version(1).stores({
      app_metadata: 'key',
    });
  }
}

// Buat dan EKSPOR satu instance (singleton) dari database Anda
export const db = new CerdasMobileDB();