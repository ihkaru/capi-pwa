import { defineStore } from 'pinia';
import { f7 } from 'framework7-vue';
import { useActivityStore } from './activityStore';
import { useDashboardStore } from './dashboardStore';
import { activityDB } from '../services/offline/ActivityDB';
import apiClient from '../services/ApiClient';

// Definisikan tipe User agar lebih aman
interface User {
  id: string;
  name: string;
  email: string;
  satker_id: string | null; // Add satker_id
  // role is no longer here, it's contextual to the activity
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    activeRole: null as string | null, // Role for the currently active activity
    isInitialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },

  actions: {
    setAuthState(token: string, user: User) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },

    setActiveRole(role: string | null) {
      this.activeRole = role;
      if (role) {
        localStorage.setItem('activeRole', role);
      } else {
        localStorage.removeItem('activeRole');
      }
    },

    clearAuthState() {
      this.user = null;
      this.token = null;
      this.activeRole = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeRole');
    },

    async logout(): Promise<boolean> { // Return a boolean: true if logged out, false if cancelled.
      const dashboardStore = useDashboardStore();
      const hasUnsynced = await dashboardStore.hasUnsyncedData();
      console.log('[authStore] logout action: Check for unsynced data returned:', hasUnsynced);

      const performLogout = async () => {
        f7.dialog.preloader('Logout...');
        try {
          // 1. Panggil API untuk invalidasi token di server
          await apiClient.logout();

          // 2. Bersihkan semua state di semua store
          this.clearAuthState();
          useActivityStore().reset();
          dashboardStore.reset();

          // 3. Hapus semua data dari database lokal
          console.log('[authStore] performLogout: Clearing all local database tables...');
          await activityDB.transaction('rw', activityDB.tables, async () => {
            for (const table of activityDB.tables) {
              await table.clear();
            }
          });

          console.log('[authStore] performLogout: Full logout process completed.');
        } catch (error) {
          console.error('[authStore] performLogout: Logout process failed:', error);
          // Bahkan jika gagal, tetap coba bersihkan sisi klien
          this.clearAuthState();
          useActivityStore().reset();
          dashboardStore.reset();
        } finally {
          f7.dialog.close();
        }
      };

      return new Promise((resolve) => {
        if (hasUnsynced) {
          console.log('[authStore] logout action: Unsynced data found, showing confirmation.');
          f7.dialog.confirm(
            'Anda memiliki data yang belum disinkronkan. Jika Anda melanjutkan, data tersebut akan hilang. Apakah Anda yakin ingin logout?',
            'Peringatan',
            async () => {
              console.log('[authStore] logout action: User confirmed logout.');
              // User confirmed
              await performLogout();
              resolve(true); // Resolve promise with true (logged out)
            },
            () => {
              console.log('[authStore] logout action: User cancelled logout.');
              // User cancelled
              resolve(false); // Resolve promise with false (not logged out)
            }
          );
        } else {
          console.log('[authStore] logout action: No unsynced data, proceeding directly.');
          // No unsynced data, just log out
          performLogout().then(() => resolve(true));
        }
      });
    },

    checkAuth() {
      console.log('[authStore] checkAuth: Checking auth status from localStorage.');
      const token = localStorage.getItem('token');
      const userJSON = localStorage.getItem('user');
      const activeRole = localStorage.getItem('activeRole');

      if (token && userJSON) {
        try {
          this.token = token;
          this.user = JSON.parse(userJSON);
          if (activeRole) {
            this.activeRole = activeRole;
          }
          console.log('[authStore] checkAuth: Token and user found, state is now authenticated.');
        } catch (e) {
          console.error('[authStore] checkAuth: Error parsing user JSON, clearing state.');
          this.clearAuthState();
        }
      } else {
        console.log('[authStore] checkAuth: No token or user found in localStorage.');
      }
      this.isInitialized = true;
      console.log('[authStore] checkAuth: Initialization complete.');
    },
  },
});