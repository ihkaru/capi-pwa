
<template>
  <f7-page>
    <f7-navbar :title="assignment ? `Wawancara ${assignment.assignment_label}` : 'Memuat Wawancara...'" back-link="Kembali"></f7-navbar>

    <template v-if="!assignment || !formSchema || !assignmentResponse">
      <f7-block-title>Memuat Data...</f7-block-title>
      <f7-block>
        <p>Sedang memuat data penugasan dan formulir. Mohon tunggu.</p>
        <f7-preloader></f7-preloader>
      </f7-block>
    </template>

    <template v-else>
      <f7-block-title>Detail Penugasan</f7-block-title>
      <f7-list>
        <f7-list-item title="Label Penugasan" :after="assignment.assignment_label"></f7-list-item>
        <f7-list-item title="Status">
          <template #after>
            <f7-chip :text="assignmentResponse.status" :color="getStatusChipColor(assignmentResponse.status)" />
          </template>
        </f7-list-item>
        <f7-list-item title="Versi Data Tersimpan" :after="`v${assignmentResponse.version}`"></f7-list-item>
      </f7-list>

      <f7-block-title>Formulir Wawancara</f7-block-title>
      <f7-list>
        <template v-for="section in formSchema.sections" :key="section.id">
          <f7-list-group>
            <f7-list-item group-title :title="section.title"></f7-list-item>
            <template v-for="question in section.questions" :key="question.id">
              <template v-if="isQuestionVisible(question)">
                
                <template v-if="question.type === 'geotag'">
                  <f7-list-item :title="question.label">
                    <!-- PERBAIKAN: Menambahkan @click handler -->
                    <f7-button small outline @click="handleGeotagCapture(question.id)" :disabled="isFieldDisabled(question)">Ambil Geotag</f7-button>
                    <p v-if="formState[question.id]" class="margin-top-half">Lat: {{ formState[question.id].latitude }}, Lon: {{ formState[question.id].longitude }}</p>
                  </f7-list-item>
                </template>

                <template v-else-if="question.type === 'photo'">
                  <f7-list-item :title="question.label">
                     <!-- PERBAIKAN: Menambahkan @click handler -->
                    <f7-button small outline @click="handlePhotoCapture(question.id)" :disabled="isFieldDisabled(question)">Ambil Foto</f7-button>
                    <img v-if="formState[question.id]" :src="formState[question.id]" width="100" class="margin-top-half" />
                  </f7-list-item>
                </template>

                <template v-else-if="question.type === 'select'">
                  <f7-list-input
                    :label="question.label"
                    type="select"
                    :placeholder="question.placeholder"
                    :value="formState[question.id]"
                    @input="formState[question.id] = $event.target.value"
                    @blur="validateField(question.id)"
                    :error-message="errors[question.id]"
                    :disabled="isFieldDisabled(question)"
                  >
                    <option value="" disabled selected>-- Pilih --</option>
                    <option v-for="option in question.options" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </f7-list-input>
                </template>

                <template v-else>
                  <f7-list-input
                    :label="question.label"
                    :type="question.type"
                    :placeholder="question.placeholder"
                    :value="formState[question.id]"
                    @input="formState[question.id] = $event.target.value"
                    @blur="validateField(question.id)"
                    :error-message="errors[question.id]"
                    :disabled="isFieldDisabled(question)"
                  ></f7-list-input>
                </template>
              </template>
            </template>
          </f7-list-group>
        </template>
      </f7-list>

      <f7-block v-if="currentUserRole === 'PPL'">
        <f7-button fill large @click="submitForm" :disabled="isSubmitDisabled">Kirim Formulir</f7-button>
      </f7-block>

      <f7-block class="display-flex justify-content-space-between" v-if="currentUserRole === 'PML' && assignmentResponse.status === 'Submitted by PPL'">
        <f7-button fill large color="red" class="width-48" @click="handlePMLReject">Tolak</f7-button>
        <f7-button fill large color="green" class="width-48" @click="handlePMLApprove">Setujui</f7-button>
      </f7-block>

      <f7-block v-if="assignmentResponse.status.startsWith('Rejected')">
        <f7-block-title>Catatan Penolakan</f7-block-title>
        <f7-block strong inset>
          <p>Formulir ini ditolak. Silakan perbaiki data sesuai catatan di bawah ini.</p>
          <p v-if="rejectionNotes"><strong>Catatan:</strong> {{ rejectionNotes }}</p>
          <p v-else><strong>Catatan:</strong> Tidak ada catatan yang diberikan.</p>
        </f7-block>
      </f7-block>

    </template>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { f7 } from 'framework7-vue';
