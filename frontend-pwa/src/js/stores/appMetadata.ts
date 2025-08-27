import { defineStore } from 'pinia';
import { db } from '@/js/services/database.ts'; // Impor instance DB yang sudah jadi

export const useAppMetadataStore = defineStore('appMetadata', {
  // State tidak diperlukan karena store ini berfungsi sebagai service layer
  state: () => ({}),

  actions: {
    /**
     * Menetapkan nilai metadata di IndexedDB.
     * @param key - Kunci untuk metadata.
     * @param value - Nilai yang akan disimpan.
     */
    async setMetadata(key: string, value: any): Promise<void> {
      try {
        await db.app_metadata.put({ key, value });
        console.log(`Metadata set: ${key}`);
      } catch (error) {
        console.error(`Gagal menetapkan metadata ${key}:`, error);
        throw error;
      }
    },

    /**
     * Mendapatkan nilai metadata dari IndexedDB.
     * @param key - Kunci metadata yang akan diambil.
     * @returns Nilai yang tersimpan, atau undefined jika tidak ditemukan.
     */
    async getMetadata(key: string): Promise<any | undefined> {
      try {
        const record = await db.app_metadata.get(key);
        return record?.value; // Menggunakan optional chaining untuk kode yang lebih ringkas
      } catch (error) {
        console.error(`Gagal mendapatkan metadata ${key}:`, error);
        throw error;
      }
    },

    /**
     * Menghapus nilai metadata dari IndexedDB.
     * @param key - Kunci metadata yang akan dihapus.
     */
    async deleteMetadata(key: string): Promise<void> {
      try {
        await db.app_metadata.delete(key);
        console.log(`Metadata dihapus: ${key}`);
      } catch (error) {
        console.error(`Gagal menghapus metadata ${key}:`, error);
        throw error;
      }
    },
  },
});
