<template>
  <div class="roster-block">
    <f7-block-title>{{ rosterQuestion.label }}</f7-block-title>
    <f7-list>
      <f7-list-item
        v-for="(item, index) in rosterData"
        :key="index"
        :title="item.nama_art || item.name || `(Belum diisi)`"
        link
        @click="() => openRosterItem(rosterQuestion.id, index)"
      >
        <template #after>
          <f7-button small @click.stop="removeRosterItem(rosterQuestion.id, index)" color="red" :disabled="props.disabled">Hapus</f7-button>
        </template>
      </f7-list-item>
    </f7-list>
    <f7-block>
      <f7-button fill @click="() => addRosterItem(rosterQuestion.id)" :disabled="props.disabled">Tambah {{ rosterQuestion.item_label || 'Item' }}</f7-button>
    </f7-block>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { f7 } from 'framework7-vue';
import { useFormStore } from '@/js/stores/formStore';

const props = defineProps({
  rosterQuestion: Object,
  rosterData: Array,
  assignmentId: String,
  disabled: Boolean,
});

const formStore = useFormStore();

function openRosterItem(rosterQuestionId, index) {
  f7.views.main.router.navigate(`/interview/${props.assignmentId}/roster/${rosterQuestionId}/${index}`);
}

function addRosterItem(rosterQuestionId) {
  formStore.addRosterItem(rosterQuestionId);
  const newIndex = (props.rosterData?.length || 1) - 1;
  openRosterItem(rosterQuestionId, newIndex);
}

function removeRosterItem(rosterQuestionId, index) {
  f7.dialog.confirm('Apakah Anda yakin ingin menghapus item ini?', 'Konfirmasi', () => {
    formStore.removeRosterItem(rosterQuestionId, index);
  });
}
</script>

<style>
.roster-block {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 15px;
}
</style>