import { debounce } from 'lodash-es';
import { z, ZodError } from 'zod';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Impor tipe dari skema DB untuk type safety yang kuat
import type { Assignment, AssignmentResponse, MasterData } from '../js/services/offline/ActivityDB';
import { activityDB } from '../js/services/offline/ActivityDB';
import { useAuthStore } from '../js/stores/auth';
import { syncEngine } from '../js/services/sync/SyncEngine';

const route = useRoute();
const authStore = useAuthStore();

// Deklarasi state dengan tipe eksplisit untuk type safety
const assignmentId = ref<string | null>(null);
const assignment = ref<Assignment | null>(null);
const formSchema = ref<any | null>(null); // 'any' bisa diterima untuk skema form yang dinamis
const assignmentResponse = ref<AssignmentResponse | null>(null);
const masterData = ref<MasterData[] | null>(null);
const rejectionNotes = ref<string | null>(null);
const currentUserRole = ref<'PPL' | 'PML' | null>(null);

const formState = reactive<any>({});
const errors = reactive<any>({});

// --- FUNGSI UTAMA SAAT KOMPONEN DIMUAT ---
onMounted(async () => {
  const idFromRoute = route.params.interviewId as string;
  if (!idFromRoute) {
    f7.toast.show({ text: 'ID Penugasan tidak ditemukan.', position: 'bottom', closeTimeout: 3000 });
    return;
  }
  assignmentId.value = idFromRoute;

  // Validasi sesi pengguna sebelum memuat data
  if (!authStore.user?.id) {
    f7.toast.show({ text: 'Sesi tidak valid. Silakan login kembali.', position: 'bottom', closeTimeout: 3000 });
    // Mungkin arahkan ke halaman login
    return;
  }
  currentUserRole.value = authStore.user.role as 'PPL' | 'PML';

  try {
    // 1. Muat data utama dari database lokal
    assignment.value = await activityDB.assignments.get(assignmentId.value);
    if (!assignment.value) throw new Error('Penugasan tidak ditemukan di database lokal.');

    const fsRecord = await activityDB.formSchemas.get(assignment.value.activity_id);
    if (!fsRecord) throw new Error('Skema formulir tidak ditemukan.');
    formSchema.value = fsRecord.schema;

    masterData.value = await activityDB.masterData.where('activity_id').equals(assignment.value.activity_id).toArray();

    // 2. Muat response yang ada atau buat yang baru
    const existingResponse = await activityDB.assignmentResponses.get(assignmentId.value);
    if (existingResponse) {
      assignmentResponse.value = existingResponse;
    } else {
      // PERBAIKAN KRITIS: Menambahkan `user_id` saat membuat response baru
      const newResponse: AssignmentResponse = {
        assignment_id: assignmentId.value,
        user_id: authStore.user.id,
        status: 'Opened',
        version: 1,
        form_version_used: formSchema.value?.form_version || 1,
        responses: {},
      };
      await activityDB.assignmentResponses.put(newResponse);
      assignmentResponse.value = newResponse;
    }

    // 3. Inisialisasi formState dengan data yang ada
    Object.assign(formState, assignmentResponse.value.responses);

    // 4. Ambil catatan penolakan jika statusnya 'Rejected'
    if (assignmentResponse.value.status.startsWith('Rejected')) {
      const latestRejection = await activityDB.responseHistories
        .where('assignment_response_id').equals(assignmentId.value)
        .reverse() // Urutkan dari yang terbaru untuk mendapatkan yang terakhir
        .first();
      if (latestRejection) {
        rejectionNotes.value = latestRejection.notes;
      }
    }
  } catch (error: any) {
    console.error('Gagal memuat data wawancara:', error);
    f7.toast.show({ text: `Gagal memuat data: ${error.message}`, position: 'bottom', closeTimeout: 4000 });
  }
});

