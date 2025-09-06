import { defineStore } from 'pinia';
import { f7 } from 'framework7-vue';
import syncEngine from '../services/sync/SyncEngine';

export const useSyncStore = defineStore('sync', {
  state: () => ({
    isSyncing: false,
    lastSyncError: null as string | null,
  }),
  actions: {
    async triggerDeltaSync(activityId: string) {
      this.isSyncing = true;
      this.lastSyncError = null;
      try {
        await syncEngine.performDeltaDownloadSync(activityId);
        this.showNotification('Delta sync completed successfully!', 'green');
      } catch (error: any) {
        this.lastSyncError = error.message || 'Unknown sync error';
        console.error('Error during delta sync:', error);
        this.showNotification(`Delta sync failed: ${this.lastSyncError}`, 'red');
      } finally {
        this.isSyncing = false;
      }
    },

    async triggerFullSync(activityId: string) {
      this.isSyncing = true;
      this.lastSyncError = null;
      try {
        await syncEngine.performFullDownloadSync(activityId);
        this.showNotification('Full sync completed successfully!', 'green');
      } catch (error: unknown) { // Changed to unknown
        this.lastSyncError = (error as Error).message || 'Unknown sync error'; // Cast to Error
        console.error('Error during full sync:', error);
        this.showNotification(`Full sync failed: ${this.lastSyncError}`, 'red');
      } finally {
        this.isSyncing = false;
      }
    },

    // Placeholder for showing notifications. This would typically integrate with Framework7's f7.toast or f7.dialog.
    showNotification(message: string, color: 'green' | 'red' | 'blue' = 'blue') {
      console.log(`Notification (${color}): ${message}`);
      // Example using Framework7:
      f7.toast.create({
        text: message,
        position: 'bottom',
        closeTimeout: 3000,
        cssClass: `toast-${color}`
      }).open();
    },
  },
});
