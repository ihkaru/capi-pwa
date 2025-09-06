<template>
  <f7-page no-toolbar no-navbar no-swipeback login-screen>
    <f7-login-screen-title>Cerdas CAPI</f7-login-screen-title>
    <f7-list form>
      <f7-list-input label="Email" type="email" placeholder="Your email" v-model:value="email"
        :disabled="isPasswordLoading || isGoogleLoading"></f7-list-input>

      <f7-list-input label="Password" type="password" placeholder="Your password" v-model:value="password"
        :disabled="isPasswordLoading || isGoogleLoading"></f7-list-input>
    </f7-list>
    <f7-list>
      <f7-list-button title="Sign In" @click="handlePasswordLogin" :preloader="isPasswordLoading"
        :disabled="isPasswordLoading || isGoogleLoading"></f7-list-button>
      <f7-block-footer v-if="errorMessage" class="color-red">{{ errorMessage }}</f7-block-footer>
    </f7-list>

    <f7-block-title>Atau</f7-block-title>
    <f7-block>
      <f7-button large fill social="google" @click="handleGoogleLogin" :preloader="isGoogleLoading"
        :disabled="isPasswordLoading || isGoogleLoading">
        Login dengan Google
      </f7-button>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { f7, f7ready } from 'framework7-vue';
import { useAuthStore } from "@/js/stores/authStore";
import apiClient from '@/js/services/ApiClient'; // Impor ApiClient di sini
import type { CredentialResponse } from 'google-one-tap';

const authStore = useAuthStore();

const email = ref<string>('');
const password = ref<string>('');
const isPasswordLoading = ref<boolean>(false);
const errorMessage = ref<string>('');
const isGoogleLoading = ref<boolean>(false);

const navigateToHome = () => {
  f7.views.main.router.navigate('/home/', {
    reloadCurrent: true,
    clearPreviousHistory: true,
  });
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    navigateToHome();
    return;
  }

  f7ready(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });
      window.google.accounts.id.prompt();
    } else {
      console.error("Google Identity Services SDK not loaded.");
    }
  });
});

const handleGoogleCredentialResponse = async (response: CredentialResponse) => {
  errorMessage.value = '';
  isGoogleLoading.value = true;

  try {
    // 1. Panggil ApiClient langsung dari komponen
    const apiResponse = await apiClient.loginWithGoogle(response.credential);
    // 2. Jika sukses, panggil store untuk menyimpan state
    authStore.setAuthState(apiResponse.access_token, apiResponse.user);
    // 3. Navigasi
    navigateToHome();
  } catch (error: any) {
    console.error('Login with Google failed in component:', error);
    errorMessage.value = 'Login dengan Google gagal. Silakan coba lagi.';
    isGoogleLoading.value = false;
  }
};

const handleGoogleLogin = () => {
  if (window.google) {
    window.google.accounts.id.prompt();
  } else {
    errorMessage.value = 'Layanan Google tidak tersedia saat ini.';
  }
};

const handlePasswordLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Email dan password harus diisi.';
    return;
  }
  isPasswordLoading.value = true;
  errorMessage.value = '';

  try {
    // 1. Panggil ApiClient langsung dari komponen
    const apiResponse = await apiClient.login({ email: email.value, password: password.value });
    // 2. Jika sukses, panggil store untuk menyimpan state
    authStore.setAuthState(apiResponse.token, apiResponse.user);
    // 3. Navigasi
    navigateToHome();
  } catch (error: any) {
    console.error("Password login error in component:", error);
    errorMessage.value = 'Login gagal. Periksa kembali email dan password Anda.';
    isPasswordLoading.value = false;
  }
};

// Jangan lupa untuk meng-handle logout juga di tempat lain (misal: SettingsPage)
const handleLogout = async () => {
  try {
    await apiClient.logout();
  } catch (error) {
    console.error("Logout API call failed, but clearing state anyway.");
  }
  authStore.clearAuthState();
  // Navigasi ke halaman login
  f7.views.main.router.navigate('/', { reloadCurrent: true, clearPreviousHistory: true });
}
</script>