// --- AUTO-SAVE ---
const debouncedSave = debounce(async () => {
  if (assignmentResponse.value) {
    assignmentResponse.value.responses = { ...formState };
    assignmentResponse.value.version += 1; // Selalu naikkan versi setiap ada perubahan
    await activityDB.assignmentResponses.put(assignmentResponse.value);
    console.log('Auto-saved response version:', assignmentResponse.value.version);
  }
}, 1500);

watch(formState, debouncedSave, { deep: true });

// --- COMPUTED PROPERTIES UNTUK LOGIKA TAMPILAN ---
const hasErrors = computed(() => Object.keys(errors).length > 0);

const isSubmitDisabled = computed(() => {
  if (!assignmentResponse.value) return true;
  const status = assignmentResponse.value.status;
  // Nonaktifkan jika ada error atau jika sudah dikirim/disetujui
  return hasErrors.value || status === 'Submitted by PPL' || status === 'Approved by PML' || status === 'Approved by Admin';
});

// --- FUNGSI BANTUAN & LOGIKA FORMULIR ---
const findQuestionById = (id: string): any | null => {
  for (const section of formSchema.value?.sections || []) {
    const question = section.questions.find((q: any) => q.id === id);
    if (question) return question;
  }
  return null;
};

const validateField = (fieldId: string) => {
  const question = findQuestionById(fieldId);
  if (question?.validation) {
    try {
      // Asumsi validasi menggunakan Zod schema yang disimpan di formSchema
      (question.validation as z.ZodTypeAny).parse(formState[fieldId]);
      delete errors[fieldId];
    } catch (e) {
      if (e instanceof ZodError) {
        errors[fieldId] = e.errors.map(err => err.message).join(', ');
      }
    }
  }
};

const isQuestionVisible = (question: any): boolean => {
  if (!question.conditionalLogic?.showIf) return true;
  const condition = question.conditionalLogic.showIf;
  const targetFieldId = Object.keys(condition)[0];
  const requiredValue = condition[targetFieldId];
  return formState[targetFieldId] === requiredValue;
};

const isFieldDisabled = (question: any): boolean => {
  const status = assignmentResponse.value?.status;
  if (!status) return true;

  if (currentUserRole.value === 'PPL') {
    // PPL bisa mengedit jika status 'Opened' atau 'Rejected'. Selain itu, terkunci.
    return !(status === 'Opened' || status.startsWith('Rejected'));
  }

  if (currentUserRole.value === 'PML') {
    // PML hanya bisa mengedit jika status 'Submitted by PPL' dan jika field memperbolehkan
    return !(status === 'Submitted by PPL' && question.editableBy?.includes('PML'));
  }

  return true; // Kunci secara default
};

const getStatusChipColor = (status: string): string => {
  if (status.startsWith('Approved')) return 'green';
  if (status.startsWith('Submitted')) return 'orange';
  if (status.startsWith('Rejected')) return 'red';
  if (status === 'Opened') return 'blue';
  return 'gray';
};

// --- HANDLER UNTUK AKSI PENGGUNA ---
const handleGeotagCapture = async (questionId: string) => {
  try {
    f7.dialog.preloader('Mengambil Lokasi...');
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    f7.dialog.close();
    formState[questionId] = {
      latitude: position.coords.latitude.toFixed(7),
      longitude: position.coords.longitude.toFixed(7),
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
    };
  } catch (error) {
    f7.dialog.close();
    console.error('Gagal mengambil geotag:', error);
    f7.toast.show({ text: 'Gagal mengambil geotag. Pastikan GPS aktif.', position: 'bottom', closeTimeout: 3000 });
  }
};

