<template>
  <f7-page>
    <f7-navbar :title="'Tambah Assignment Baru'">
      <f7-nav-right>
        <f7-link popup-close>Batal</f7-link>
      </f7-nav-right>
    </f7-navbar>
    <f7-block-title>Informasi Dasar</f7-block-title>
    <f7-list form>
      <f7-list-input
        label="Nama Kepala Keluarga/Responden"
        type="text"
        placeholder="Masukkan nama..."
        :value="formData.nama_krt"
        @input="formData.nama_krt = $event.target.value"
        :class="{ 'input-error': validationErrors.nama_krt }"
      >
        <div v-if="validationErrors.nama_krt" class="input-error-message">{{ validationErrors.nama_krt }}</div>
      </f7-list-input>

      <f7-list-item title="Geotag Lokasi">
        <template #after>
          <f7-button small @click="handleGeotagCapture">Ambil Lokasi</f7-button>
        </template>
      </f7-list-item>
      <f7-list-item v-if="formData.geotag">
        <div class="item-cell">
          <div class="item-row">
            <div class="item-title">Latitude:</div>
            <div class="item-after">{{ formData.geotag.latitude }}</div>
          </div>
          <div class="item-row">
            <div class="item-title">Longitude:</div>
            <div class="item-after">{{ formData.geotag.longitude }}</div>
          </div>
          <div class="item-row">
            <div class="item-title">Accuracy:</div>
            <div class="item-after">{{ formData.geotag.accuracy }} m</div>
          </div>
        </div>
      </f7-list-item>
      <div v-if="validationErrors.geotag" class="input-error-message">{{ validationErrors.geotag }}</div>

      <f7-list-item title="Foto Depan Bangunan">
        <template #after>
          <input type="file" accept="image/*" capture="environment" style="display: none;" ref="imageInput" @change="handleFileSelected" />
          <f7-button small @click="openCamera">Ambil Foto</f7-button>
        </template>
      </f7-list-item>
      <f7-list-item v-if="formData.photo">
        <img :src="formData.photo" class="photo-preview" />
      </f7-list-item>
      <div v-if="validationErrors.photo" class="input-error-message">{{ validationErrors.photo }}</div>
    </f7-list>

    <f7-block-title>Data Geografis (Prefilled)</f7-block-title>
    <f7-list>
      <f7-list-item v-for="(value, key) in prefilledGeoData" :key="key" :title="key" :after="value"></f7-list-item>
    </f7-list>

    <f7-block>
      <f7-button large fill @click="submitNewAssignment">Simpan Assignment Baru</f7-button>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { f7 } from 'framework7-vue';
import { Geolocation } from '@capacitor/geolocation';
import { useDashboardStore } from '../js/stores/dashboardStore';

const props = defineProps({
  prefilledGeoData: Object,
});

const dashboardStore = useDashboardStore();

const formData = reactive({
  nama_krt: '',
  geotag: null,
  photo: null,
});

const imageInput = ref(null);

const validationErrors = reactive({
  nama_krt: '',
  geotag: '',
  photo: '',
});

const validateForm = () => {
  let isValid = true;
  validationErrors.nama_krt = '';
  validationErrors.geotag = '';
  validationErrors.photo = '';

  if (!formData.nama_krt.trim()) {
    validationErrors.nama_krt = 'Nama Kepala Keluarga/Responden wajib diisi.';
    isValid = false;
  }
  if (!formData.geotag) {
    validationErrors.geotag = 'Geotag lokasi wajib diambil.';
    isValid = false;
  }
  if (!formData.photo) {
    validationErrors.photo = 'Foto depan bangunan wajib diambil.';
    isValid = false;
  }
  return isValid;
};

async function handleGeotagCapture() {
  try {
    f7.dialog.preloader('Mengambil Lokasi...');
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    f7.dialog.close();
    formData.geotag = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
    };
  } catch (error) {
    f7.dialog.close();
    console.error('Gagal mengambil geotag:', error);
    f7.toast.show({ text: 'Gagal mengambil geotag. Pastikan GPS aktif.', position: 'bottom', closeTimeout: 3000 });
  }
}

function openCamera() {
  imageInput.value.click();
}

async function handleFileSelected(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      formData.photo = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

async function submitNewAssignment() {
  if (!validateForm()) {
    f7.toast.show({ text: 'Mohon lengkapi semua data yang wajib diisi.', position: 'bottom', cssClass: 'error-toast' });
    return;
  }

  try {
    f7.dialog.preloader('Menyimpan assignment baru...');
    // Call a new action in dashboardStore to create and sync the new assignment
    await dashboardStore.createNewAssignment({
      nama_krt: formData.nama_krt,
      geotag: formData.geotag,
      photo: formData.photo,
      ...props.prefilledGeoData,
    });
    f7.dialog.close();
    f7.toast.show({ text: 'Assignment baru berhasil ditambahkan!', position: 'bottom', closeTimeout: 3000 });
    f7.popup.close(); // Close the modal
  } catch (error) {
    f7.dialog.close();
    console.error('Gagal menambahkan assignment baru:', error);
    f7.dialog.alert('Terjadi kesalahan saat menambahkan assignment baru. Silakan coba lagi.', 'Error');
  }
}
</script>

<style scoped>
.photo-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  margin-top: 8px;
  border-radius: 4px;
}
.input-error-message {
  color: var(--f7-color-red);
  font-size: 13px;
  margin-top: 4px;
  margin-left: 16px;
}
</style>
