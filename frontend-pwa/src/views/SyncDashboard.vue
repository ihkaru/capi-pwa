<template>
  <f7-page>
    <f7-navbar title="Synchronization" back-link="Back"></f7-navbar>
    <f7-block-title>Manual Synchronization</f7-block-title>
    <f7-block>
      <p>Trigger manual synchronization operations for your data.</p>
      <f7-list>
        <f7-list-item>
          <f7-button fill large @click="handleDeltaSync(currentActivityId)" :disabled="syncStore.isSyncing">
            <f7-preloader v-if="syncStore.isSyncing"></f7-preloader>
            {{ syncStore.isSyncing ? 'Syncing Delta...' : 'Trigger Delta Sync' }}
          </f7-button>
        </f7-list-item>
        <f7-list-item>
          <f7-button fill large color="red" @click="handleFullSync(currentActivityId)" :disabled="syncStore.isSyncing">
            <f7-preloader v-if="syncStore.isSyncing"></f7-preloader>
            {{ syncStore.isSyncing ? 'Syncing Full...' : 'Trigger Full Sync' }}
          </f7-button>
        </f7-list-item>
      </f7-list>

      <f7-block v-if="syncStore.lastSyncError">
        <p class="text-color-red">Error: {{ syncStore.lastSyncError }}</p>
      </f7-block>
      <f7-block v-if="!syncStore.isSyncing && !syncStore.lastSyncError">
        <p class="text-color-green">Last sync status: OK</p>
      </f7-block>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { f7Page, f7Navbar, f7BlockTitle, f7Block, f7List, f7ListItem, f7Button, f7Preloader } from 'framework7-vue';
import { useSyncStore } from '../js/stores/sync'; // Adjust path if necessary

// --- Component Definition ---

const syncStore = useSyncStore();

// Placeholder for the current activity ID.
// In a real application, this would come from your app's state (e.g., active activity, route params).
const currentActivityId = ref('your-actual-activity-id'); // IMPORTANT: Replace with actual activity ID logic

const handleDeltaSync = (activityId: string) => {
  syncStore.triggerDeltaSync(activityId);
};

const handleFullSync = (activityId: string) => {
  // Always confirm full sync as it clears local data
  f7.dialog.confirm('Are you sure you want to perform a full sync? This will clear local data for this activity.', () => {
    syncStore.triggerFullSync(activityId);
  });
};
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
