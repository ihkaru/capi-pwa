import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // --- PLUGINS ---
  // Daftar plugin yang digunakan, dalam kasus ini hanya Vue.js.
  plugins: [
    vue({
      // Baris ini penting untuk Framework7/Swiper agar tidak dianggap error oleh compiler Vue.
      // Anda sudah benar melakukannya, jadi kita pertahankan.
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes('swiper-'),
        },
      },
    }),
  ],

  // --- RESOLVE ---
  // Mengatur bagaimana Vite menyelesaikan path impor.
  resolve: {
    alias: {
      // Ini adalah konfigurasi alias path yang benar.
      // '@' akan menunjuk langsung ke direktori 'src'.
      // Ini akan bekerja bersamaan dengan 'paths' di tsconfig.json Anda.
      '@': path.resolve(__dirname, './src'),
    },
  },

  // --- BUILD OPTIONS ---
  // Konfigurasi untuk proses build produksi.
  build: {
    // Direktori output untuk hasil build, relatif terhadap root proyek.
    // Framework7 secara default menggunakan 'www'.
    outDir: './www',
    // Kosongkan direktori output sebelum setiap build.
    emptyOutDir: true,
  },

  // --- SERVER OPTIONS ---
  // Konfigurasi untuk development server.
  server: {
    // Membuat server dapat diakses dari jaringan lokal (berguna untuk testing di perangkat mobile).
    host: true,
  },

  // --- OPSI LAINNYA ---
  // Mengatur base URL aplikasi. Kosong ('') berarti path relatif.
  base: 'http://localhost:5173',
  // Direktori untuk file statis (seperti favicon).
  publicDir: './public',
});