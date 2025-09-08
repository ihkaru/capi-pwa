<!-- FILE: frontend-pwa/src/components/RosterList.vue -->
<template>
  <div class="roster-block">
    <f7-block-title>{{ rosterQuestion.label }}</f7-block-title>
    <f7-list>
      <f7-list-item v-for="(item, index) in rosterData" :key="index"
        :title="item.nama_art || item.name || `(Belum diisi)`" :link="!props.disabled"
        @click="!props.disabled ? openRosterItem(index) : null">
        <template #after>
          <f7-button small @click.stop="removeRosterItem(index)" color="red"
            :disabled="props.disabled">Hapus</f7-button>
        </template>
      </f7-list-item>
    </f7-list>
    <f7-block>
      <f7-button fill @click="addRosterItem" :disabled="props.disabled">Tambah {{ rosterQuestion.item_label || 'Item'
      }}</f7-button>
    </f7-block>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { f7 } from 'framework7-vue';
import { useFormStore } from '@/js/stores/formStore';

const props = defineProps({
  rosterQuestion: Object,
  rosterData: Array, // This prop will now receive the correct Array type
  assignmentId: String,
  disabled: Boolean,
  basePath: { type: String, default: '' }, // This is the path to the roster itself (e.g., 'roster1' or 'roster1.0.nestedRoster')
  validationErrors: { type: Map, required: true },
});

const formStore = useFormStore();

function openRosterItem(index) {
  // FIX: The new base path is simply the path to this roster plus the item's index.
  const itemBasePath = `${props.basePath}.${index}`;
  const disabledParam = props.disabled ? '&disabled=true' : '';

  // The rosterQuestionId is now part of the base path, we only need the root question ID for the route param.
  const rootRosterId = props.rosterQuestion.id;

  const url = `/interview/${props.assignmentId}/roster/${rootRosterId}/${index}?basePath=${itemBasePath}${disabledParam}`;
  f7.views.main.router.navigate(url);
}

function addRosterItem() {
  // FIX: We add an item to the roster at its base path.
  formStore.addRosterItem(props.basePath);

  // The new item will be at the end of the array.
  const newIndex = (props.rosterData?.length || 1) - 1;
  openRosterItem(newIndex);
}

function removeRosterItem(index) {
  f7.dialog.confirm('Apakah Anda yakin ingin menghapus item ini?', 'Konfirmasi', () => {
    // FIX: We remove the item from the roster at its base path.
    formStore.removeRosterItem(props.basePath, index);
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