import { defineStore } from 'pinia';

// Definisikan tipe User agar lebih aman
interface User {
  id: string;
  name: string;
  email: string;
  role: 'PPL' | 'PML' | string;
  // tambahkan properti lain jika ada
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },

  actions: {
    // Aksi ini sekarang hanya mengatur state, tidak memanggil API.
    // Panggilan API akan dilakukan di komponen.
    setAuthState(token: string, user: User) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Auth Store: State and localStorage have been updated.');
    },

    // Aksi ini juga hanya membersihkan state.
    clearAuthState() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('Auth Store: State and localStorage have been cleared.');
    },

    logout() {
      // Panggil clearAuthState untuk membersihkan data sesi
      this.clearAuthState();
      // Di masa depan, bisa ditambahkan pemanggilan API ke endpoint logout di sini
      console.log('Auth Store: User logged out.');
    },

    // Aksi ini dipanggil saat aplikasi pertama kali dimuat.
    checkAuth() {
      console.log('Auth Store: checkAuth() called.');
      const token = localStorage.getItem('token');
      const userJSON = localStorage.getItem('user');

      if (token && userJSON) {
        try {
          this.token = token;
          this.user = JSON.parse(userJSON);
          console.log('Auth Store: Token and user restored from localStorage for:', this.user?.email);
        } catch (e) {
          console.error('Auth Store: Failed to parse user from localStorage. Clearing auth state.');
          this.clearAuthState();
        }
      } else {
        console.log('Auth Store: No token or user found in localStorage.');
      }
    },
  },
});