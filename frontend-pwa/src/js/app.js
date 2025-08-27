// Import Vue
import { createApp } from 'vue';

// Import Framework7
import Framework7 from 'framework7/lite-bundle';

// Import Framework7-Vue Plugin
import Framework7Vue, { registerComponents } from 'framework7-vue/bundle';

// Import Framework7 Styles
import 'framework7/css/bundle';

// Import Icons and App Custom Styles
import '../css/icons.css';
import '../css/app.scss';

// Import App Component
import App from '../components/app.vue';
import { useAuthStore } from './stores/auth';
import apiClient from './services/ApiClient.ts'; // Import apiClient
import { syncEngine } from './services/sync/SyncEngine'; // Import SyncEngine

import routes from './routes'; // Import your routes

// Init Framework7-Vue Plugin
Framework7.use(Framework7Vue);

// Init App
const app = createApp(App);

// Use Pinia
import pinia from './pinia';
app.use(pinia);

// Check auth status on app start
const authStore = useAuthStore();
authStore.checkAuth();
console.log('App.js: After checkAuth(), authStore.token:', authStore.token ? 'Present' : 'Absent'); // NEW LOG

// Initialize ApiClient interceptors after Pinia and authStore are ready
apiClient.initialize();
console.log('App.js: ApiClient initialized.'); // NEW LOG

// Start the SyncEngine background process
syncEngine.startSync();
console.log('App.js: SyncEngine started.'); // NEW LOG

// Register Framework7 Vue components
registerComponents(app);

// Mount the app
app.mount('#app');