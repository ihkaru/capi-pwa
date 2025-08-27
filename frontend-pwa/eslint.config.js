// eslint.config.js
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // Konfigurasi global
  { languageOptions: { globals: globals.browser } },

  // Aturan dasar dari ESLint
  pluginJs.configs.recommended,

  // Aturan untuk TypeScript
  ...tseslint.configs.recommended,

  // Aturan untuk Vue.js
  ...pluginVue.configs['flat/essential'],

  // Konfigurasi Prettier (PALING PENTING)
  // Ini harus menjadi yang TERAKHIR dalam array agar dapat menimpa aturan lain.
  // eslint-config-prettier akan menonaktifkan semua aturan ESLint yang berpotensi konflik dengan Prettier.
  eslintConfigPrettier,
];