const handlePhotoCapture = async (questionId: string) => {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    // Di mobile, webPath adalah path file sementara yang bisa ditampilkan
    if (photo.webPath) {
      formState[questionId] = photo.webPath;
    }
  } catch (error) {
    console.error('Gagal mengambil foto:', error);
    f7.toast.show({ text: 'Gagal mengambil foto.', position: 'bottom', closeTimeout: 3000 });
  }
};

const submitForm = async () => {
  // Jalankan validasi untuk semua field yang terlihat
  formSchema.value.sections.forEach((section: any) => {
    section.questions.forEach((question: any) => {
      if (isQuestionVisible(question)) {
        validateField(question.id);
      }
    });
  });

  if (hasErrors.value) {
    f7.dialog.alert('Harap perbaiki isian yang salah sebelum mengirim.');
    return;
  }

  f7.dialog.confirm('Anda yakin ingin mengirim formulir ini?', 'Konfirmasi Pengiriman', async () => {
    if (assignmentResponse.value && assignment.value) {
      assignmentResponse.value.status = 'Submitted by PPL';
      assignmentResponse.value.submitted_by_ppl_at = new Date().toISOString();
      assignmentResponse.value.version += 1;
      await activityDB.assignmentResponses.put(assignmentResponse.value);

      // Antrekan untuk sinkronisasi
      syncEngine.queueForSync('submitAssignment', {
        activityId: assignment.value.activity_id,
        assignmentResponse: assignmentResponse.value,
      });

      f7.toast.show({ text: 'Formulir berhasil dikirim!', position: 'bottom', closeTimeout: 2000, cssClass: 'success-toast' });
      f7.views.main.router.back();
    }
  });
};

// --- AKSI KHUSUS PML ---
const handlePMLApprove = async () => {
  f7.dialog.confirm('Anda yakin ingin MENYETUJUI penugasan ini?', 'Konfirmasi Persetujuan', async () => {
    if (assignmentResponse.value) {
      assignmentResponse.value.status = 'Approved by PML';
      assignmentResponse.value.reviewed_by_pml_at = new Date().toISOString();
      assignmentResponse.value.version += 1;
      await activityDB.assignmentResponses.put(assignmentResponse.value);

      syncEngine.queueForSync('approveAssignment', {
        assignmentId: assignmentResponse.value.assignment_id,
        status: assignmentResponse.value.status,
      });

      f7.toast.show({ text: 'Penugasan disetujui.', position: 'bottom', closeTimeout: 2000 });
      f7.views.main.router.back();
    }
  });
};

const handlePMLReject = async () => {
  f7.dialog.prompt('Masukkan alasan penolakan (wajib diisi):', 'Tolak Penugasan', async (notes) => {
    if (!notes || notes.trim() === '') {
      f7.toast.show({ text: 'Alasan penolakan wajib diisi.', position: 'bottom', closeTimeout: 2000 });
      return;
    }
    
    if (assignmentResponse.value && authStore.user?.id) {
      const fromStatus = assignmentResponse.value.status; // Simpan status sebelumnya
      assignmentResponse.value.status = 'Rejected by PML';
      assignmentResponse.value.reviewed_by_pml_at = new Date().toISOString();
      assignmentResponse.value.version += 1;
      
      // Simpan catatan ke tabel riwayat
      await activityDB.responseHistories.add({
        assignment_response_id: assignmentResponse.value.assignment_id,
        user_id: authStore.user.id,
        from_status: fromStatus,
        to_status: 'Rejected by PML',
        notes: notes,
        created_at: new Date().toISOString(),
      });

      await activityDB.assignmentResponses.put(assignmentResponse.value);

      syncEngine.queueForSync('rejectAssignment', {
        assignmentId: assignmentResponse.value.assignment_id,
        status: assignmentResponse.value.status,
        notes: notes,
      });

      f7.toast.show({ text: 'Penugasan ditolak.', position: 'bottom', closeTimeout: 2000 });
      f7.views.main.router.back();
    }
  });
};
</script>
